import { defineFamily } from "../types";
import type { ConnectorDefinition } from "../types";

const terminalGauges = [10, 12, 14, 16, 18, 20, 22];

type GenericTerminalSpec = {
  slug: string;
  family: string;
  series: string;
  renderer: ConnectorDefinition["renderer"];
  termination: string;
  verification: string;
};

const genericTerminalFamily = ({
  slug,
  family,
  series,
  renderer,
  termination,
  verification,
}: GenericTerminalSpec): ConnectorDefinition[] =>
  terminalGauges.map((gauge) => ({
    id: `generic-crimp-${slug}-awg-${gauge}`,
    manufacturer: "Generic",
    family,
    name: `${family} · ${gauge} AWG`,
    series,
    housingPartNumber: `${series.replace("GEN-", "")}-AWG-${gauge}`,
    pitchMm: null,
    pinCount: 1,
    rows: 1,
    allowedAwg: [gauge, gauge],
    renderer,
    sourceDocument: `Generic insulated crimp ${termination}`,
    sourceStatus: "generic",
    latch: "none",
    polarized: false,
    metadata: { gauge: String(gauge), termination, verification },
  }));

const genericTerminals: ConnectorDefinition[] = [
  ...genericTerminalFamily({
    slug: "ring-terminal",
    family: "Generic Crimp-on Ring Terminal",
    series: "GEN-RING",
    renderer: "ring-terminal",
    termination: "ring lug",
    verification: "VERIFY STUD SIZE",
  }),
  ...genericTerminalFamily({
    slug: "male-spade-terminal",
    family: "Generic Male Spade Terminal",
    series: "GEN-MSPADE",
    renderer: "male-spade-terminal",
    termination: "male spade terminal",
    verification: "VERIFY TAB WIDTH AND THICKNESS",
  }),
  ...genericTerminalFamily({
    slug: "female-spade-terminal",
    family: "Generic Female Spade Terminal",
    series: "GEN-FSPADE",
    renderer: "female-spade-terminal",
    termination: "female spade receptacle",
    verification: "VERIFY TAB WIDTH AND THICKNESS",
  }),
  ...genericTerminalFamily({
    slug: "u-terminal",
    family: "Generic U-terminal / Open Spade",
    series: "GEN-U",
    renderer: "u-terminal",
    termination: "U-terminal (open spade/fork)",
    verification: "VERIFY STUD AND FORK SIZE",
  }),
  ...genericTerminalFamily({
    slug: "ferrule",
    family: "Generic Wire Ferrule",
    series: "GEN-FERRULE",
    renderer: "ferrule",
    termination: "wire-end ferrule",
    verification: "VERIFY PIN LENGTH AND SLEEVE SIZE",
  }),
];
export const genericConnectors = [
  ...genericTerminals,
  ...defineFamily({
    manufacturer: "Generic",
    family: "Generic Single Row",
    series: "GEN-SR",
    pins: Array.from({ length: 12 }, (_, i) => i + 1),
    part: (n) => `GEN-SR-${n}`,
    pitchMm: 2.54,
    rows: 1,
    allowedAwg: [18, 30],
    renderer: "single",
    sourceStatus: "generic",
    latch: "none",
    polarized: false,
  }),
  ...defineFamily({
    manufacturer: "Generic",
    family: "Generic Dual Row",
    series: "GEN-DR",
    pins: [4, 6, 8, 10, 12, 16, 20],
    part: (n) => `GEN-DR-${n}`,
    pitchMm: 2.54,
    rows: 2,
    allowedAwg: [18, 30],
    renderer: "dual",
    sourceStatus: "generic",
    latch: "none",
    polarized: false,
  }),
  ...defineFamily({
    manufacturer: "Generic",
    family: "Screw Terminal",
    series: "GEN-ST",
    pins: [2, 3, 4, 5, 6, 7, 8],
    part: (n) => `GEN-ST-${n}`,
    pitchMm: 5.08,
    rows: 1,
    allowedAwg: [12, 28],
    renderer: "terminal",
    sourceStatus: "generic",
    latch: "none",
    polarized: true,
  }),
];
