import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createBlankProject, createDemoProject, deserializeProjectJson, serializeProjectJson } from "@/domain/project";
import { buildWiringTable } from "@/domain/wiringTable";
import { paginateDocument, type DocumentPage } from "./document";
import { DiagramSvg } from "./render";
import { exportDiagramImages } from "./export";
import { createComplexDemoProject } from "../../tests/fixtures/complexHarness";

const renderPage = (page: DocumentPage, index = 0, count = 1) => new DOMParser().parseFromString(
  renderToStaticMarkup(<DiagramSvg {...page} pageNumber={index + 1} pageCount={count} />), "image/svg+xml",
);

describe("A4 document specification", () => {
  it("fits the unchanged simple harness and its complete table on one readable sheet", () => {
    const project = createDemoProject();
    const pages = paginateDocument(project);
    expect(pages).toHaveLength(1);
    expect(pages[0].showDiagram).toBe(true);
    expect(pages[0].tableRows).toHaveLength(5);
    expect(pages[0].diagramScale).toBeGreaterThanOrEqual(0.94);
    expect(pages[0].diagramScale).toBeLessThanOrEqual(1);
    expect(pages[0].laneGap).toBe(38);
    expect(pages[0].tableRows[0]).toMatchObject({ wire: "W1", from: "A-1", signal: "24V", to: "B-1" });
    expect(pages[0].tableRows[4]).toMatchObject({ wire: "W5", status: "unconnected" });
    const doc = renderPage(pages[0]);
    expect(doc.documentElement.textContent).toContain("PAGE 1 OF 1");
    expect(doc.querySelectorAll("[data-wire]")).toHaveLength(5);
    expect(doc.querySelectorAll(".table-heading")).toHaveLength(8);
    expect(Number(doc.querySelector("[data-wiring-table]")!.getAttribute("data-table-bottom"))).toBeLessThanOrEqual(626);
  });

  it("keeps the complex test fixture on multiple normal-size sheets", () => {
    const project = createComplexDemoProject();
    const pages = paginateDocument(project);
    expect(pages.length).toBeGreaterThan(2);
    expect(pages.filter((page) => page.showDiagram).length).toBeGreaterThan(1);
    expect(pages.filter((page) => page.tableRows.length).length).toBeGreaterThan(1);
    expect(pages.every((page) => page.diagramScale === 1 && page.laneStart === 330 && page.laneGap === 46)).toBe(true);
    expect(pages.flatMap((page) => page.tableRows)).toEqual(buildWiringTable(project));
    expect(pages.flatMap((page) => page.tableRows)).toHaveLength(30);
    expect(pages.filter((page) => page.showDiagram).flatMap((page) => page.project.wires).map((wire) => wire.id)).toEqual(project.wires.map((wire) => wire.id));
  });

  it("uses normal size and more pages when six wires exceed the fit limit", () => {
    const project = createDemoProject();
    project.wires.push({ ...project.wires[0], id: "sixth-wire" });
    const pages = paginateDocument(project);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.diagramScale === 1 && page.laneGap === 46)).toBe(true);
    expect(pages.flatMap((page) => page.tableRows)).toHaveLength(6);
  });

  it("does not force a short harness with a tall wrapped table onto one sheet", () => {
    const project = createDemoProject();
    project.wires = project.wires.map((wire) => ({ ...wire, label: "X".repeat(200) }));
    const pages = paginateDocument(project);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.diagramScale === 1)).toBe(true);
    expect(pages.flatMap((page) => page.tableRows)).toHaveLength(5);
  });

  it.each([1, 4])("leaves clearance below same-pin loops with %i wires", (count) => {
    const project = createDemoProject();
    project.wires = project.wires.slice(0, count);
    project.wires[0] = { ...project.wires[0], destination: project.wires[0].source };
    const page = paginateDocument(project)[0];
    expect(page.tableRows.length).toBeGreaterThan(0);
    expect(page.laneGap).toBe(count === 4 ? 38 : 46);
    if (page.tableRows.length) {
      const transformedLoopBottom = 40 + (369 - 40) * page.diagramScale;
      expect(page.tableTop).toBeGreaterThan(transformedLoopBottom);
    }
    expect(paginateDocument(project).flatMap((p) => p.tableRows)).toEqual(buildWiringTable(project));
  });
  it("shares the last diagram sheet when the complete smaller table fits", () => {
    const project = createDemoProject();
    project.wires = project.wires.slice(0, 1);
    const pages = paginateDocument(project);
    expect(pages).toHaveLength(1);
    expect(pages[0].showDiagram).toBe(true);
    expect(pages[0].diagramScale).toBe(1);
    expect(pages[0].laneGap).toBe(46);
    expect(pages[0].tableRows).toHaveLength(7); // one wire and six untouched cavities
    const doc = renderPage(pages[0]);
    expect(doc.querySelectorAll("[data-wire]")).toHaveLength(1);
    expect(doc.querySelectorAll("[data-table-row]")).toHaveLength(7);
  });

  it.each([6, 7, 23, 24, 100])("preserves all rows and page bounds for %i wires", (count) => {
    const project = createDemoProject();
    project.wires = Array.from({ length: count }, (_, i) => ({ ...project.wires[i % 5], id: `test-wire-${i}` }));
    const original = JSON.stringify(project);
    const pages = paginateDocument(project);
    expect(pages.flatMap((page) => page.tableRows)).toEqual(buildWiringTable(project));
    expect(JSON.stringify(project)).toBe(original);
    pages.forEach((page, index) => {
      const doc = renderPage(page, index, pages.length);
      expect(doc.querySelector("parsererror")).toBeNull();
      expect(doc.documentElement.getAttribute("width")).toBe("297mm");
      expect(doc.documentElement.getAttribute("height")).toBe("210mm");
      expect(doc.documentElement.textContent).toContain(`PAGE ${index + 1} OF ${pages.length}`);
      if (!page.tableRows.length) return;
      expect(doc.querySelectorAll(".table-heading")).toHaveLength(8);
      const table = doc.querySelector("[data-wiring-table]")!;
      expect(Number(table.getAttribute("data-table-bottom"))).toBeLessThanOrEqual(626);
      const rows = Array.from(doc.querySelectorAll("[data-table-row]"));
      expect(rows).toHaveLength(page.tableRows.length);
      for (const row of rows) {
        expect(Number(row.getAttribute("data-row-bottom"))).toBeLessThanOrEqual(626);
        expect(Number(row.getAttribute("data-row-bottom")) - Number(row.getAttribute("data-row-top"))).toBeGreaterThanOrEqual(22);
      }
    });
  });

  it("wraps maximum-length values without losing text or splitting rows", () => {
    const project = createDemoProject();
    project.wires[0].label = "X".repeat(200);
    project.wires[0].source = { type: "bare", terminationId: "bare-test", label: "Y".repeat(200) };
    const pages = paginateDocument(project);
    const rowPage = pages.find((p) => p.tableRows.some((r) => r.wire === "W1"))!;
    const doc = renderPage(rowPage);
    const row = doc.querySelector("[data-table-row]")!;
    expect(row.textContent).toContain("X".repeat(200));
    expect(row.textContent).toContain("Y".repeat(200));
    expect(row.querySelectorAll("tspan").length).toBeGreaterThan(8);
    expect(Number(row.getAttribute("data-row-bottom"))).toBeLessThanOrEqual(626);
  });

  it("hides table pages, persists the choice and enables tables for legacy projects", () => {
    const project = createDemoProject();
    project.layout.showWiringTable = false;
    const restored = deserializeProjectJson(serializeProjectJson(project));
    expect(restored.layout.showWiringTable).toBe(false);
    expect(paginateDocument(restored)).toHaveLength(1);
    expect(paginateDocument(restored)[0].tableRows).toEqual([]);
    expect(paginateDocument(restored)[0].diagramScale).toBe(1);
    expect(paginateDocument(restored)[0].laneGap).toBe(46);
    const legacy = { ...project, layout: { ...project.layout, showWiringTable: undefined } };
    expect(deserializeProjectJson(JSON.stringify(legacy)).layout.showWiringTable).toBe(true);
  });

  it("keeps blank harnesses on one sheet without an empty table", () => {
    const pages = paginateDocument(createBlankProject());
    expect(pages).toHaveLength(1);
    expect(pages[0].tableRows).toEqual([]);
  });

  it("preserves the fitted one-page layout and table in SVG export", async () => {
    const pages = paginateDocument(createDemoProject());
    const svg = renderPage(pages[0]).documentElement as unknown as SVGSVGElement;
    const result = await exportDiagramImages([svg], "svg");
    expect(result.extension).toBe("svg");
    const doc = new DOMParser().parseFromString(await result.blob.text(), "image/svg+xml");
    expect(doc.querySelectorAll("[data-wire]")).toHaveLength(5);
    expect(doc.querySelectorAll("[data-table-row]")).toHaveLength(5);
    expect(Number(doc.querySelector("[data-diagram-scale]")!.getAttribute("data-diagram-scale"))).toBeGreaterThanOrEqual(0.94);
    expect(doc.documentElement.textContent).toContain("PAGE 1 OF 1");
    expect(doc.documentElement.getAttribute("width")).toBe("297mm");
  });
  it("exports the same table rows and numbered A4 sheets in the SVG bundle", async () => {
    const pages = paginateDocument(createComplexDemoProject());
    const svgs = pages.map((page, index) => renderPage(page, index, pages.length).documentElement as unknown as SVGSVGElement);
    const result = await exportDiagramImages(svgs, "svg");
    expect(result.extension).toBe("svg.zip");
    const buffer = await result.blob.arrayBuffer();
    const view = new DataView(buffer);
    const decoder = new TextDecoder();
    const documents: Document[] = [];
    let offset = 0;
    while (view.getUint32(offset, true) === 0x04034b50) {
      const length = view.getUint32(offset + 18, true);
      const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
      documents.push(new DOMParser().parseFromString(decoder.decode(buffer.slice(start, start + length)), "image/svg+xml"));
      offset = start + length;
    }
    expect(documents).toHaveLength(pages.length);
    expect(documents[0].documentElement.textContent).toContain(`PAGE 1 OF ${pages.length}`);
    expect(documents[1].documentElement.textContent).toContain(`PAGE 2 OF ${pages.length}`);
    expect(documents.flatMap((doc) => Array.from(doc.querySelectorAll("[data-table-row]")))).toHaveLength(30);
    expect(documents[1].documentElement.getAttribute("width")).toBe("297mm");
  });
});
