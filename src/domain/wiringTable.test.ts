import { describe, expect, it } from "vitest";
import { buildWiringTable, colorName } from "./wiringTable";
import { createDemoProject } from "./project";

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
