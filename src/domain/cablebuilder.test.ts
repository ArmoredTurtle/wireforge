import { describe, expect, it } from "vitest";
import { createDemoProject } from "./project";
import {
  createCableBuilderShareUrl,
  validateCableBuilderShareUrl,
} from "./cablebuilder";

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

  it("checks the generated link against the live catalog contract", async () => {
    // Arrange
    const url =
      "https://cable.isiks.tech/?cable=1&len=500&a=XH%204-Pin&b=PH%204-Pin&w=1%2CB1%2C18%2CSilicone%2CRed";
    const json = (value: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(value), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    const fetchImpl: typeof fetch = (input) => {
      const endpoint = String(input);
      if (endpoint.endsWith("/connectors"))
        return json([
          {
            name: "XH 4-Pin",
            pinCount: 4,
            active: true,
            stock: 10,
            family: { compatibleGauges: "[22,24,26,28]", doubleCrimpGauges: "[]" },
          },
          {
            name: "PH 4-Pin",
            pinCount: 4,
            active: true,
            stock: 10,
            family: { compatibleGauges: "[24,26,28]", doubleCrimpGauges: "[]" },
          },
        ]);
      if (endpoint.endsWith("/wire-options")) return json([]);
      return json({ minLengthMm: 50, maxLengthMm: 2000 });
    };

    // Act
    const result = await validateCableBuilderShareUrl(url, fetchImpl);

    // Assert
    expect(result.errors).toContain(
      "CableBuilder has no active 18 AWG Silicone wire option.",
    );
  });
});
