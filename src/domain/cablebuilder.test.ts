import { describe, expect, it } from "vitest";
import { createDemoProject } from "./project";
import { createCableBuilderShareUrl } from "./cablebuilder";

describe("CableBuilder share URLs", () => {
  it("exports the supported two-ended demo harness", () => {
    // Arrange
    const project = createDemoProject();
    project.wires = project.wires.slice(0, 4);

    // Act
    const result = createCableBuilderShareUrl(project);

    // Assert
    expect(result.error).toBeUndefined();
    const url = new URL(result.url!);
    expect(url.searchParams.get("cable")).toBe("1");
    expect(url.searchParams.get("a")).toBe("XH 4-Pin");
    expect(url.searchParams.get("b")).toBe("Micro-Fit 2x2");
    expect(url.searchParams.getAll("w")).toEqual([
      "1,B1,18,Silicone,Red",
      "2,B2,18,Silicone,Black",
      "2,B3,18,Silicone,Black",
      "3,B4,24,Silicone,Yellow",
      "4,B1,24,Silicone,Blue",
    ]);
  });

  it("rejects unsupported connectors and incomplete wires", () => {
    // Arrange
    const project = createDemoProject();
    project.connectors[0].definitionId = "generic-single-row-4";

    // Act / Assert
    expect(createCableBuilderShareUrl(project).error).toContain(
      "supports JST XH",
    );

    // Arrange
    const incomplete = createDemoProject();
    incomplete.wires[0].destination = undefined;

    // Act / Assert
    expect(createCableBuilderShareUrl(incomplete).error).toContain(
      "must connect",
    );
  });
});
