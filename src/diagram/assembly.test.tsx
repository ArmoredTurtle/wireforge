import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagramSvg } from "./render";
import { createDemoProject } from "@/domain/project";

const assemblyProject = () => {
  const project = createDemoProject();
  project.layout = { ...project.layout, assemblyDrawing: true };
  return project;
};

describe("assembly drawing", () => {
  it("draws both ends, the cable jacket, overall length and wiring table", () => {
    const svg = renderToStaticMarkup(<DiagramSvg project={assemblyProject()} />);
    expect(svg).toContain("assembly drawing");
    expect(svg).toContain('class="jacket"');
    expect(svg).toContain("OVERALL LENGTH L = 250 mm");
    expect(svg).toContain("WIRING TABLE");
    expect(svg.match(/data-connector=/g)).toHaveLength(2);
    expect(svg).toContain("VIEWED FROM TOP (LATCH SIDE)");
  });

  it("marks unused pins NC", () => {
    const project = assemblyProject();
    project.wires = project.wires.filter((wire) => wire.id !== "wire-demo-4");
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(svg.match(/NC ✕/g)).toHaveLength(2);
  });

  it("reverses pin order between top and bottom views", () => {
    const pinRows = (face: "top" | "bottom") => {
      const project = assemblyProject();
      project.connectors[0] = { ...project.connectors[0], face };
      const svg = renderToStaticMarkup(<DiagramSvg project={project} />);
      const left = svg.slice(svg.indexOf('data-connector="conn-a"'));
      return [...left.matchAll(/y="([\d.]+)"[^>]*class="pin">([^<]*)</g)]
        .slice(0, 4)
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .map((match) => match[2].trim().split(/\s+/).pop());
    };
    expect(pinRows("bottom")).toEqual(["1", "2", "3", "4"]);
    expect(pinRows("top")).toEqual(["4", "3", "2", "1"]);
  });
});

describe("sleeving in drawings", () => {
  it("balloons each sleeve, dimensions partial spans and tabulates them", () => {
    const project = assemblyProject();
    project.sleeves = [
      { id: "s1", label: "S1", type: "braided-pet", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-2"], sizeMm: 6, partNumber: "PTN0.25BK" },
      { id: "s2", label: "S2", type: "heat-shrink-polyolefin", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-2"], shrinkRatio: "3:1", startMm: 10, lengthMm: 20 },
    ];
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(svg).toContain('data-sleeve="S1"');
    expect(svg).toContain("url(#sleeve-braid)");
    expect(svg.match(/data-sleeve-balloon=/g)).toHaveLength(2);
    // Only the partial sleeve gets dimensions: 10 offset, 20 long.
    expect(svg.match(/data-sleeve-dimension=/g)).toHaveLength(1);
    expect(svg).toMatch(/class="sleeve-dimension">10</);
    expect(svg).toMatch(/class="sleeve-dimension">20</);
    const row = svg.slice(svg.indexOf('data-sleeve-row="S2"'));
    for (const cell of ["Polyolefin heat shrink", "3:1", "20 @ 10", "W1 W2"])
      expect(row).toContain(`>${cell}<`);
    expect(svg).toContain(">PTN0.25BK<");
    // No English sentences on the drawing itself; hover titles aside.
    expect(svg.replace(/<title>.*?<\/title>/g, "")).not.toMatch(/from source|full length/i);
  });

  it("wraps neighbouring schematic wires once and splits around skipped wires", () => {
    const project = createDemoProject();
    project.sleeves = [
      { id: "s1", label: "S1", type: "braided-pet", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-2"] },
      { id: "s2", label: "S2", type: "spiral-wrap", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-4"] },
    ];
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(svg).not.toContain("SLEEVE S1");
    expect(svg.slice(svg.indexOf('data-sleeve="S1"'), svg.indexOf('data-sleeve="S2"')).match(/class="sleeve-wrap"/g)).toHaveLength(1);
    expect(svg.slice(svg.indexOf('data-sleeve="S2"')).match(/class="sleeve-wrap"/g)).toHaveLength(2);
    expect(svg.match(/data-sleeve-balloon=/g)).toHaveLength(2);
  });
});

describe("twisted groups in drawings", () => {
  it("draws a twist callout in the assembly drawing and labels schematic wires", () => {
    const project = assemblyProject();
    project.twists = [
      { id: "t1", label: "TP1", wireIds: ["wire-demo-4", "wire-demo-5"], layMm: 25 },
    ];
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(svg).toContain('data-twist="TP1"');
    expect(svg).toContain("TP1 TWISTED · W4+W5 · 25 mm LAY");
    project.twists.push({ id: "t2", label: "TP2", wireIds: ["wire-demo-2", "wire-demo-3"] });
    const twoGroups = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(twoGroups).toContain("TP1 TWISTED · W4+W5 · 25 mm LAY");
    expect(twoGroups).toContain("TP2 TWISTED · W2+W3<");
    project.twists.pop();
    project.layout = { ...project.layout, assemblyDrawing: false };
    const schematic = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(schematic.match(/TWISTED TP1/g)).toHaveLength(2);
    expect(schematic).toContain('data-twist="TP1"');
    expect(schematic).toContain("TP1 · 25 mm LAY");
  });
});
