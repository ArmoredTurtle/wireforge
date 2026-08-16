import type { HarnessProject, Endpoint, Wire } from "./model";
import { getDefinition } from "./connectors";

export type CableBuilderShare = {
  url?: string;
  warnings: string[];
  error?: string;
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
