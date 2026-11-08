import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagramSvg } from "./render";
import { createDemoProject } from "@/domain/project";
import { buildWiringTable } from "@/domain/wiringTable";

describe("mode independent drawing", () => {
  it.each([false, true])("preserves all specialist content when assemblyDrawing is %s", (assemblyDrawing) => {
    const project = createDemoProject();
    project.layout.assemblyDrawing = assemblyDrawing;
    project.twists = [{ id: "t1", label: "TP1", wireIds: ["wire-demo-4", "wire-demo-5"], layMm: 25 }];
    project.sleeves = [{ id: "s1", label: "S1", type: "braided-pet", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-2"] }];
    project.connectors[0].face = "bottom";
    const original = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(original).toContain('data-twist="TP1"');
    expect(original).toContain('data-sleeve="S1"');
    expect(original).toContain('id="wiring-table"');
    expect(original).toContain("VIEWED FROM BOTTOM");
    const rows = buildWiringTable(project);
    for (const mode of ["standard", "advanced"] as const) {
      project.layout.mode = mode;
      expect(renderToStaticMarkup(<DiagramSvg project={project} />)).toBe(original);
      expect(buildWiringTable(project)).toEqual(rows);
    }
  });
});
