import { SleeveTexture, sleeveTypes } from "@/config/sleeving";
import { describeSleeve, SleeveSpan } from "@/domain/wiringTable";

// Fill patterns shared by the schematic and assembly drawings, one per
// catalog texture. Smooth types (tubing, heat shrink) take a plain fill.
export const SLEEVE_TEXTURE: Partial<Record<SleeveTexture, string>> = {
  braid: "url(#sleeve-braid)",
  "soft-braid": "url(#sleeve-soft-braid)",
  "metal-braid": "url(#sleeve-metal-braid)",
  weave: "url(#sleeve-weave)",
  spiral: "url(#sleeve-spiral)",
  ribbed: "url(#sleeve-ribbed)",
  tape: "url(#sleeve-tape)",
};

export function SleevePatterns() {
  return (
    <defs>
      <pattern id="sleeve-braid" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 0 L8 8 M8 0 L0 8" stroke="#94a3b8" strokeOpacity=".55" strokeWidth="1" />
      </pattern>
      <pattern id="sleeve-soft-braid" width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0 0 L5 5 M5 0 L0 5" stroke="#94a3b8" strokeOpacity=".55" strokeWidth="1.5" />
      </pattern>
      <pattern id="sleeve-metal-braid" width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill="#cbd5e1" fillOpacity=".5" />
        <path d="M0 0 L5 5 M5 0 L0 5" stroke="#475569" strokeOpacity=".7" strokeWidth=".8" />
      </pattern>
      <pattern id="sleeve-weave" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 3 H6 M3 0 V6" stroke="#94a3b8" strokeOpacity=".55" strokeWidth="1" />
      </pattern>
      <pattern id="sleeve-spiral" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 10 L10 0" stroke="#94a3b8" strokeOpacity=".55" strokeWidth="2" />
      </pattern>
      <pattern id="sleeve-ribbed" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M3 0 V6" stroke="#94a3b8" strokeOpacity=".55" strokeWidth="1.5" />
      </pattern>
      <pattern id="sleeve-tape" width="14" height="14" patternUnits="userSpaceOnUse">
        <path d="M0 14 L14 0" stroke="#94a3b8" strokeOpacity=".55" strokeWidth="1" />
      </pattern>
    </defs>
  );
}

export const sleeveStyles = `.sleeve-balloon{fill:#fff;stroke:#111827;stroke-width:1.5}.sleeve-balloon-text{font:800 9px system-ui;fill:#111827}.sleeve-leader{fill:none;stroke:#111827;stroke-width:1}`;

// Item balloon: the sleeve's label in a circle, matched to the sleeving
// table, so the drawing needs no prose to say which sleeve is which.
export function SleeveBalloon({
  sleeve,
  x,
  y,
  toX,
  toY,
}: {
  sleeve: SleeveSpan;
  x: number;
  y: number;
  toX?: number;
  toY?: number;
}) {
  return (
    <g data-sleeve-balloon={sleeve.label}>
      <title>{`${sleeve.label}: ${describeSleeve(sleeve)}`}</title>
      {toX !== undefined && toY !== undefined && (
        <path d={`M ${x} ${y + 11} L ${toX} ${toY}`} className="sleeve-leader" />
      )}
      <circle cx={x} cy={y} r="11" className="sleeve-balloon" />
      <text x={x} y={y + 3} textAnchor="middle" className="sleeve-balloon-text">
        {sleeve.label}
      </text>
    </g>
  );
}

// A small piece of the sleeve as drawn: color, texture and tracer stripe.
export function SleeveSwatch({
  sleeve,
  x,
  y,
  width,
  height,
}: {
  sleeve: SleeveSpan;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const texture = SLEEVE_TEXTURE[sleeveTypes[sleeve.type].texture];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="3" fill={sleeve.color} stroke="#1f2937" />
      {texture && <rect x={x} y={y} width={width} height={height} rx="3" fill={texture} />}
      {sleeve.tracerColor && (
        <line
          x1={x + 2}
          x2={x + width - 2}
          y1={y + height / 2}
          y2={y + height / 2}
          stroke={sleeve.tracerColor}
          strokeWidth="2"
        />
      )}
    </g>
  );
}
