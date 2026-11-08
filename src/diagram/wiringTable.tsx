import type { WiringTableRow } from "@/domain/wiringTable";

export const TABLE_HEADING_HEIGHT = 54;
const TABLE_X = 20;
const LINE_HEIGHT = 14;
const columns: { label: string; width: number; value: (row: WiringTableRow) => string }[] = [
  { label: "WIRE", width: 70, value: (r) => r.wire },
  { label: "FROM", width: 120, value: (r) => r.from },
  { label: "SIGNAL", width: 180, value: (r) => r.signal },
  { label: "COLOR", width: 150, value: (r) => r.colorName },
  { label: "AWG", width: 80, value: (r) => r.awg === null ? "—" : String(r.awg) },
  { label: "LENGTH", width: 100, value: (r) => r.lengthMm === null ? "—" : `${r.lengthMm} mm` },
  { label: "TO", width: 120, value: (r) => r.to },
  { label: "STATUS", width: 140, value: (r) => r.status === "nc" ? "NC" : r.status.toUpperCase() },
];

function wrap(value: string, width: number) {
  const capacity = Math.max(1, Math.floor(width / 6.5));
  const lines: string[] = [];
  for (const paragraph of value.replace(/\s+/gu, " ").split(/\r?\n/)) {
    const chars = Array.from(paragraph);
    if (!chars.length) lines.push("");
    while (chars.length) {
      let end = Math.min(capacity, chars.length);
      if (chars.length > capacity) {
        const space = chars.slice(0, capacity + 1).lastIndexOf(" ");
        if (space > 0) end = space + 1;
      }
      lines.push(chars.splice(0, end).join(""));
    }
  }
  return lines;
}

export function layoutTableRow(row: WiringTableRow) {
  const cells = columns.map((column) => {
    const swatch = column.label === "COLOR" && row.color !== null;
    const inset = swatch ? 32 : 8;
    const width = column.width - inset - 8;
    return { ...column, inset, availableWidth: width, lines: wrap(column.value(row), width) };
  });
  return { cells, height: Math.max(22, Math.max(...cells.map((c) => c.lines.length)) * LINE_HEIGHT + 8) };
}

export const wiringTableHeight = (rows: WiringTableRow[]) =>
  TABLE_HEADING_HEIGHT + rows.reduce((height, row) => height + layoutTableRow(row).height, 0);

export function WiringTable({ rows, top, pageNumber }: { rows: WiringTableRow[]; top: number; pageNumber: number }) {
  const bottom = top + wiringTableHeight(rows);
  const layouts = rows.map(layoutTableRow);
  return (
    <g data-wiring-table="" data-table-top={top} data-table-bottom={bottom}>
      <style>{`.table-title{font:800 12px system-ui;fill:#111827;letter-spacing:1px}.table-heading{font:800 9px system-ui;fill:#475569}.table-cell{font:600 10px ui-monospace,monospace;fill:#111827}.table-warn{fill:#b91c1c}.table-rule{stroke:#cbd5e1;stroke-width:1}`}</style>
      <text x={TABLE_X} y={top + 18} className="table-title">WIRING TABLE</text>
      <rect x={TABLE_X} y={top + 30} width="960" height="24" fill="#f1f5f9" />
      {columns.map((column, index) => (
        <text key={column.label} x={TABLE_X + columns.slice(0, index).reduce((x, c) => x + c.width, 0) + 8} y={top + 46} className="table-heading">{column.label}</text>
      ))}
      {rows.map((row, index) => {
        const layout = layouts[index];
        const y = top + TABLE_HEADING_HEIGHT + layouts.slice(0, index).reduce((sum, entry) => sum + entry.height, 0);
        return (
          <g key={`${row.wire}-${row.from}-${index}`} data-table-row={row.status} data-row-top={y} data-row-bottom={y + layout.height}>
            <line x1={TABLE_X} x2="980" y1={y + layout.height} y2={y + layout.height} className="table-rule" />
            {layout.cells.map((cell, cellIndex) => {
              const left = TABLE_X + layout.cells.slice(0, cellIndex).reduce((sum, column) => sum + column.width, 0);
              const swatch = cell.label === "COLOR" && row.color;
              return (
                <g key={cell.label}>
                  {swatch && <>
                    <line x1={left + 8} x2={left + 24} y1={y + 11} y2={y + 11} stroke="#475569" strokeWidth="6" />
                    <line x1={left + 8} x2={left + 24} y1={y + 11} y2={y + 11} stroke={row.color!} strokeWidth="4" />
                    {row.stripeColor && <line x1={left + 8} x2={left + 24} y1={y + 11} y2={y + 11} stroke={row.stripeColor} strokeWidth="1.5" strokeDasharray="3 2" />}
                  </>}
                  <text className={cell.label === "STATUS" && row.status !== "connected" ? "table-cell table-warn" : "table-cell"}>
                    {cell.lines.map((line, lineIndex) => (
                      <tspan key={lineIndex} x={left + cell.inset} y={y + 15 + lineIndex * LINE_HEIGHT}
                        textLength={line ? Math.min(Array.from(line).length * 6.2, cell.availableWidth) : undefined} lengthAdjust="spacingAndGlyphs">{line}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      <rect x={TABLE_X} y={top + 30} width="960" height={bottom - top - 30} fill="none" stroke="#475569" />
      {columns.slice(0, -1).map((column, index) => {
        const x = TABLE_X + columns.slice(0, index + 1).reduce((sum, c) => sum + c.width, 0);
        return <line key={`${pageNumber}-${column.label}`} x1={x} x2={x} y1={top + 30} y2={bottom} className="table-rule" />;
      })}
    </g>
  );
}
