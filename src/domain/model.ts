import { z } from "zod";

export const endpointSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("terminal"),
    connectorId: z.string().min(1).max(100),
    terminalId: z.string().min(1).max(100),
  }),
  z.object({
    type: z.literal("splice"),
    spliceId: z.string().min(1).max(100),
  }),
  z.object({
    type: z.literal("bare"),
    terminationId: z.string().min(1).max(100),
    label: z.string().max(200).optional(),
  }),
]);
export type Endpoint = z.infer<typeof endpointSchema>;
export type ConnectorView = "mating" | "wire-entry";
export const wireSchema = z.object({
  id: z.string().min(1).max(100),
  source: endpointSchema,
  destination: endpointSchema.optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  stripeColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  sourcePinMemory: z.number().int().positive().optional(),
  destinationPinMemory: z.number().int().positive().optional(),
  awg: z.number().int().min(10).max(40),
  lengthMm: z.number().positive(),
  toleranceMm: z.number().nonnegative().optional(),
  label: z.string().max(200),
  notes: z.string().max(2000).optional(),
});
export type Wire = z.infer<typeof wireSchema>;
export const projectSchema = z.object({
  format: z.literal("wire-harness-project"),
  version: z.literal(1),
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  updatedAt: z.iso.datetime(),
  connectors: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        definitionId: z.string().min(1).max(100),
        reference: z.string().max(32),
        view: z.enum(["mating", "wire-entry"]),
        x: z.number(),
        y: z.number(),
      }),
    )
    .max(64),
  terminals: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        connectorId: z.string().min(1).max(100),
        pin: z.number().int().positive(),
        label: z.string().max(200).optional(),
      }),
    )
    .max(4096),
  wires: z.array(wireSchema).max(4096),
  splices: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        label: z.string().max(200),
        x: z.number(),
        y: z.number(),
      }),
    )
    .max(1024),
  nets: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        label: z.string().max(200),
        wireIds: z.array(z.string().min(1).max(100)).max(4096),
      }),
    )
    .max(4096),
  layout: z.object({
    showPinNumbers: z.boolean(),
    showLabels: z.boolean(),
    showGauge: z.boolean(),
    showLength: z.boolean(),
    showConnectorNames: z.boolean(),
    showConnectorReferences: z.boolean().default(true),
    showConnectorFamily: z.boolean().default(true),
    showConnectorPartNumber: z.boolean().default(true),
    showConnectorPitch: z.boolean().default(true),
    showLatchOrientation: z.boolean().default(true),
    showView: z.boolean(),
    showNotes: z.boolean(),
  }),
});
export type HarnessProject = z.infer<typeof projectSchema>;
export const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
export const terminalEndpoint = (
  connectorId: string,
  pin: number,
): Extract<Endpoint, { type: "terminal" }> => ({
  type: "terminal",
  connectorId,
  terminalId: `${connectorId}-p${pin}`,
});
export function rebuildNets(wires: Wire[]) {
  const groups = new Map<string, Wire[]>();
  for (const w of wires) {
    const key = JSON.stringify(w.source);
    groups.set(key, [...(groups.get(key) || []), w]);
  }
  return [...groups.values()].map((group, i) => ({
    id: `net-${i + 1}`,
    label: group[0].label,
    wireIds: group.map((w) => w.id),
  }));
}
