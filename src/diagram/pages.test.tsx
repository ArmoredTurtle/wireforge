import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createBlankProject, createDemoProject } from "@/domain/project";
import { terminalEndpoint } from "@/domain/model";
import { A4, paginateDiagram, WIRES_PER_PAGE } from "./pages";
import { DiagramSvg } from "./render";

describe("A4 pagination", () => {
  it.each([0, 1, 6, 7, 12, 13, 100])("keeps all %i wires intact and ordered", (count) => {
    const project = createDemoProject();
    project.wires = Array.from({ length: count }, (_, i) => ({ ...project.wires[0], id: `wire-${i}` }));
    const pages = paginateDiagram(project);
    expect(pages).toHaveLength(Math.max(1, Math.ceil(count / WIRES_PER_PAGE)));
    expect(pages.flatMap((page) => page.wires)).toEqual(project.wires);
    for (const page of pages) {
      expect(page.wires.length).toBeLessThanOrEqual(WIRES_PER_PAGE);
      expect(page.connectors.map((c) => c.id)).toEqual(["conn-a", "conn-b"]);
      const document = new DOMParser().parseFromString(renderToStaticMarkup(<DiagramSvg project={page} />), "image/svg+xml");
      expect(document.querySelector("parsererror")).toBeNull();
      expect(document.querySelectorAll("[data-wire]")).toHaveLength(page.wires.length);
      expect(document.documentElement.getAttribute("width")).toBe("297mm");
      expect(document.documentElement.getAttribute("height")).toBe("210mm");
      expect(A4.width / A4.height).toBeCloseTo(297 / 210);
    }
  });

  it("splits crowded connector faces and includes every unwired connector", () => {
    const project = createDemoProject();
    project.connectors = Array.from({ length: 11 }, (_, i) => ({ ...project.connectors[0], id: `conn-${i}`, reference: String(i) }));
    project.wires = Array.from({ length: 5 }, (_, i) => ({
      ...project.wires[0], id: `wire-${i}`,
      source: terminalEndpoint(`conn-${2 * i}`, 1),
      destination: terminalEndpoint(`conn-${2 * i + 1}`, 1),
    }));
    const pages = paginateDiagram(project);
    expect(pages).toHaveLength(3);
    expect(pages.every((p) => p.connectors.length <= 4)).toBe(true);
    expect(new Set(pages.flatMap((p) => p.connectors.map((c) => c.id))).size).toBe(11);
    expect(pages.flatMap((p) => p.wires)).toEqual(project.wires);
    for (const page of pages) for (const wire of page.wires) {
      for (const endpoint of [wire.source, wire.destination]) if (endpoint?.type === "terminal")
        expect(page.connectors.some((c) => c.id === endpoint.connectorId)).toBe(true);
    }
  });

  it("renders an empty sheet and numbered continuation sheets", () => {
    expect(paginateDiagram(createBlankProject())).toHaveLength(1);
    const svg = renderToStaticMarkup(<DiagramSvg project={createDemoProject()} pageNumber={2} pageCount={3} />);
    expect(svg).toContain("PAGE 2 OF 3");
    expect(svg).toContain("page 2 of 3");
  });
});
