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
  it("draws sleeves over the jacket, labels schematic wires and lists a cut list", () => {
    const project = assemblyProject();
    project.sleeves = [
      { id: "s1", label: "S1", type: "braided-pet", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-2"], sizeMm: 6 },
      { id: "s2", label: "S2", type: "tape-pet-fleece", color: "#18181b", wireIds: ["wire-demo-3"] },
    ];
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(svg).toContain('data-sleeve="S1"');
    expect(svg).toContain("url(#sleeve-braid)");
    expect(svg).toContain("S1 · BRAIDED PET · BLACK · ID 6 MM · 250 MM · FULL LENGTH");
    expect(svg).toContain('data-sleeve-row="S1"');
    expect(svg).toContain("url(#sleeve-tape)");
    project.layout = { ...project.layout, assemblyDrawing: false };
    const schematic = renderToStaticMarkup(<DiagramSvg project={project} />);
    // Each sleeve wraps its neighbouring wires once, with one tag.
    expect(schematic).not.toContain("SLEEVE S1");
    expect(schematic.match(/class="sleeve-wrap"/g)).toHaveLength(2);
    expect(schematic.match(/S1 · BRAIDED PET</g)).toHaveLength(1);
    expect(schematic).toContain("OVER W1, W2");
  });

  it("splits a schematic wrap around wires it does not cover", () => {
    const project = createDemoProject();
    project.sleeves = [
      { id: "s1", label: "S1", type: "spiral-wrap", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-4"] },
    ];
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);
    expect(svg.match(/class="sleeve-wrap"/g)).toHaveLength(2);
    expect(svg.match(/S1 · SPIRAL WRAP</g)).toHaveLength(1);
  });
});
