export * from "./types";
export * from "./registry";
import type { ConnectorDefinition, PinPosition } from "./types";
export function pinMap(
  def: ConnectorDefinition,
  view: "mating" | "wire-entry",
): PinPosition[] {
  const columns = Math.ceil(def.pinCount / def.rows);
  const positions = Array.from({ length: def.pinCount }, (_, i) => ({
    pin: i + 1,
    row: def.rows === 1 ? 0 : Math.floor(i / columns),
    column: i % columns,
  }));
  return view === "mating"
    ? positions
    : positions.map((p) => ({ ...p, column: columns - 1 - p.column }));
}
