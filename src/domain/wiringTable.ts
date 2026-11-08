import { wireColors } from "@/config/wire-colors";
import { getDefinition } from "./connectors";
import {
  endFinishNames,
  sleeveSizingNames,
  sleeveTypes,
  wrapStyleNames,
} from "@/config/sleeving";
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
  sleeve: string;
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

export type SleeveSpan = NonNullable<HarnessProject["sleeves"]>[number] & {
  startMm: number;
  endMm: number;
  harnessMm: number;
};

// Sleeves that still cover at least one wire, with their covered span
// resolved against the shortest wire they hold.
export function sleeveSpans(project: HarnessProject): SleeveSpan[] {
  const wires = new Map(project.wires.map((w) => [w.id, w]));
  return (project.sleeves ?? []).flatMap((sleeve) => {
    const wireIds = sleeve.wireIds.filter((id) => wires.has(id));
    if (!wireIds.length) return [];
    const harnessMm = Math.min(...wireIds.map((id) => wires.get(id)!.lengthMm));
    const startMm = Math.min(sleeve.startMm ?? 0, harnessMm);
    const endMm = sleeve.lengthMm
      ? Math.min(startMm + sleeve.lengthMm, harnessMm)
      : harnessMm;
    return [{ ...sleeve, wireIds, startMm, endMm, harnessMm }];
  });
}

// The drawing callout leaves the part number to the cut list to stay short.
export function describeSleeve(sleeve: SleeveSpan, withPartNumber = true) {
  const type = sleeveTypes[sleeve.type];
  const full = sleeve.startMm === 0 && sleeve.endMm === sleeve.harnessMm;
  return [
    type.name,
    sleeve.tracerColor
      ? `${colorName(sleeve.color)} with ${colorName(sleeve.tracerColor)} tracer`
      : colorName(sleeve.color),
    sleeve.sizeMm ? `${sleeveSizingNames[type.sizing]} ${sleeve.sizeMm} mm` : null,
    type.shrinkRatios && sleeve.shrinkRatio ? `${sleeve.shrinkRatio} shrink` : null,
    type.wrapped && sleeve.wrapStyle ? wrapStyleNames[sleeve.wrapStyle] : null,
    type.finishEnds && sleeve.endFinish ? endFinishNames[sleeve.endFinish] : null,
    `${sleeve.endMm - sleeve.startMm} mm`,
    full ? "full length" : `${sleeve.startMm}–${sleeve.endMm} mm from source`,
    withPartNumber && sleeve.partNumber ? `P/N ${sleeve.partNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export type SleeveTableRow = {
  item: string;
  type: string;
  build: string;
  color: string;
  size: string;
  length: string;
  wires: string;
  partNumber: string;
};

const sizePrefix = { "inside-diameter": "ID", "supplied-diameter": "Ø", "tape-width": "W" };

// Cells for the sleeving table: numbers and short codes rather than
// sentences, so the table reads across a language barrier.
export function sleeveTableRow(
  sleeve: SleeveSpan,
  wireNumbers: Map<string, string>,
): SleeveTableRow {
  const type = sleeveTypes[sleeve.type];
  const full = sleeve.startMm === 0 && sleeve.endMm === sleeve.harnessMm;
  return {
    item: sleeve.label,
    type: type.name,
    build:
      [
        type.shrinkRatios ? (sleeve.shrinkRatio ?? type.shrinkRatios[0]) : null,
        type.wrapped && sleeve.wrapStyle ? wrapStyleNames[sleeve.wrapStyle] : null,
        type.finishEnds && sleeve.endFinish ? endFinishNames[sleeve.endFinish] : null,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
    color: sleeve.tracerColor
      ? `${colorName(sleeve.color)}/${colorName(sleeve.tracerColor)}`
      : colorName(sleeve.color),
    size: sleeve.sizeMm ? `${sizePrefix[type.sizing]} ${sleeve.sizeMm}` : "—",
    length: full
      ? `${sleeve.endMm - sleeve.startMm}`
      : `${sleeve.endMm - sleeve.startMm} @ ${sleeve.startMm}`,
    wires: sleeve.wireIds.map((id) => wireNumbers.get(id)).join(" "),
    partNumber: sleeve.partNumber || "—",
  };
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
  const sleeves = sleeveSpans(project);
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
      sleeve:
        sleeves
          .filter((sleeve) => sleeve.wireIds.includes(wire.id))
          .map((sleeve) => sleeve.label)
          .join("+") || "—",
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
        sleeve: "—",
        status: "nc",
      });
    }
  }
  return rows;
}
