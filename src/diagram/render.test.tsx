import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagramSvg } from "./render";
import { createDemoProject } from "@/domain/project";
describe("SVG generation", () => {
  it("renders traceable connector faces and outlined labeled wires", () => {
    const svg = renderToStaticMarkup(
      <DiagramSvg project={createDemoProject()} />,
    );
    expect(svg).toContain("<svg");
    expect(svg).toContain("XHP-4");
    expect(svg).not.toContain("CONNECTOR A");
    expect(svg).toContain("430250400");
    expect(svg).not.toContain("CIRCUIT 1");
    expect(svg).toContain("LATCH / KEY UP");
    expect(svg).toContain("#dc2626");
    expect(svg).toContain("wire-outline");
    expect(svg.indexOf('id="wire-label-layer"')).toBeGreaterThan(
      svg.lastIndexOf("data-wire="),
    );
    expect(svg).toContain("wire-label-underline");
    expect(svg).not.toContain('class="branch"');
    expect(svg).toContain("UNCONNECTED");
    expect(svg).toContain("VIEWED FROM MATING FACE");
  });

  it("independently hides connector documentation fields", () => {
    const project = createDemoProject();
    project.layout = {
      ...project.layout,
      showConnectorReferences: false,
      showConnectorFamily: false,
      showConnectorPartNumber: false,
      showConnectorPitch: false,
      showView: false,
      showLatchOrientation: false,
    };
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);

    expect(svg).not.toContain("CONNECTOR A");
    expect(svg).not.toContain("JST XH");
    expect(svg).not.toContain("XHP-4");
    expect(svg).not.toContain("2.5 mm PITCH");
    expect(svg).not.toContain("VIEWED FROM");
    expect(svg).not.toContain("LATCH / KEY UP");
  });

  it("compacts remaining connector information toward the housing", () => {
    const project = createDemoProject();
    project.layout = {
      ...project.layout,
      showConnectorReferences: false,
      showConnectorFamily: true,
      showConnectorPartNumber: false,
      showConnectorPitch: false,
      showView: false,
      showLatchOrientation: false,
    };
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);

    expect(svg).toContain('y="113" text-anchor="middle" class="family-title"');
  });

  it("renders generic open-spade and ferrule termination drawings", () => {
    const project = createDemoProject();
    project.connectors[0].definitionId = "generic-crimp-u-terminal-awg-18";
    project.connectors[1].definitionId = "generic-crimp-ferrule-awg-18";
    const svg = renderToStaticMarkup(<DiagramSvg project={project} />);

    expect(svg).toContain("GENERIC U-TERMINAL / OPEN SPADE");
    expect(svg).toContain("VERIFY STUD AND FORK SIZE");
    expect(svg).toContain("GENERIC WIRE FERRULE");
    expect(svg).toContain("VERIFY PIN LENGTH AND SLEEVE SIZE");
    expect(svg).toContain("Q 115 172 125 158");
    expect(svg).toContain("M 876 128 V 183 H 894 V 128 Z");
    expect(svg).toContain('x="868" y="178" width="34" height="43"');
  });
});
