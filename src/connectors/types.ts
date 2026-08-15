export type ConnectorDefinition = {
  id: string;
  manufacturer: string;
  family: string;
  name: string;
  series: string;
  housingPartNumber: string;
  pitchMm: number | null;
  pinCount: number;
  rows: number;
  allowedAwg: [number, number];
  renderer:
    | "jst-ph"
    | "jst-xh"
    | "jst-sm"
    | "micro-fit"
    | "mini-fit"
    | "dupont"
    | "ring-terminal"
    | "single"
    | "dual"
    | "terminal";
  datasheetUrl?: string;
  sourceDocument?: string;
  sourceStatus: "manufacturer-verified" | "generic";
  latch: "friction" | "positive" | "none";
  polarized: boolean;
  metadata?: Record<string, string>;
};
export type FamilySpec = Omit<
  ConnectorDefinition,
  "id" | "name" | "pinCount" | "housingPartNumber"
> & { pins: number[]; part: (pins: number) => string };
export type PinPosition = { pin: number; row: number; column: number };
export const defineFamily = (s: FamilySpec): ConnectorDefinition[] =>
  s.pins.map((pinCount) => ({
    ...s,
    id: `${s.family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${pinCount}`,
    name: `${s.family} ${pinCount}-pin`,
    pinCount,
    housingPartNumber: s.part(pinCount),
  }));
