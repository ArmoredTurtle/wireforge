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
        type: "braided-pet",
        color: "#18181b",
        tracerColor: "#dc2626",
        wireIds: ["wire-demo-1", "wire-demo-2", "gone"],
        sizeMm: 6,
        endFinish: "hot-cut",
        partNumber: "PTN0.25BK",
      },
      {
        id: "s2",
        label: "S2",
        type: "heat-shrink-adhesive",
        color: "#dc2626",
        wireIds: ["wire-demo-1"],
        sizeMm: 9,
        shrinkRatio: "3:1",
        startMm: 200,
        lengthMm: 80,
      },
      { id: "s3", label: "S3", type: "spiral-wrap", color: "#18181b", wireIds: ["gone"] },
    ];
    return project;
  };

  it("resolves spans, clamping to the shortest covered wire, and drops empty sleeves", () => {
    const spans = sleeveSpans(sleeved());
    expect(spans.map((s) => s.label)).toEqual(["S1", "S2"]);
    expect(spans[0]).toMatchObject({ wireIds: ["wire-demo-1", "wire-demo-2"], startMm: 0, endMm: 250 });
    expect(spans[1]).toMatchObject({ startMm: 200, endMm: 250 });
  });

  it("describes each sleeve with the options its type uses", () => {
    const [braid, shrink] = sleeveSpans(sleeved());
    expect(describeSleeve(braid)).toBe(
      "Braided PET · Black with Red tracer · ID 6 mm · Hot-knife cut · 250 mm · full length · P/N PTN0.25BK",
    );
    expect(describeSleeve(shrink)).toBe(
      "Adhesive-lined heat shrink · Red · Supplied ID 9 mm · 3:1 shrink · 50 mm · 200–250 mm from source",
    );
    // Options that do not apply to the type are left out.
    expect(describeSleeve({ ...shrink, wrapStyle: "spot", endFinish: "tape" })).not.toMatch(/Spot|Taped/);
    const tape = { ...braid, type: "tape-pet-cloth" as const, wrapStyle: "half-lap" as const };
    expect(describeSleeve(tape)).toContain("Width 6 mm · Half-lap");
  });

  it("lists each wire's sleeves in the wiring table", () => {
    const rows = buildWiringTable(sleeved());
    expect(rows.map((row) => row.sleeve).slice(0, 5)).toEqual(["S1+S2", "S1", "—", "—", "—"]);
  });

  it("survives a TOML round trip, including cleared options", () => {
    const project = sleeved();
    project.sleeves![1] = { ...project.sleeves![1], wrapStyle: undefined };
    const parsed = deserializeProject(serializeProject(project)).sleeves!;
    expect(parsed[0]).toEqual(project.sleeves![0]);
    expect(parsed[1].shrinkRatio).toBe("3:1");
  });

  it("rejects sleeve types that are not in the catalog", () => {
    const project = sleeved();
    const raw = serializeProject(project).replace('type = "spiral-wrap"', 'type = "duct-tape"');
    expect(() => deserializeProject(raw)).toThrow();
  });
});

describe("twisted groups", () => {
  it("labels twisted wires and ignores groups with fewer than two live wires", () => {
    const project = createDemoProject();
    project.twists = [
      { id: "t1", label: "TP1", wireIds: ["wire-demo-4", "wire-demo-5"] },
      { id: "t2", label: "TP2", wireIds: ["wire-demo-1", "gone"] },
    ];
    const rows = buildWiringTable(project);
    expect(rows.map((row) => row.twist).slice(0, 5)).toEqual([
      "—",
      "—",
      "—",
      "TP1",
      "TP1",
    ]);
  });
});
