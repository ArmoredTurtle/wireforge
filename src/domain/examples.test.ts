import { describe, expect, it } from "vitest";
import { createComplexDemoProject } from "../../tests/fixtures/complexHarness";
import { createDemoProject, deserializeProject, deserializeProjectJson, serializeProject, serializeProjectJson, validateProject } from "./project";
import { projectSchema } from "./model";
import { getDefinition } from "./connectors";
import { buildWiringTable } from "./wiringTable";

describe("complex harness stress fixture", () => {
  it("provides eight catalog connectors and 28 valid routes with two intentional spare ends", () => {
    const project = createComplexDemoProject();
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(project.connectors).toHaveLength(8);
    expect(project.wires).toHaveLength(28);
    expect(new Set(project.wires.map((w) => w.id)).size).toBe(28);
    expect(validateProject(project)).toEqual([
      "SPARE SENSOR INPUT: destination unconnected", "SPARE SERVICE RETURN: destination unconnected",
    ]);
    expect(buildWiringTable(project).filter((r) => r.status === "nc").map((r) => r.from)).toEqual(["POWER-8", "SENSOR-6"]);
    for (const wire of project.wires) for (const endpoint of [wire.source, wire.destination]) {
      if (endpoint?.type !== "terminal") continue;
      const terminal = project.terminals.find((t) => t.id === endpoint.terminalId)!;
      expect(terminal.connectorId).toBe(endpoint.connectorId);
      const connector = project.connectors.find((c) => c.id === endpoint.connectorId)!;
      const definition = getDefinition(connector.definitionId)!;
      expect(terminal.pin).toBeLessThanOrEqual(definition.pinCount);
      expect(wire.awg).toBeGreaterThanOrEqual(definition.allowedAwg[0]);
      expect(wire.awg).toBeLessThanOrEqual(definition.allowedAwg[1]);
    }
  });

  it("exercises branches, stripes, loops, varied lengths and wrapped labels", () => {
    const project = createComplexDemoProject();
    expect(project.wires.filter((w) => w.stripeColor).length).toBeGreaterThan(0);
    expect(new Set(project.wires.map((w) => w.lengthMm)).size).toBeGreaterThan(4);
    expect(project.wires.some((w) => w.label.length > 30)).toBe(true);
    expect(project.wires.some((w) => w.source.type === "terminal" && w.destination?.type === "terminal" && w.source.terminalId === w.destination.terminalId)).toBe(true);
    const sources = project.wires.map((w) => JSON.stringify(w.source));
    expect(new Set(sources).size).toBeLessThan(sources.length);
  });

  it("round-trips as an ordinary project while leaving the simple default unchanged", () => {
    const project = createComplexDemoProject();
    for (const restored of [deserializeProject(serializeProject(project)), deserializeProjectJson(serializeProjectJson(project))]) {
      expect(restored.connectors).toEqual(project.connectors);
      expect(restored.wires).toEqual(project.wires);
    }
    expect(createDemoProject().connectors).toHaveLength(2);
    expect(createDemoProject().wires).toHaveLength(5);
  });
});
