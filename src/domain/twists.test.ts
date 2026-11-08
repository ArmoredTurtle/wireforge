import { describe, expect, it } from "vitest";
import { createDemoProject } from "./project";
import { setWireTwist } from "./twists";

describe("setWireTwist", () => {
  it("starts, joins, moves and drops twisted groups", () => {
    let project = setWireTwist(createDemoProject(), "wire-demo-4", "new");
    expect(project.twists).toMatchObject([
      { label: "TP1", wireIds: ["wire-demo-4"] },
    ]);
    const tp1 = project.twists![0].id;
    project = setWireTwist(project, "wire-demo-5", tp1);
    project = setWireTwist(project, "wire-demo-2", "new");
    expect(project.twists!.map((t) => [t.label, t.wireIds])).toEqual([
      ["TP1", ["wire-demo-4", "wire-demo-5"]],
      ["TP2", ["wire-demo-2"]],
    ]);
    // Moving the only wire out of TP2 drops it.
    project = setWireTwist(project, "wire-demo-2", tp1);
    expect(project.twists!.map((t) => t.label)).toEqual(["TP1"]);
    project = setWireTwist(project, "wire-demo-2", "");
    expect(project.twists![0].wireIds).toEqual(["wire-demo-4", "wire-demo-5"]);
  });
});
