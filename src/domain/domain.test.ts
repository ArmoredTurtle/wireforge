import { describe, expect, it } from "vitest";
import { connectorDefinitions, getDefinition, pinMap } from "./connectors";
import {
  createDemoProject,
  deserializeProject,
  serializeProject,
  serializeProjectJson,
  remapWirePins,
  suggestWireEndpoints,
  validateProject,
} from "./project";
import { projectSchema, rebuildNets, terminalEndpoint } from "./model";
describe("connector library", () => {
  it("loads data-driven variants with manufacturer traceability", () => {
    expect(connectorDefinitions.length).toBeGreaterThan(70);
    const ph = getDefinition("jst-ph-4")!;
    expect(ph.pinCount).toBe(4);
    expect(ph.housingPartNumber).toBe("PHR-4");
    expect(ph.sourceStatus).toBe("manufacturer-verified");
    expect(ph.datasheetUrl).toContain("jst-mfg.com");
    expect(
      getDefinition("dupont-style-2-54-mm-single-row-4")?.sourceStatus,
    ).toBe("generic");
    expect(getDefinition("amphenol-mini-pv-2-54-mm-4")?.datasheetUrl).toContain(
      "amphenol-cs.com",
    );
    const ring = getDefinition("generic-crimp-ring-terminal-awg-18")!;
    expect(ring.renderer).toBe("ring-terminal");
    expect(ring.allowedAwg).toEqual([18, 18]);
    expect(ring.pinCount).toBe(1);
    const smPlug = getDefinition("jst-sm-plug-4")!;
    const smReceptacle = getDefinition("jst-sm-receptacle-4")!;
    expect(smPlug.housingPartNumber).toBe("SMP-04V-BC");
    expect(smReceptacle.housingPartNumber).toBe("SMR-04V-B");
    expect(smPlug.allowedAwg).toEqual([22, 28]);
    expect(getDefinition("jst-sm-plug-18")?.rows).toBe(2);
  });
  it("mirrors cavity placement without changing electrical pin identity", () => {
    const d = getDefinition("micro-fit-3-0-4")!;
    const mating = pinMap(d, "mating"),
      wire = pinMap(d, "wire-entry");
    expect(mating.map((x) => x.pin)).toEqual(wire.map((x) => x.pin));
    expect(mating[0].column).not.toBe(wire[0].column);
  });
});
describe("harness domain", () => {
  it("remembers out-of-range pins while a connector is temporarily smaller", () => {
    // Arrange
    const project = createDemoProject();

    // Act
    const reduced = remapWirePins(project.wires, "conn-a", 2);
    const restored = remapWirePins(reduced, "conn-a", 4);
    const reducedDestination = remapWirePins(project.wires, "conn-b", 2);
    const restoredDestination = remapWirePins(reducedDestination, "conn-b", 4);

    // Assert
    expect(reduced.find((wire) => wire.id === "wire-demo-4")).toMatchObject({
      source: terminalEndpoint("conn-a", 1),
      sourcePinMemory: 3,
    });
    expect(restored.find((wire) => wire.id === "wire-demo-4")).toMatchObject({
      source: terminalEndpoint("conn-a", 3),
    });
    expect(restored.find((wire) => wire.id === "wire-demo-4")).not.toHaveProperty(
      "sourcePinMemory",
    );
    expect(
      reducedDestination.find((wire) => wire.id === "wire-demo-4"),
    ).toMatchObject({ destination: undefined, destinationPinMemory: 4 });
    expect(
      restoredDestination.find((wire) => wire.id === "wire-demo-4"),
    ).toMatchObject({ destination: terminalEndpoint("conn-b", 4) });
  });

  it("serializes a project as readable JSON", () => {
    // Arrange
    const project = createDemoProject();

    // Act
    const serialized = serializeProjectJson(project);
    const parsed = JSON.parse(serialized);

    // Assert
    expect(parsed.name).toBe(project.name);
    expect(parsed.connectors).toEqual(project.connectors);
    expect(parsed.wires).toEqual(project.wires);
    expect(parsed.updatedAt).toMatch(/T/);
    expect(serialized).toContain("\n  \"name\"");
  });

  it("uses stable IDs for the server-rendered demo project", () => {
    // Arrange / Act
    const project = createDemoProject();
    const secondProject = createDemoProject();

    // Assert
    expect(project.id).toBe("project-demo");
    expect(project.wires.map((wire) => wire.id)).toEqual([
      "wire-demo-1",
      "wire-demo-2",
      "wire-demo-3",
      "wire-demo-4",
      "wire-demo-5",
    ]);
    expect(secondProject).toEqual(project);
  });

  it("allocates new wires to the next unused source terminal", () => {
    const project = createDemoProject();
    const suggestion = suggestWireEndpoints(project);
    expect(suggestion.source).toMatchObject({
      connectorId: "conn-b",
      terminalId: "conn-b-p1",
    });
    expect(suggestion.destination).toMatchObject({
      connectorId: "conn-a",
      terminalId: "conn-a-p1",
    });
  });
  it("creates valid wires and terminals", () => {
    const p = createDemoProject();
    expect(projectSchema.safeParse(p).success).toBe(true);
    expect(p.terminals).toHaveLength(8);
  });
  it("represents multiple wires from one terminal as a net", () => {
    const p = createDemoProject();
    expect(
      p.wires.filter(
        (w) =>
          w.source.type === "terminal" && w.source.terminalId === "conn-a-p2",
      ),
    ).toHaveLength(2);
    expect(
      rebuildNets(p.wires).find((n) => n.label === "GND")?.wireIds,
    ).toHaveLength(2);
  });
  it("supports splice endpoints", () => {
    const p = createDemoProject();
    p.splices.push({ id: "s1", label: "branch", x: 1, y: 1 });
    p.wires[0].destination = { type: "splice", spliceId: "s1" };
    expect(projectSchema.safeParse(p).success).toBe(true);
  });
  it("round trips TOML project files", () => {
    const p = createDemoProject();
    const toml = serializeProject(p);
    expect(toml).toContain('format = "wire-harness-project"');
    expect(deserializeProject(toml).name).toBe(p.name);
  });
  it("rejects malformed import", () => {
    expect(() => deserializeProject('format = ["broken"')).toThrow();
  });
  it("validates bad pin references", () => {
    const p = createDemoProject();
    p.wires[0].source = terminalEndpoint("conn-a", 99);
    expect(validateProject(p)[0]).toContain("invalid source");
  });
  it("rejects invalid colors and lengths", () => {
    const p = createDemoProject();
    p.wires[0].color = "red";
    p.wires[0].lengthMm = 0;
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
});
