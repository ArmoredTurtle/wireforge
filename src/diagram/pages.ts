import type { HarnessProject, Wire } from "@/domain/model";

// A4 landscape, with a roughly 13.5 mm safe margin around the drawing.
export const A4 = { width: 1100, height: (1100 * 210) / 297, margin: 50 };
export const WIRES_PER_PAGE = 6;
export const NORMAL_DIAGRAM_LAYOUT = { laneStart: 330, laneGap: 46, diagramScale: 1 };
const CONNECTORS_PER_PAGE = 4;

/** Keep complete wire routes together and repeat their connector faces per sheet. */
export function paginateDiagram(project: HarnessProject): HarnessProject[] {
  const pages: HarnessProject[] = [];
  const shown = new Set<string>();
  let wires: Wire[] = [];
  let connectors = new Set<string>();
  const flush = () => {
    pages.push({
      ...project,
      wires,
      connectors: project.connectors.filter((c) => connectors.has(c.id)),
    });
    connectors.forEach((id) => shown.add(id));
    wires = [];
    connectors = new Set();
  };
  for (const wire of project.wires) {
    const endpoints = [wire.source, wire.destination].flatMap((endpoint) =>
      endpoint?.type === "terminal" ? [endpoint.connectorId] : [],
    );
    if (wires.length && (wires.length >= WIRES_PER_PAGE ||
      new Set([...connectors, ...endpoints]).size > CONNECTORS_PER_PAGE)) flush();
    endpoints.forEach((id) => connectors.add(id));
    wires.push(wire);
  }
  // Include connectors without wires, filling any room on the last sheet first.
  for (const connector of project.connectors) {
    if (shown.has(connector.id) || connectors.has(connector.id)) continue;
    if (connectors.size >= CONNECTORS_PER_PAGE) flush();
    connectors.add(connector.id);
  }
  if (wires.length || connectors.size || !pages.length) flush();
  return pages;
}
