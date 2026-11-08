import { drawnFromBottom, HarnessProject, Wire } from "@/domain/model";
import { getDefinition } from "@/domain/connectors";
import { SleeveTexture, sleeveTypes } from "@/config/sleeving";
import {
  buildWiringTable,
  describeSleeve,
  sleeveSpans,
} from "@/domain/wiringTable";
import {
  SleeveTable,
  sleeveTableHeight,
  tableStyles,
  WiringTable,
  wiringTableHeight,
} from "./wiringTable";

// Assembly drawing: connectors drawn in profile at the left and right ends of
// the harness, wires gathered through a cable jacket between them.
const HOUSING_W = 64;
const PITCH = 30;
const LEFT_X = 110;
const RIGHT_X = 1000 - LEFT_X - HOUSING_W;
const JACKET_LEFT = 330;
const JACKET_RIGHT = 670;
const HEADER_H = 78;
const FIRST_TOP = 60 + HEADER_H;
const STACK_GAP = 36;
const SLEEVE_TEXTURE: Partial<Record<SleeveTexture, string>> = {
  braid: "url(#sleeve-braid)",
  "soft-braid": "url(#sleeve-soft-braid)",
  "metal-braid": "url(#sleeve-metal-braid)",
  weave: "url(#sleeve-weave)",
  spiral: "url(#sleeve-spiral)",
  ribbed: "url(#sleeve-ribbed)",
  tape: "url(#sleeve-tape)",
};

type Connector = HarnessProject["connectors"][number];
type Placed = {
  connector: Connector;
  end: "left" | "right";
  top: number;
  height: number;
  pinCount: number;
  bottom: boolean;
  outerX: number;
  innerX: number;
};

const pinOf = (endpoint: Wire["source"] | undefined) =>
  endpoint?.type === "terminal"
    ? Number(endpoint.terminalId.split("-p").pop())
    : undefined;

function placeConnectors(project: HarnessProject): Placed[] {
  let rightTop = FIRST_TOP;
  return project.connectors.map((connector, index) => {
    const definition = getDefinition(connector.definitionId);
    const pinCount = definition?.pinCount ?? 1;
    const height = pinCount * PITCH + 20;
    const end = index === 0 ? "left" : "right";
    const top = end === "left" ? FIRST_TOP : rightTop;
    if (end === "right") rightTop += height + HEADER_H + STACK_GAP;
    return {
      connector,
      end,
      top,
      height,
      pinCount,
      bottom: !!definition && drawnFromBottom(connector, definition),
      outerX: end === "left" ? LEFT_X : RIGHT_X + HOUSING_W,
      innerX: end === "left" ? LEFT_X + HOUSING_W : RIGHT_X,
    };
  });
}

// Seen from the bottom (contact windows) pin 1 is at the top of the profile;
// seen from the top (latch side) the order reverses.
function pinY(placed: Placed, pin: number) {
  const slot =
    placed.bottom ? pin - 1 : placed.pinCount - pin;
  return placed.top + 10 + slot * PITCH + PITCH / 2;
}

function Housing({
  placed,
  project,
  usedPins,
}: {
  placed: Placed;
  project: HarnessProject;
  usedPins: Set<string>;
}) {
  const { connector, end, top, height, pinCount, outerX, innerX } = placed;
  const definition = getDefinition(connector.definitionId);
  const x = Math.min(outerX, innerX);
  const face = placed.bottom ? "bottom" : "top";
  const towardWires = end === "left" ? 1 : -1;
  const layout = project.layout;
  const headerX = end === "left" ? x : x + HOUSING_W;
  const anchor = end === "left" ? "start" : "end";
  const details = [
    layout.showConnectorPartNumber !== false
      ? definition?.housingPartNumber
      : null,
    layout.showConnectorPitch !== false && definition?.pitchMm != null
      ? `${definition.pitchMm} mm PITCH`
      : null,
  ].filter(Boolean);
  const header = [
    layout.showConnectorReferences !== false
      ? { className: "ref-title", text: connector.reference }
      : null,
    layout.showConnectorFamily !== false && definition
      ? {
          className: "family-title",
          text: `${definition.family} · ${pinCount}-pin`,
        }
      : null,
    details.length ? { className: "part", text: details.join(" · ") } : null,
    layout.showView
      ? {
          className: "view",
          text: `VIEWED FROM ${face === "top" ? "TOP (LATCH SIDE)" : "BOTTOM (CONTACT WINDOWS)"}`,
        }
      : null,
  ].filter(
    (line): line is { className: string; text: string } => line !== null,
  );
  const terminal = (pin: number) => {
    const ref = project.terminals.find(
      (t) => t.id === `${connector.id}-p${pin}`,
    );
    const wire = project.wires.find(
      (w) =>
        (w.source.type === "terminal" &&
          w.source.terminalId === `${connector.id}-p${pin}`) ||
        (w.destination?.type === "terminal" &&
          w.destination.terminalId === `${connector.id}-p${pin}`),
    );
    return wire?.label || ref?.label || "";
  };
  return (
    <g data-connector={connector.id} data-face={face}>
      {header.map((line, index) => (
        <text
          key={line.className}
          x={headerX}
          y={top - HEADER_H + 22 + index * 16}
          textAnchor={anchor}
          className={line.className}
        >
          {line.text}
        </text>
      ))}
      <rect x={x} y={top} width={HOUSING_W} height={height} rx="3" className="housing" />
      {face === "top" && (
        <rect
          x={end === "left" ? x + 8 : x + HOUSING_W - 22}
          y={top + 8}
          width="14"
          height={height - 16}
          rx="2"
          className="latch"
        />
      )}
      {Array.from({ length: pinCount }, (_, i) => i + 1).map((pin) => {
        const y = pinY(placed, pin);
        const nc = !usedPins.has(`${connector.id}-p${pin}`);
        const label = layout.showLabels ? terminal(pin) : "";
        return (
          <g key={pin}>
            {face === "bottom" ? (
              <>
                <rect
                  x={x + 9}
                  y={y - PITCH / 2 + 5}
                  width={HOUSING_W - 18}
                  height={PITCH - 10}
                  className="window"
                />
                <path
                  d={`M ${x + 15} ${y} H ${x + HOUSING_W - 15} M ${x + 22} ${y - 5} V ${y + 5} M ${x + HOUSING_W - 22} ${y - 5} V ${y + 5}`}
                  className="contact"
                />
              </>
            ) : (
              <rect
                x={end === "left" ? x + HOUSING_W - 30 : x + 12}
                y={y - 5}
                width="18"
                height="10"
                rx="1"
                className="cavity"
              />
            )}
            {(layout.showPinNumbers || label) && (
              <text
                x={outerX - towardWires * 10}
                y={y + 4}
                textAnchor={end === "left" ? "end" : "start"}
                className="pin"
              >
                {end === "left"
                  ? [label.slice(0, 14), layout.showPinNumbers ? pin : ""]
                      .filter(Boolean)
                      .join("  ")
                  : [layout.showPinNumbers ? pin : "", label.slice(0, 14)]
                      .filter(Boolean)
                      .join("  ")}
              </text>
            )}
            {nc && (
              <text
                x={innerX + towardWires * 10}
                y={y + 4}
                textAnchor={end === "left" ? "start" : "end"}
                className="nc"
              >
                NC ✕
              </text>
            )}
          </g>
        );
      })}
      {[top - 4, top + height - 4].map((tabY) => (
        <rect
          key={tabY}
          x={innerX - 4 + towardWires * 2}
          y={tabY}
          width="8"
          height="8"
          className="tab"
        />
      ))}
    </g>
  );
}

export function AssemblyDiagramSvg({
  project,
  svgRef,
}: {
  project: HarnessProject;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  const placed = placeConnectors(project);
  const byId = new Map(placed.map((p) => [p.connector.id, p]));
  const usedPins = new Set<string>();
  const port = (endpoint: Wire["source"] | undefined) => {
    if (endpoint?.type !== "terminal") return undefined;
    usedPins.add(endpoint.terminalId);
    const p = byId.get(endpoint.connectorId);
    const pin = pinOf(endpoint);
    if (!p || !pin) return undefined;
    return { x: p.innerX, y: pinY(p, pin), end: p.end };
  };
  const routed = project.wires
    .map((wire) => {
      const a = port(wire.source);
      const b = port(wire.destination);
      const [start, finish] =
        a && b && a.end === "right" && b.end === "left" ? [b, a] : [a, b];
      return { wire, start, finish };
    })
    .filter((r) => r.start);
  const ys = routed.flatMap((r) => [r.start!.y, ...(r.finish ? [r.finish.y] : [])]);
  const jacketCenter = ys.length
    ? (Math.min(...ys) + Math.max(...ys)) / 2
    : FIRST_TOP + 60;
  const jacketHeight = Math.max(18, routed.length * 6 + 8);
  const entries = [...routed].sort((m, n) => m.start!.y - n.start!.y);
  const entryY = (r: (typeof routed)[number]) =>
    jacketCenter -
    jacketHeight / 2 +
    5 +
    entries.indexOf(r) * ((jacketHeight - 10) / Math.max(routed.length - 1, 1));

  const pathFor = (r: (typeof routed)[number]) => {
    const s = r.start!;
    const dir = s.end === "left" ? 1 : -1;
    const ey = entryY(r);
    const [inX, outX] =
      dir === 1 ? [JACKET_LEFT, JACKET_RIGHT] : [JACKET_RIGHT, JACKET_LEFT];
    const leave = `M ${s.x} ${s.y} H ${s.x + 18 * dir} C ${s.x + 90 * dir} ${s.y} ${inX - 70 * dir} ${ey} ${inX} ${ey} H ${outX}`;
    const f = r.finish;
    if (!f) return `${leave} H ${outX + 70 * dir}`;
    if (f.end === s.end)
      return `M ${s.x} ${s.y} H ${s.x + 18 * dir} C ${s.x + 130 * dir} ${s.y} ${f.x + 130 * dir} ${f.y} ${f.x + 18 * dir} ${f.y} H ${f.x}`;
    return `${leave} C ${outX + 70 * dir} ${ey} ${f.x - 90 * dir} ${f.y} ${f.x - 18 * dir} ${f.y} H ${f.x}`;
  };

  const sleeves = routed.length ? sleeveSpans(project) : [];
  const wireNumbers = new Map(project.wires.map((w, i) => [w.id, `W${i + 1}`]));
  // The jacket stands in for the harness run, so sleeve spans scale onto it.
  const alongJacket = (mm: number, harnessMm: number) =>
    JACKET_LEFT + ((JACKET_RIGHT - JACKET_LEFT) * mm) / harnessMm;
  const sleeveCalloutTop = jacketCenter + jacketHeight / 2 + 26;
  const contentBottom = Math.max(
    jacketCenter + jacketHeight / 2,
    sleeves.length ? sleeveCalloutTop + (sleeves.length - 1) * 16 : 0,
    ...placed.map((p) => p.top + p.height),
  );
  const dimensionY = contentBottom + 48;
  const overall = Math.max(0, ...project.wires.map((w) => w.lengthMm));
  const showDimension = project.layout.showLength && overall > 0;
  const tableRows =
    project.layout.showWiringTable !== false ? buildWiringTable(project) : [];
  const tableTop = dimensionY + (showDimension ? 44 : 0);
  const sleeveTop =
    tableTop + (tableRows.length ? wiringTableHeight(tableRows.length) + 16 : 0);
  const height =
    sleeveTop + (sleeves.length ? sleeveTableHeight(sleeves.length) : 0) + 70;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 1000 ${height}`}
      className="diagram-svg"
      role="img"
      aria-label={`${project.name} assembly drawing`}
    >
      <style>{`.paper{fill:#fff;stroke:#cbd5e1;stroke-width:2}.housing{fill:#f3f4f6;stroke:#1f2937;stroke-width:3}.latch{fill:#e5e7eb;stroke:#1f2937;stroke-width:2}.window{fill:#fff;stroke:#334155;stroke-width:1.5}.contact{fill:none;stroke:#334155;stroke-width:1.5}.cavity{fill:#fff;stroke:#334155;stroke-width:1.5}.tab{fill:#1f2937}.jacket{fill:#374151}.ref-title{font:800 15px system-ui;fill:#111827}.family-title{font:700 13px system-ui;fill:#111827}.part{font:600 8px ui-monospace;fill:#475569}.view{font:600 7px system-ui;fill:#475569;letter-spacing:.45px}.pin{font:700 9px system-ui;fill:#111827}.nc{font:800 10px system-ui;fill:#dc2626}.dimension{fill:none;stroke:#475569;stroke-width:1}.dimension-text{font:700 12px system-ui;fill:#111827}.sleeve{fill-opacity:.6;stroke:#1f2937;stroke-width:1.5}.sleeve-label{font:700 9px system-ui;fill:#111827}${tableStyles}`}</style>
      <defs>
        <pattern id="sleeve-braid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0 L8 8 M8 0 L0 8" stroke="#111827" strokeOpacity=".35" strokeWidth="1" />
        </pattern>
        <pattern id="sleeve-soft-braid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 0 L5 5 M5 0 L0 5" stroke="#111827" strokeOpacity=".2" strokeWidth="1.5" />
        </pattern>
        <pattern id="sleeve-metal-braid" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="#cbd5e1" fillOpacity=".5" />
          <path d="M0 0 L5 5 M5 0 L0 5" stroke="#475569" strokeOpacity=".7" strokeWidth=".8" />
        </pattern>
        <pattern id="sleeve-weave" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3 H6 M3 0 V6" stroke="#111827" strokeOpacity=".3" strokeWidth="1" />
        </pattern>
        <pattern id="sleeve-spiral" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 10 L10 0" stroke="#111827" strokeOpacity=".4" strokeWidth="2" />
        </pattern>
        <pattern id="sleeve-ribbed" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M3 0 V6" stroke="#111827" strokeOpacity=".35" strokeWidth="1.5" />
        </pattern>
        <pattern id="sleeve-tape" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 L14 0" stroke="#111827" strokeOpacity=".25" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="10" y="10" width="980" height={height - 20} rx="3" className="paper" />
      <text x="500" y="34" textAnchor="middle" style={{ font: "700 19px system-ui", fill: "#111827" }}>
        {project.name}
      </text>
      {routed.map((r) => {
        const d = pathFor(r);
        const light = ["#ffffff", "#fefefe", "#ffff00"].includes(
          r.wire.color.toLowerCase(),
        );
        return (
          <g key={r.wire.id} data-wire={r.wire.id}>
            <path d={d} fill="none" stroke={light ? "#475569" : "#ffffff"} strokeWidth="8" strokeLinejoin="round" className="wire-outline" />
            <path d={d} fill="none" stroke={r.wire.color} strokeWidth="4.5" strokeLinejoin="round" />
            {r.wire.stripeColor && (
              <path d={d} fill="none" stroke={r.wire.stripeColor} strokeWidth="1.5" strokeDasharray="10 7" />
            )}
          </g>
        );
      })}
      {routed.length > 0 && (
        <rect
          x={JACKET_LEFT}
          y={jacketCenter - jacketHeight / 2}
          width={JACKET_RIGHT - JACKET_LEFT}
          height={jacketHeight}
          rx={jacketHeight / 2}
          className="jacket"
        />
      )}
      {sleeves.map((sleeve, index) => {
        const x1 = alongJacket(sleeve.startMm, sleeve.harnessMm);
        const x2 = alongJacket(sleeve.endMm, sleeve.harnessMm);
        const inset = 3 + index * 2;
        const y = jacketCenter - jacketHeight / 2 - inset;
        const h = jacketHeight + inset * 2;
        const texture = SLEEVE_TEXTURE[sleeveTypes[sleeve.type].texture];
        const labelY = sleeveCalloutTop + index * 16;
        return (
          <g key={sleeve.id} data-sleeve={sleeve.label}>
            <rect x={x1} y={y} width={x2 - x1} height={h} rx="4" fill={sleeve.color} className="sleeve" />
            {texture && (
              <rect x={x1} y={y} width={x2 - x1} height={h} rx="4" fill={texture} />
            )}
            {/* Callouts stack under the jacket, keyed to their sleeve by color. */}
            <rect x={JACKET_LEFT - 40} y={labelY - 8} width="12" height="9" rx="1" fill={sleeve.color} stroke="#1f2937" />
            <text x={JACKET_LEFT - 22} y={labelY} className="sleeve-label">
              {sleeve.label} · {describeSleeve(sleeve, false).toUpperCase()}
            </text>
          </g>
        );
      })}
      {placed.map((p) => (
        <Housing key={p.connector.id} placed={p} project={project} usedPins={usedPins} />
      ))}
      {showDimension && (
        <g id="overall-length">
          <path
            d={`M ${LEFT_X} ${contentBottom + 14} V ${dimensionY + 6} M ${RIGHT_X + HOUSING_W} ${contentBottom + 14} V ${dimensionY + 6} M ${LEFT_X} ${dimensionY} H ${RIGHT_X + HOUSING_W} M ${LEFT_X + 8} ${dimensionY - 4} L ${LEFT_X} ${dimensionY} L ${LEFT_X + 8} ${dimensionY + 4} M ${RIGHT_X + HOUSING_W - 8} ${dimensionY - 4} L ${RIGHT_X + HOUSING_W} ${dimensionY} L ${RIGHT_X + HOUSING_W - 8} ${dimensionY + 4}`}
            className="dimension"
          />
          <text x="500" y={dimensionY + 26} textAnchor="middle" className="dimension-text">
            OVERALL LENGTH L = {overall} mm (END FACE TO END FACE)
          </text>
        </g>
      )}
      {tableRows.length > 0 && <WiringTable rows={tableRows} top={tableTop} />}
      {sleeves.length > 0 && (
        <SleeveTable sleeves={sleeves} wireNumbers={wireNumbers} top={sleeveTop} />
      )}
      <text x="500" y={height - 32} textAnchor="middle" className="view">
        CROSSED (✕) PINS ARE NOT CONNECTED · CONFIRM HOUSING PART AND VIEWING
        SIDE BEFORE ASSEMBLY
      </text>
    </svg>
  );
}
