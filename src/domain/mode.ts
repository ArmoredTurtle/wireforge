import type { HarnessProject } from "./model";

export type EditingMode = "standard" | "advanced";

export const advancedDisplayKeys = [
  "showConnectorReferences",
  "showConnectorFamily",
  "showConnectorPartNumber",
  "showConnectorPitch",
  "showView",
  "showLatchOrientation",
  "showWiringTable",
] as const satisfies ReadonlyArray<keyof HarnessProject["layout"]>;

export const standardDisplayKeys = [
  "showLabels", "showGauge", "showLength", "showPinNumbers",
] as const;
