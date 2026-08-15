import type { ConnectorDefinition } from "../types";

const circuits = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18];
const common = {
  manufacturer: "JST",
  series: "SM",
  pitchMm: 2.5,
  allowedAwg: [22, 28] as [number, number],
  renderer: "jst-sm" as const,
  datasheetUrl: "https://www.jst-mfg.com/product/pdf/eng/eSM.pdf",
  sourceDocument: "JST SM connector catalog eSM",
  sourceStatus: "manufacturer-verified" as const,
  latch: "positive" as const,
  polarized: true,
  metadata: {
    connection: "wire-to-wire",
    current: "3 A max",
    voltage: "250 V max",
  },
};

export const jstSmConnectors: ConnectorDefinition[] = [
  ...circuits.map((pinCount) => ({
    ...common,
    id: `jst-sm-plug-${pinCount}`,
    family: "JST SM Plug Housing",
    name: `JST SM Plug Housing ${pinCount}-pin`,
    housingPartNumber: `SMP-${String(pinCount).padStart(2, "0")}V-BC`,
    pinCount,
    rows: pinCount === 18 ? 2 : 1,
    metadata: { ...common.metadata, gender: "plug", panelMount: "panel lock" },
  })),
  ...circuits.map((pinCount) => ({
    ...common,
    id: `jst-sm-receptacle-${pinCount}`,
    family: "JST SM Receptacle Housing",
    name: `JST SM Receptacle Housing ${pinCount}-pin`,
    housingPartNumber: `SMR-${String(pinCount).padStart(2, "0")}V-B`,
    pinCount,
    rows: pinCount === 18 ? 2 : 1,
    metadata: { ...common.metadata, gender: "receptacle" },
  })),
];
