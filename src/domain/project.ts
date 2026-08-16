import {
  HarnessProject,
  Endpoint,
  projectSchema,
  rebuildNets,
  terminalEndpoint,
  uid,
  Wire,
} from "./model";
import { getDefinition } from "./connectors";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import type { TomlTableWithoutBigInt } from "smol-toml";
const connector = (
  id: string,
  definitionId: string,
  reference: string,
  x: number,
) => ({ id, definitionId, reference, view: "mating" as const, x, y: 160 });
export function createBlankProject(): HarnessProject {
  return {
    ...createDemoProject(),
    id: uid("project"),
    name: "Untitled Harness",
    updatedAt: new Date().toISOString(),
    connectors: [],
    terminals: [],
    wires: [],
    nets: [],
  };
}
const endpointPin = (endpoint: Extract<Endpoint, { type: "terminal" }>) =>
  Number(endpoint.terminalId.split("-p").pop());

export function remapWirePins(
  wires: Wire[],
  connectorId: string,
  pinCount: number,
) {
  return wires.map((wire) => {
    const next = { ...wire };
    if (wire.source.type === "terminal" && wire.source.connectorId === connectorId) {
      const pin = wire.sourcePinMemory ?? endpointPin(wire.source);
      if (pin > pinCount) {
        next.source = terminalEndpoint(connectorId, 1);
        next.sourcePinMemory = pin;
      } else if (wire.sourcePinMemory !== undefined) {
        next.source = terminalEndpoint(connectorId, pin);
        delete next.sourcePinMemory;
      }
    }
    const destinationPin =
      wire.destinationPinMemory ??
      (wire.destination?.type === "terminal" &&
      wire.destination.connectorId === connectorId
        ? endpointPin(wire.destination)
        : undefined);
    if (destinationPin !== undefined) {
      const pin = destinationPin;
      if (pin > pinCount) {
        next.destination = undefined;
        next.destinationPinMemory = pin;
      } else if (wire.destinationPinMemory !== undefined) {
        next.destination = terminalEndpoint(connectorId, pin);
        delete next.destinationPinMemory;
      }
    }
    return next;
  });
}
export function createDemoProject(): HarnessProject {
  const connectors = [
    connector("conn-a", "jst-xh-4", "A", 90),
    connector("conn-b", "micro-fit-3-0-4", "B", 790),
  ];
  const terminals = connectors.flatMap((c) =>
    Array.from({ length: getDefinition(c.definitionId)!.pinCount }, (_, i) => ({
      id: `${c.id}-p${i + 1}`,
      connectorId: c.id,
      pin: i + 1,
      label: "",
    })),
  );
  const mk = (
    id: string,
    pin: number,
    dest: number | undefined,
    color: string,
    label: string,
    awg: number,
  ): Wire => ({
    id,
    source: terminalEndpoint("conn-a", pin),
    destination: dest ? terminalEndpoint("conn-b", dest) : undefined,
    color,
    awg,
    lengthMm: 250,
    label,
    notes: "",
  });
  const wires = [
    mk("wire-demo-1", 1, 1, "#dc2626", "24V", 18),
    mk("wire-demo-2", 2, 2, "#18181b", "GND", 18),
    mk("wire-demo-3", 2, 3, "#18181b", "GND", 18),
    mk("wire-demo-4", 3, 4, "#eab308", "SIG", 24),
    mk("wire-demo-5", 4, undefined, "#2563eb", "PWM", 24),
  ];
  return {
    format: "wire-harness-project",
    version: 1,
    id: "project-demo",
    name: "Toolhead Example Harness",
    updatedAt: new Date().toISOString(),
    connectors,
    terminals,
    wires,
    splices: [],
    nets: rebuildNets(wires),
    layout: {
      showPinNumbers: true,
      showLabels: true,
      showGauge: true,
      showLength: true,
      showConnectorNames: true,
      showConnectorReferences: true,
      showConnectorFamily: true,
      showConnectorPartNumber: true,
      showConnectorPitch: true,
      showLatchOrientation: true,
      showView: true,
      showNotes: false,
    },
  };
}
export function normalizeProject(project: HarnessProject): HarnessProject {
  const legacyLayout = project.layout as Partial<HarnessProject["layout"]>;
  return {
    ...project,
    layout: {
      ...project.layout,
      showConnectorReferences: legacyLayout.showConnectorReferences ?? true,
      showConnectorFamily: legacyLayout.showConnectorFamily ?? true,
      showConnectorPartNumber: legacyLayout.showConnectorPartNumber ?? true,
      showConnectorPitch: legacyLayout.showConnectorPitch ?? true,
      showLatchOrientation: legacyLayout.showLatchOrientation ?? true,
    },
  };
}
export function serializeProject(p: HarnessProject) {
  return stringifyToml({
    ...p,
    updatedAt: new Date().toISOString(),
  } as unknown as TomlTableWithoutBigInt);
}
export function serializeProjectJson(p: HarnessProject) {
  return JSON.stringify(
    {
      ...p,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}
export function deserializeProject(raw: string) {
  return projectSchema.parse(parseToml(raw));
}
export function validateProject(p: HarnessProject) {
  const issues: string[] = [];
  const connectorIds = new Set(p.connectors.map((c) => c.id));
  const terminalIds = new Set(p.terminals.map((t) => t.id));
  for (const w of p.wires) {
    if (
      w.source.type === "terminal" &&
      (!connectorIds.has(w.source.connectorId) ||
        !terminalIds.has(w.source.terminalId))
    )
      issues.push(`${w.label || w.id}: invalid source terminal`);
    if (!w.destination)
      issues.push(`${w.label || w.id}: destination unconnected`);
    if (
      w.destination?.type === "terminal" &&
      !terminalIds.has(w.destination.terminalId)
    )
      issues.push(`${w.label || w.id}: invalid destination terminal`);
  }
  for (const c of p.connectors)
    if (!getDefinition(c.definitionId))
      issues.push(`${c.reference}: connector definition missing`);
  return issues;
}

export function suggestWireEndpoints(project: HarnessProject) {
  const candidates = project.connectors.flatMap((connector) => {
    const pinCount = getDefinition(connector.definitionId)?.pinCount ?? 0;
    return Array.from({ length: pinCount }, (_, index) =>
      terminalEndpoint(connector.id, index + 1),
    );
  });
  if (!candidates.length)
    throw new Error("A connector is required before adding a wire.");
  const key = (endpoint: { connectorId: string; terminalId: string }) =>
    `${endpoint.connectorId}:${endpoint.terminalId}`;
  const sourceUses = new Map<string, number>();
  const destinationUses = new Set<string>();
  for (const wire of project.wires) {
    if (wire.source.type === "terminal")
      sourceUses.set(
        key(wire.source),
        (sourceUses.get(key(wire.source)) ?? 0) + 1,
      );
    if (wire.destination?.type === "terminal")
      destinationUses.add(key(wire.destination));
  }
  const source =
    candidates.find((candidate) => !sourceUses.has(key(candidate))) ??
    candidates.reduce((best, candidate) =>
      (sourceUses.get(key(candidate)) ?? 0) < (sourceUses.get(key(best)) ?? 0)
        ? candidate
        : best,
    );
  const destination = candidates.find(
    (candidate) =>
      candidate.connectorId !== source.connectorId &&
      !destinationUses.has(key(candidate)),
  );
  return { source, destination };
}
