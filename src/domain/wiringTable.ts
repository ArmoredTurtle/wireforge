import { wireColors } from "@/config/wire-colors";
import { getDefinition } from "./connectors";
import { Endpoint, HarnessProject } from "./model";

export type WiringTableRow = {
  wire: string;
  from: string;
  signal: string;
  color: string | null;
  stripeColor: string | null;
  colorName: string;
  awg: number | null;
  lengthMm: number | null;
  to: string;
  twist: string;
  status: "connected" | "unconnected" | "nc";
};

export function twistGroups(project: HarnessProject) {
  const wireIds = new Set(project.wires.map((w) => w.id));
  return (project.twists ?? [])
    .map((group) => ({
      ...group,
      wireIds: group.wireIds.filter((id) => wireIds.has(id)),
    }))
    .filter((group) => group.wireIds.length >= 2);
}

export const colorName = (hex: string) =>
  wireColors.find(([, value]) => value === hex.toLowerCase())?.[0] ??
  hex.toUpperCase();

const terminalPin = (endpoint: Extract<Endpoint, { type: "terminal" }>) =>
  Number(endpoint.terminalId.split("-p").pop());

export function buildWiringTable(project: HarnessProject): WiringTableRow[] {
  const reference = (connectorId: string) =>
    project.connectors.find((c) => c.id === connectorId)?.reference ||
    connectorId;
  const describe = (endpoint: Endpoint | undefined) => {
    if (!endpoint) return "—";
    if (endpoint.type === "terminal")
      return `${reference(endpoint.connectorId)}-${terminalPin(endpoint)}`;
    if (endpoint.type === "splice")
      return (
        project.splices.find((s) => s.id === endpoint.spliceId)?.label ||
        "Splice"
      );
    return endpoint.label || "Bare end";
  };
  const usedPins = new Set<string>();
  const groups = twistGroups(project);
  const rows: WiringTableRow[] = project.wires.map((wire, index) => {
    for (const endpoint of [wire.source, wire.destination])
      if (endpoint?.type === "terminal") usedPins.add(endpoint.terminalId);
    return {
      wire: `W${index + 1}`,
      from: describe(wire.source),
      signal: wire.label,
      color: wire.color,
      stripeColor: wire.stripeColor ?? null,
      colorName: wire.stripeColor
        ? `${colorName(wire.color)}/${colorName(wire.stripeColor)}`
        : colorName(wire.color),
      awg: wire.awg,
      lengthMm: wire.lengthMm,
      to: describe(wire.destination),
      twist:
        groups.find((group) => group.wireIds.includes(wire.id))?.label ||
        "—",
      status: wire.destination ? "connected" : "unconnected",
    };
  });
  for (const connector of project.connectors) {
    const pinCount = getDefinition(connector.definitionId)?.pinCount ?? 0;
    for (let pin = 1; pin <= pinCount; pin++) {
      const terminalId = `${connector.id}-p${pin}`;
      if (usedPins.has(terminalId)) continue;
      const label = project.terminals.find((t) => t.id === terminalId)?.label;
      rows.push({
        wire: "—",
        from: `${connector.reference || connector.id}-${pin}`,
        signal: label || "",
        color: null,
        stripeColor: null,
        colorName: "—",
        awg: null,
        lengthMm: null,
        to: "—",
        twist: "—",
        status: "nc",
      });
    }
  }
  return rows;
}
