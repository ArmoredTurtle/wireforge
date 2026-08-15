import { jstConnectors } from "./catalog/jst";
import { jstSmConnectors } from "./catalog/jst-sm";
import { molexConnectors } from "./catalog/molex";
import { dupontStyleConnectors } from "./catalog/dupont";
import { genericConnectors } from "./catalog/generic";
import type { ConnectorDefinition } from "./types";
// GitHub contributors add one catalog module and register its exported array here.
const catalogs: ConnectorDefinition[][] = [
  jstConnectors,
  jstSmConnectors,
  molexConnectors,
  dupontStyleConnectors,
  genericConnectors,
];
export const connectorDefinitions = catalogs.flat();
export const getDefinition = (id: string) =>
  connectorDefinitions.find((d) => d.id === id);
export const families = [...new Set(connectorDefinitions.map((d) => d.family))];
