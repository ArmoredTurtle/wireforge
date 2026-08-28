import type { HarnessProject, Endpoint, Wire } from "./model";
import { terminalEndpoint, uid } from "./model";
import { connectorDefinitions, getDefinition } from "./connectors";
import { createBlankProject } from "./project";

export type CableBuilderShare = {
  url?: string;
  warnings: string[];
  error?: string;
};

type CableBuilderConnector = {
  name: string;
  pinCount: number;
  active: boolean;
  stock: number;
  family?: { compatibleGauges?: string; doubleCrimpGauges?: string };
};
type CableBuilderWireOption = {
  gauge: number;
  material: string;
  active: boolean;
  colorStock?: Array<{ color: string; stock: number }>;
};
type CableBuilderLaborPricing = { minLengthMm: number; maxLengthMm: number };
export type CableBuilderPreflight = { errors: string[]; warnings: string[] };
export type CableBuilderImport = CableBuilderPreflight & {
  project?: HarnessProject;
};

const COLOR_NAMES: Array<[string, string]> = [
  ["#18181b", "Black"],
  ["#ffffff", "White"],
  ["#dc2626", "Red"],
  ["#f97316", "Orange"],
  ["#eab308", "Yellow"],
  ["#16a34a", "Green"],
  ["#2563eb", "Blue"],
  ["#854d0e", "Brown"],
];

function cableBuilderConnectorName(definitionId: string) {
  const definition = getDefinition(definitionId);
  if (!definition) return undefined;
  if (definition.family === "JST XH") return `XH ${definition.pinCount}-Pin`;
  if (definition.family === "JST PH") return `PH ${definition.pinCount}-Pin`;
  if (definition.family === "Micro-Fit 3.0") {
    return definition.pinCount === 4
      ? "Micro-Fit 2x2"
      : `Micro-Fit ${definition.pinCount}-Pin`;
  }
  return undefined;
}

function pinNumber(endpoint: Endpoint) {
  if (endpoint.type !== "terminal") return undefined;
  const match = /-p(\d+)$/.exec(endpoint.terminalId);
  return match ? Number(match[1]) : undefined;
}

function orientWire(wire: Wire, connectorA: string, connectorB: string) {
  if (wire.source.type !== "terminal" || wire.destination?.type !== "terminal")
    return undefined;
  const sourcePin = pinNumber(wire.source);
  const destinationPin = pinNumber(wire.destination);
  if (!sourcePin || !destinationPin) return undefined;
  if (
    wire.source.connectorId === connectorA &&
    wire.destination.connectorId === connectorB
  )
    return [sourcePin, destinationPin] as const;
  if (
    wire.source.connectorId === connectorB &&
    wire.destination.connectorId === connectorA
  )
    return [destinationPin, sourcePin] as const;
  return undefined;
}

export function createCableBuilderShareUrl(project: HarnessProject): CableBuilderShare {
  const warnings: string[] = [];
  if (project.connectors.length !== 2)
    return {
      warnings,
      error: "CableBuilder export currently supports exactly two connectors.",
    };
  if (!project.wires.length)
    return { warnings, error: "Add at least one wire before exporting." };

  const [connectorA, connectorB] = project.connectors;
  const connectorAName = cableBuilderConnectorName(connectorA.definitionId);
  const connectorBName = cableBuilderConnectorName(connectorB.definitionId);
  if (!connectorAName || !connectorBName) {
    return {
      warnings,
      error:
        "CableBuilder export supports JST XH, JST PH, and Micro-Fit connectors currently.",
    };
  }

  const length = Math.round(project.wires[0].lengthMm);
  if (project.wires.some((wire) => Math.round(wire.lengthMm) !== length))
    warnings.push(`CableBuilder uses one overall length; exported ${length} mm.`);

  const params = new URLSearchParams({
    cable: "1",
    len: String(length),
    a: connectorAName,
    b: connectorBName,
    map: "1",
  });
  for (const wire of project.wires) {
    const pins = orientWire(wire, connectorA.id, connectorB.id);
    if (!pins)
      return {
        warnings,
        error: `Wire “${wire.label || wire.id}” must connect the two exported connectors.`,
      };
    const color = COLOR_NAMES.find(
      ([hex]) => hex.toLowerCase() === wire.color.toLowerCase(),
    )?.[1];
    if (!color) {
      warnings.push(
        `Wire “${wire.label || wire.id}” uses an unavailable CableBuilder color; exported as Black.`,
      );
    }
    params.append(
      "w",
      `${pins[0]},B${pins[1]},${wire.awg},Silicone,${color ?? "Black"}`,
    );
  }
  return {
    warnings,
    url: `https://cable.isiks.tech/?${params.toString()}`,
  };
}

const parseNumberList = (value: string | undefined) => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => typeof item === "number")
      : [];
  } catch {
    return [];
  }
};

const endpointKey = (connector: string, pin: number) => `${connector}:${pin}`;

const colorHex = new Map(COLOR_NAMES.map(([hex, name]) => [name.toLowerCase(), hex]));

function localConnectorDefinitionId(name: string) {
  return connectorDefinitions.find(
    (definition) =>
      cableBuilderConnectorName(definition.id)?.toLowerCase() === name.toLowerCase(),
  )?.id;
}

function buildImportedProject(
  params: URLSearchParams,
  definitionA: string,
  definitionB: string,
  warnings: string[],
): HarnessProject | undefined {
  const length = Number(params.get("len"));
  if (!Number.isFinite(length) || length <= 0) return undefined;
  const project = createBlankProject();
  const connectorAId = uid("conn");
  const connectorBId = uid("conn");
  project.id = uid("project");
  project.name = "CableBuilder Import";
  project.connectors = [
    { id: connectorAId, definitionId: definitionA, reference: "A", view: "mating", x: 90, y: 160 },
    { id: connectorBId, definitionId: definitionB, reference: "B", view: "mating", x: 790, y: 160 },
  ];
  project.terminals = project.connectors.flatMap((connector) =>
    Array.from({ length: getDefinition(connector.definitionId)!.pinCount }, (_, index) => ({
      id: `${connector.id}-p${index + 1}`,
      connectorId: connector.id,
      pin: index + 1,
      label: "",
    })),
  );
  project.wires = [];
  for (const [index, wireText] of params.getAll("w").entries()) {
    const fields = wireText.split(",");
    const sourcePin = Number(fields[0]);
    const destination = /^B(\d+)$/i.exec(fields[1] || "");
    const gauge = Number(fields[2]);
    const material = fields[3] || "";
    const colorName = fields.slice(4).join(",");
    if (
      fields.length < 5 ||
      !Number.isInteger(sourcePin) ||
      !destination ||
      !Number.isInteger(gauge) ||
      gauge < 10 ||
      gauge > 40
    ) {
      warnings.push(`CableBuilder wire ${index + 1} could not be imported.`);
      continue;
    }
    const color = colorHex.get(colorName.toLowerCase());
    if (!color) {
      warnings.push(`CableBuilder color ${colorName} is not available in WireForge; imported as Black.`);
    }
    project.wires.push({
      id: uid("wire"),
      source: terminalEndpoint(connectorAId, sourcePin),
      destination: terminalEndpoint(connectorBId, Number(destination[1])),
      color: color || "#18181b",
      awg: gauge,
      lengthMm: length,
      label: `Wire ${index + 1}`,
      notes: material ? `CableBuilder material: ${material}` : "",
    });
  }
  if (!project.wires.length) return undefined;
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

export async function importCableBuilderShareUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CableBuilderImport> {
  const preflight = await validateCableBuilderShareUrl(url, fetchImpl);
  if (preflight.errors.length) return preflight;
  try {
    const params = new URL(url).searchParams;
    const [connectorsResponse] = await Promise.all([
      fetchImpl("https://cable.isiks.tech/api/connectors"),
    ]);
    const connectors = (await connectorsResponse.json()) as CableBuilderConnector[];
    const connectorByName = new Map(
      connectors.map((connector) => [connector.name.toLowerCase(), connector]),
    );
    const connectorA = connectorByName.get((params.get("a") || "").toLowerCase());
    const connectorB = connectorByName.get((params.get("b") || "").toLowerCase());
    if (!connectorA || !connectorB) return preflight;
    const definitionA = localConnectorDefinitionId(connectorA.name);
    const definitionB = localConnectorDefinitionId(connectorB.name);
    if (!definitionA || !definitionB) {
      return {
        ...preflight,
        errors: [
          ...preflight.errors,
          "WireForge does not have compatible local definitions for both CableBuilder connectors.",
        ],
      };
    }
    const project = buildImportedProject(
      params,
      definitionA,
      definitionB,
      preflight.warnings,
    );
    if (!project) {
      return {
        ...preflight,
        errors: [...preflight.errors, "CableBuilder URL contains no importable wires."],
      };
    }
    return { ...preflight, project };
  } catch (error) {
    return {
      ...preflight,
      errors: [
        ...preflight.errors,
        `Could not import CableBuilder URL: ${error instanceof Error ? error.message : "invalid URL"}`,
      ],
    };
  }
}

export async function validateCableBuilderShareUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CableBuilderPreflight> {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    const [connectorsResponse, wireOptionsResponse, laborResponse] = await Promise.all([
      fetchImpl("https://cable.isiks.tech/api/connectors"),
      fetchImpl("https://cable.isiks.tech/api/wire-options"),
      fetchImpl("https://cable.isiks.tech/api/labor-pricing"),
    ]);
    if (!connectorsResponse.ok || !wireOptionsResponse.ok || !laborResponse.ok)
      throw new Error("CableBuilder catalog request failed.");
    const connectors = (await connectorsResponse.json()) as CableBuilderConnector[];
    const wireOptions = (await wireOptionsResponse.json()) as CableBuilderWireOption[];
    const labor = (await laborResponse.json()) as CableBuilderLaborPricing;
    const params = new URL(url).searchParams;
    const connectorByName = new Map(
      connectors.map((connector) => [connector.name.toLowerCase(), connector]),
    );
    const connectorA = connectorByName.get((params.get("a") || "").toLowerCase());
    const connectorB = connectorByName.get((params.get("b") || "").toLowerCase());
    if (!connectorA) errors.push(`CableBuilder connector A “${params.get("a") || ""}” is not in the live catalog.`);
    if (!connectorB) errors.push(`CableBuilder connector B “${params.get("b") || ""}” is not in the live catalog.`);
    if (!connectorA || !connectorB) return { errors, warnings };
    for (const [label, connector] of [["A", connectorA], ["B", connectorB]] as const) {
      if (!connector.active) errors.push(`CableBuilder connector ${label} is inactive.`);
      else if (connector.stock <= 0) warnings.push(`CableBuilder connector ${label} is out of stock.`);
    }
    const length = Number(params.get("len"));
    if (Number.isFinite(length) && (length < labor.minLengthMm || length > labor.maxLengthMm))
      warnings.push(`CableBuilder will clamp the ${length} mm length to ${labor.minLengthMm}–${labor.maxLengthMm} mm.`);

    const sourceUses = new Map<string, number[]>();
    const destinationUses = new Map<string, number[]>();
    for (const wireText of params.getAll("w")) {
      const fields = wireText.split(",");
      if (fields.length < 5) {
        errors.push(`CableBuilder wire “${wireText}” has invalid syntax.`);
        continue;
      }
      const sourcePin = Number(fields[0]);
      const destination = /^B(\d+)$/i.exec(fields[1]);
      const gauge = Number(fields[2]);
      const material = fields[3];
      const color = fields.slice(4).join(",");
      if (!Number.isInteger(sourcePin) || sourcePin < 1 || sourcePin > connectorA.pinCount)
        errors.push(`CableBuilder source pin ${fields[0]} does not exist on connector A.`);
      const destinationPin = destination ? Number(destination[1]) : 0;
      if (!destination || destinationPin < 1 || destinationPin > connectorB.pinCount)
        errors.push(`CableBuilder destination ${fields[1]} does not exist on connector B.`);
      if (!Number.isInteger(gauge)) errors.push(`CableBuilder gauge “${fields[2]}” is invalid.`);
      const option = wireOptions.find(
        (candidate) => candidate.active && candidate.gauge === gauge && candidate.material === material,
      );
      if (!option) errors.push(`CableBuilder has no active ${gauge} AWG ${material} wire option.`);
      else if (!option.colorStock?.some((stock) => stock.color.toLowerCase() === color.toLowerCase() && stock.stock > 0))
        warnings.push(`CableBuilder has no current stock for ${gauge} AWG ${material} ${color}.`);
      if (Number.isInteger(sourcePin) && sourcePin > 0)
        sourceUses.set(endpointKey("A", sourcePin), [...(sourceUses.get(endpointKey("A", sourcePin)) || []), gauge]);
      if (destinationPin > 0)
        destinationUses.set(endpointKey("B", destinationPin), [...(destinationUses.get(endpointKey("B", destinationPin)) || []), gauge]);
    }
    for (const [label, uses, connector] of [["A", sourceUses, connectorA], ["B", destinationUses, connectorB]] as const) {
      const doubleCrimpGauges = parseNumberList(connector.family?.doubleCrimpGauges);
      for (const [pin, gauges] of uses) {
        if (gauges.length > 2) errors.push(`CableBuilder pin ${pin.replace(`${label}:`, "")} on connector ${label} has more than two wires.`);
        if (gauges.length === 2 && gauges.some((gauge) => !doubleCrimpGauges.includes(gauge)))
          errors.push(`CableBuilder connector ${label} does not allow double-crimping pin ${pin.replace(`${label}:`, "")} at ${gauges.join("/")} AWG.`);
      }
    }
    for (const [label, connector, uses] of [["A", connectorA, sourceUses], ["B", connectorB, destinationUses]] as const) {
      const compatibleGauges = parseNumberList(connector.family?.compatibleGauges);
      for (const gauges of uses.values())
        for (const gauge of gauges)
          if (compatibleGauges.length && !compatibleGauges.includes(gauge))
            errors.push(`CableBuilder connector ${label} does not support ${gauge} AWG.`);
    }
  } catch (error) {
    errors.push(`Could not validate against CableBuilder’s live API: ${error instanceof Error ? error.message : "request failed"}`);
  }
  return { errors, warnings };
}
