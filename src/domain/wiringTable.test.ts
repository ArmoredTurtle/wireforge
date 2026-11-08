import { describe, expect, it } from "vitest";
import {
  buildWiringTable,
  colorName,
  describeSleeve,
  sleeveSpans,
} from "./wiringTable";
import {
  createDemoProject,
  deserializeProject,
  serializeProject,
} from "./project";

describe("wiring table", () => {
  it("lists every wire with its endpoints, color and status", () => {
    const rows = buildWiringTable(createDemoProject());
    expect(rows[0]).toMatchObject({
      wire: "W1",
      from: "A-1",
      signal: "24V",
      colorName: "Red",
      awg: 18,
      lengthMm: 250,
      to: "B-1",
      status: "connected",
    });
    expect(rows[4]).toMatchObject({ wire: "W5", to: "—", status: "unconnected" });
  });

  it("adds NC rows for pins no wire touches", () => {
    const rows = buildWiringTable(createDemoProject());
    expect(rows.filter((row) => row.status === "nc").map((row) => row.from)).toEqual([]);
    const project = createDemoProject();
    project.wires = project.wires.filter((wire) => wire.id !== "wire-demo-4");
    const nc = buildWiringTable(project).filter((row) => row.status === "nc");
    expect(nc.map((row) => row.from)).toEqual(["A-3", "B-4"]);
  });

  it("names catalog colors and falls back to hex", () => {
    expect(colorName("#FFFFFF")).toBe("White");
    expect(colorName("#123456")).toBe("#123456");
  });
});

describe("sleeving", () => {
  const sleeved = () => {
    const project = createDemoProject();
    project.sleeves = [
      {
        id: "s1",
        label: "S1",
        material: "braided-pet",
        color: "#18181b",
        wireIds: ["wire-demo-1", "wire-demo-2", "gone"],
        diameterMm: 6,
      },
      {
        id: "s2",
        label: "S2",
        material: "heat-shrink",
        color: "#dc2626",
        wireIds: ["wire-demo-1"],
        startMm: 200,
        lengthMm: 80,
      },
      { id: "s3", label: "S3", material: "spiral-wrap", color: "#18181b", wireIds: ["gone"] },
    ];
    return project;
  };

  it("resolves spans, clamping to the shortest covered wire, and drops empty sleeves", () => {
    const spans = sleeveSpans(sleeved());
    expect(spans.map((s) => s.label)).toEqual(["S1", "S2"]);
    expect(spans[0]).toMatchObject({ wireIds: ["wire-demo-1", "wire-demo-2"], startMm: 0, endMm: 250 });
    expect(spans[1]).toMatchObject({ startMm: 200, endMm: 250 });
    expect(describeSleeve(spans[0])).toBe("Braided PET · Black · Ø6 mm · 250 mm · full length");
    expect(describeSleeve(spans[1])).toBe("Heat shrink · Red · 50 mm · 200–250 mm from source");
  });

  it("lists each wire's sleeves in the wiring table", () => {
    const rows = buildWiringTable(sleeved());
    expect(rows.map((row) => row.sleeve).slice(0, 5)).toEqual(["S1+S2", "S1", "—", "—", "—"]);
  });

  it("survives a TOML round trip", () => {
    const project = sleeved();
    expect(deserializeProject(serializeProject(project)).sleeves).toEqual(project.sleeves);
  });
});
