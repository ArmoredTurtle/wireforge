import {
  SleeveSpan,
  SleeveTableRow,
  sleeveTableRow,
  WiringTableRow,
} from "@/domain/wiringTable";
import { SleeveSwatch } from "./sleeves";

export const tableStyles = `.table-title{font:800 12px system-ui;fill:#111827;letter-spacing:1px}.table-head{fill:#f1f5f9}.table-heading{font:800 9px system-ui;fill:#475569;letter-spacing:.6px}.table-cell{font:600 10px system-ui;fill:#111827}.table-warn{fill:#b91c1c}.table-rule{stroke:#cbd5e1;stroke-width:1}.table-frame{fill:none;stroke:#475569;stroke-width:1.5}`;

const TABLE_X = 20;
const TABLE_ROW = 22;
const TABLE_HEADER = 24;
const TABLE_TITLE = 30;
const tableColumns: ReadonlyArray<{
  label: string;
  width: number;
  cell: (row: WiringTableRow) => string;
}> = [
  { label: "WIRE", width: 70, cell: (row) => row.wire },
  { label: "FROM", width: 120, cell: (row) => row.from },
  { label: "SIGNAL", width: 140, cell: (row) => row.signal },
  { label: "SLEEVE", width: 70, cell: (row) => row.sleeve },
  { label: "COLOR", width: 130, cell: (row) => row.colorName },
  { label: "AWG", width: 80, cell: (row) => (row.awg ? String(row.awg) : "—") },
  {
    label: "LENGTH",
    width: 100,
    cell: (row) => (row.lengthMm ? `${row.lengthMm} mm` : "—"),
  },
  { label: "TO", width: 120, cell: (row) => row.to },
  {
    label: "STATUS",
    width: 130,
    cell: (row) =>
      row.status === "nc"
        ? "NC"
        : row.status === "connected"
          ? "CONNECTED"
          : "UNCONNECTED",
  },
];

export const wiringTableHeight = (rows: number) =>
  TABLE_TITLE + TABLE_HEADER + rows * TABLE_ROW;

export function WiringTable({ rows, top }: { rows: WiringTableRow[]; top: number }) {
  const width = tableColumns.reduce((sum, column) => sum + column.width, 0);
  const headerTop = top + TABLE_TITLE;
  const bodyTop = headerTop + TABLE_HEADER;
  const bottom = bodyTop + rows.length * TABLE_ROW;
  const columns = tableColumns.map((column, index) => ({
    ...column,
    x:
      TABLE_X +
      tableColumns.slice(0, index).reduce((sum, c) => sum + c.width, 0),
  }));
  return (
    <g id="wiring-table">
      <text x={TABLE_X} y={top + 18} className="table-title">
        WIRING TABLE
      </text>
      <rect
        x={TABLE_X}
        y={headerTop}
        width={width}
        height={TABLE_HEADER}
        className="table-head"
      />
      {columns.map((column) => (
        <text
          key={column.label}
          x={column.x + 8}
          y={headerTop + 16}
          className="table-heading"
        >
          {column.label}
        </text>
      ))}
      {rows.map((row, rowIndex) => {
        const y = bodyTop + rowIndex * TABLE_ROW;
        return (
          <g key={`${row.wire}-${row.from}-${rowIndex}`} data-table-row={row.status}>
            <line
              x1={TABLE_X}
              x2={TABLE_X + width}
              y1={y + TABLE_ROW}
              y2={y + TABLE_ROW}
              className="table-rule"
            />
            {columns.map((column) => {
              const swatch = column.label === "COLOR" && row.color;
              return (
                <g key={column.label}>
                  {swatch && (
                    <>
                      <line
                        x1={column.x + 8}
                        x2={column.x + 24}
                        y1={y + 11}
                        y2={y + 11}
                        stroke="#475569"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      <line
                        x1={column.x + 8}
                        x2={column.x + 24}
                        y1={y + 11}
                        y2={y + 11}
                        stroke={row.color!}
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      {row.stripeColor && (
                        <line
                          x1={column.x + 8}
                          x2={column.x + 24}
                          y1={y + 11}
                          y2={y + 11}
                          stroke={row.stripeColor}
                          strokeWidth="1.5"
                          strokeDasharray="3 2"
                        />
                      )}
                    </>
                  )}
                  <text
                    x={column.x + (swatch ? 32 : 8)}
                    y={y + 15}
                    className={
                      column.label === "STATUS" && row.status !== "connected"
                        ? "table-cell table-warn"
                        : "table-cell"
                    }
                  >
                    {column.cell(row)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      <rect
        x={TABLE_X}
        y={headerTop}
        width={width}
        height={bottom - headerTop}
        className="table-frame"
      />
      {columns.slice(1).map((column) => (
        <line
          key={column.label}
          x1={column.x}
          x2={column.x}
          y1={headerTop}
          y2={bottom}
          className="table-rule"
        />
      ))}
    </g>
  );
}

export const sleeveTableHeight = (sleeves: number) =>
  TABLE_TITLE + TABLE_HEADER + sleeves * TABLE_ROW;

const sleeveColumns: ReadonlyArray<{
  label: string;
  width: number;
  cell?: (row: SleeveTableRow) => string;
}> = [
  { label: "ITEM", width: 50, cell: (row) => row.item },
  { label: "", width: 50 },
  { label: "SLEEVE", width: 190, cell: (row) => row.type },
  { label: "RATIO / WRAP / ENDS", width: 140, cell: (row) => row.build },
  { label: "COLOR", width: 110, cell: (row) => row.color },
  { label: "SIZE mm", width: 70, cell: (row) => row.size },
  { label: "LENGTH mm", width: 100, cell: (row) => row.length },
  { label: "WIRES", width: 130, cell: (row) => row.wires },
  { label: "P/N", width: 120, cell: (row) => row.partNumber },
];

// Sleeving bill of materials under the wiring table. LENGTH reads
// "length @ offset from the source end" for sleeves that are not full length.
export function SleeveTable({
  sleeves,
  wireNumbers,
  top,
}: {
  sleeves: SleeveSpan[];
  wireNumbers: Map<string, string>;
  top: number;
}) {
  const width = sleeveColumns.reduce((sum, column) => sum + column.width, 0);
  const headerTop = top + TABLE_TITLE;
  const bodyTop = headerTop + TABLE_HEADER;
  const bottom = bodyTop + sleeves.length * TABLE_ROW;
  const columns = sleeveColumns.map((column, index) => ({
    ...column,
    x:
      TABLE_X +
      sleeveColumns.slice(0, index).reduce((sum, c) => sum + c.width, 0),
  }));
  return (
    <g id="sleeve-table">
      <text x={TABLE_X} y={top + 18} className="table-title">
        SLEEVING
      </text>
      <rect x={TABLE_X} y={headerTop} width={width} height={TABLE_HEADER} className="table-head" />
      {columns.map((column) => (
        <text key={column.x} x={column.x + 8} y={headerTop + 16} className="table-heading">
          {column.label}
        </text>
      ))}
      {sleeves.map((sleeve, rowIndex) => {
        const y = bodyTop + rowIndex * TABLE_ROW;
        const row = sleeveTableRow(sleeve, wireNumbers);
        return (
          <g key={sleeve.id} data-sleeve-row={sleeve.label}>
            <line x1={TABLE_X} x2={TABLE_X + width} y1={y + TABLE_ROW} y2={y + TABLE_ROW} className="table-rule" />
            {columns.map((column) =>
              column.cell ? (
                <text key={column.x} x={column.x + 8} y={y + 15} className="table-cell">
                  {column.cell(row)}
                </text>
              ) : (
                <SleeveSwatch key={column.x} sleeve={sleeve} x={column.x + 8} y={y + 5} width={column.width - 16} height={12} />
              ),
            )}
          </g>
        );
      })}
      <rect x={TABLE_X} y={headerTop} width={width} height={bottom - headerTop} className="table-frame" />
      {columns.slice(1).map((column) => (
        <line key={column.x} x1={column.x} x2={column.x} y1={headerTop} y2={bottom} className="table-rule" />
      ))}
    </g>
  );
}
