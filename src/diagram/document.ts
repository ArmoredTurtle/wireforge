import type { HarnessProject } from "@/domain/model";
import { buildWiringTable, type WiringTableRow } from "@/domain/wiringTable";
import { A4, NORMAL_DIAGRAM_LAYOUT, paginateDiagram } from "./pages";
import { layoutTableRow, TABLE_HEADING_HEIGHT, wiringTableHeight } from "./wiringTable";

export const DOCUMENT_BODY_BOTTOM = A4.height - 2 * A4.margin - 52;
export const MIN_DIAGRAM_SCALE = 0.94;
const COMPACT_DIAGRAM_LAYOUT = { laneStart: 300, laneGap: 38 };
export type DocumentPage = {
  project: HarnessProject;
  showDiagram: boolean;
  tableRows: WiringTableRow[];
  tableTop: number;
  laneStart: number;
  laneGap: number;
  diagramScale: number;
};

function tableTopAfterDiagram(project: HarnessProject, laneStart: number, laneGap: number) {
  const lanesBottom = project.wires.length ? laneStart + (project.wires.length - 1) * laneGap : 256;
  const hasSamePinLoop = project.wires.some((wire) => wire.source.type === "terminal" &&
    wire.destination?.type === "terminal" && wire.source.connectorId === wire.destination.connectorId &&
    wire.source.terminalId === wire.destination.terminalId);
  // A first-lane same-pin loop extends below the lane itself.
  return Math.max(lanesBottom + 36, hasSamePinLoop ? 388 : 0);
}

/** Fit only when readable; otherwise preserve normal sizes and paginate. */
export function paginateDocument(project: HarnessProject): DocumentPage[] {
  const pages: DocumentPage[] = paginateDiagram(project).map((part) => ({
    project: part, showDiagram: true, tableRows: [], tableTop: 0, ...NORMAL_DIAGRAM_LAYOUT,
  }));
  if (project.layout.showWiringTable === false) return pages;
  const rows = buildWiringTable(project);
  if (!rows.length) return pages;

  if (pages.length === 1) {
    const page = pages[0];
    const tableHeight = wiringTableHeight(rows);
    const normalTop = tableTopAfterDiagram(project, page.laneStart, page.laneGap);
    if (normalTop + tableHeight <= DOCUMENT_BODY_BOTTOM) {
      return [{ ...page, tableTop: normalTop, tableRows: rows }];
    }
    const compactTop = tableTopAfterDiagram(project, COMPACT_DIAGRAM_LAYOUT.laneStart, COMPACT_DIAGRAM_LAYOUT.laneGap);
    // Scale around y=40, leaving the project title and table at full size.
    const scale = Math.min(1, (DOCUMENT_BODY_BOTTOM - tableHeight - 40) / (compactTop - 40));
    if (scale >= MIN_DIAGRAM_SCALE) {
      return [{ ...page, ...COMPACT_DIAGRAM_LAYOUT, diagramScale: scale,
        tableTop: 40 + (compactTop - 40) * scale, tableRows: rows }];
    }
  }

  let index = 0;
  let page = pages[pages.length - 1];
  page.tableTop = tableTopAfterDiagram(page.project, page.laneStart, page.laneGap);
  const capacity = (top: number, start: number) => {
    let bottom = top + TABLE_HEADING_HEIGHT;
    let end = start;
    while (end < rows.length && bottom + layoutTableRow(rows[end]).height <= DOCUMENT_BODY_BOTTOM) {
      bottom += layoutTableRow(rows[end]).height;
      end++;
    }
    return end;
  };
  // Avoid stranding one row below a diagram when the table continues.
  let end = capacity(page.tableTop, 0);
  if (end >= Math.min(2, rows.length)) {
    page.tableRows = rows.slice(0, end);
    index = end;
  }
  while (index < rows.length) {
    page = { project: { ...project, wires: [], connectors: [] }, showDiagram: false,
      tableRows: [], tableTop: 60, ...NORMAL_DIAGRAM_LAYOUT };
    end = capacity(page.tableTop, index);
    if (end === index) throw new Error("A wiring table row is too tall for an A4 page. Shorten its text.");
    page.tableRows = rows.slice(index, end);
    pages.push(page);
    index = end;
  }
  return pages;
}
