import { HarnessProject, Wire } from "@/domain/model";
import { getDefinition, pinMap } from "@/domain/connectors";

const FACE_Y = 128;
const FACE_W = 150;
const PORT_Y = 252;
const LANE_START = 330;
const LANE_GAP = 46;

function connectorCenter(index: number, count: number) {
  return count === 1 ? 500 : 115 + index * (770 / (count - 1));
}

function endpointPin(w: Wire, side: "source" | "destination") {
  const endpoint = side === "source" ? w.source : w.destination;
  return endpoint?.type === "terminal"
    ? Number(endpoint.terminalId.split("-p").pop())
    : undefined;
}

function endpointAnchor(
  project: HarnessProject,
  connectorId: string,
  pin: number,
) {
  const index = project.connectors.findIndex((c) => c.id === connectorId);
  const definition = getDefinition(project.connectors[index].definitionId)!;
  const center = connectorCenter(index, project.connectors.length);
  return {
    x:
      definition.renderer === "ring-terminal"
        ? center
        : center -
          FACE_W / 2 +
          18 +
          (pin - 1) * (114 / Math.max(definition.pinCount - 1, 1)),
    y: PORT_Y,
    index,
  };
}

function ConnectorGraphic({
  project,
  index,
}: {
  project: HarnessProject;
  index: number;
}) {
  const connector = project.connectors[index];
  const definition = getDefinition(connector.definitionId)!;
  const center = connectorCenter(index, project.connectors.length);
  const x = center - FACE_W / 2;
  const columns = Math.ceil(definition.pinCount / definition.rows);
  const cell = Math.min(30, 112 / Math.max(columns, 2));
  const height = definition.rows === 1 ? 66 : 94;
  const map = pinMap(definition, connector.view);
  const keyed = ["micro-fit", "mini-fit", "jst-sm"].includes(
    definition.renderer,
  );
  const showReference = project.layout.showConnectorReferences !== false;
  const showFamily = project.layout.showConnectorFamily !== false;
  const showPartNumber = project.layout.showConnectorPartNumber !== false;
  const showPitch = project.layout.showConnectorPitch !== false;
  const showLatchOrientation = project.layout.showLatchOrientation !== false;
  const connectorDetails = [
    showPartNumber ? definition.housingPartNumber : null,
    showPitch && definition.pitchMm != null
      ? `${definition.pitchMm} mm PITCH`
      : null,
  ].filter(Boolean);
  const headerY = (line: number, count: number) =>
    113 - (count - line - 1) * 17;

  if (definition.renderer === "ring-terminal") {
    const anchor = endpointAnchor(project, connector.id, 1);
    const headerLines = [
      showReference
        ? { className: "ref-title", text: `TERMINATION ${connector.reference}` }
        : null,
      showFamily
        ? { className: "family-title", text: "CRIMP-ON RING TERMINAL" }
        : null,
      showPartNumber
        ? {
            className: "part",
            text: `GENERIC · ${definition.metadata?.gauge} AWG · VERIFY STUD SIZE`,
          }
        : null,
    ].filter(
      (line): line is { className: string; text: string } => line !== null,
    );
    return (
      <g data-connector={connector.id}>
        {headerLines.map((line, lineIndex) => (
          <text
            key={line.className}
            x={center}
            y={headerY(lineIndex, headerLines.length)}
            textAnchor="middle"
            className={line.className}
          >
            {line.text}
          </text>
        ))}
        <circle cx={center} cy="157" r="29" className="housing" />
        <circle
          cx={center}
          cy="157"
          r="12"
          fill="#fff"
          stroke="#1f2937"
          strokeWidth="3"
        />
        <path
          d={`M ${center - 12} 181 L ${center - 9} 213 H ${center + 9} L ${center + 12} 181`}
          fill="#d1d5db"
          stroke="#1f2937"
          strokeWidth="2"
        />
        <rect
          x={center - 14}
          y="210"
          width="28"
          height="27"
          rx="5"
          fill="#e5e7eb"
          stroke="#1f2937"
          strokeWidth="2"
        />
        <path d={`M ${center} 237 V ${anchor.y}`} className="leader" />
        <circle cx={anchor.x} cy={anchor.y} r="3" className="port" />
      </g>
    );
  }

  const headerLines = [
    showReference
      ? { className: "ref-title", text: connector.reference }
      : null,
    showFamily ? { className: "family-title", text: definition.family } : null,
    connectorDetails.length > 0
      ? { className: "part", text: connectorDetails.join(" · ") }
      : null,
    project.layout.showView
      ? {
          className: "view",
          text: `VIEWED FROM ${connector.view === "mating" ? "MATING FACE" : "WIRE ENTRY SIDE"}`,
        }
      : null,
    showLatchOrientation ? { className: "view", text: "LATCH / KEY UP" } : null,
  ].filter(
    (line): line is { className: string; text: string } => line !== null,
  );

  return (
    <g data-connector={connector.id}>
      {headerLines.map((line, lineIndex) => (
        <text
          key={`${line.className}-${line.text}`}
          x={center}
          y={headerY(lineIndex, headerLines.length)}
          textAnchor="middle"
          className={line.className}
        >
          {line.text}
        </text>
      ))}
      <rect
        x={x}
        y={FACE_Y}
        width={FACE_W}
        height={height}
        rx="7"
        className="housing"
      />
      {definition.latch === "positive" ? (
        <path
          d={`M ${center - 22} ${FACE_Y + 4} h44 l-7 15 h-30 z`}
          className="latch"
        />
      ) : (
        <path
          d={`M ${center - 38} ${FACE_Y + 5} h76 l-10 10 h-56 z`}
          className="housing-detail"
        />
      )}
      {map.map((position) => {
        const gridWidth = (columns - 1) * cell;
        const cavityX = center - gridWidth / 2 + position.column * cell;
        const cavityY =
          FACE_Y + (definition.rows === 1 ? 39 : 31 + position.row * 36);
        const anchor = endpointAnchor(project, connector.id, position.pin);
        return (
          <g key={position.pin}>
            <path
              d={`M ${cavityX} ${cavityY + 9} L ${anchor.x} ${PORT_Y}`}
              className="leader"
            />
            {keyed ? (
              <path
                d={`M ${cavityX - 9} ${cavityY - 9} h13 l5 5 v13 h-18 z`}
                className="cavity"
              />
            ) : (
              <rect
                x={cavityX - 9}
                y={cavityY - 9}
                width="18"
                height="18"
                rx={definition.renderer === "terminal" ? 9 : 2}
                className="cavity"
              />
            )}
            {project.layout.showPinNumbers && (
              <text
                x={cavityX}
                y={cavityY + 4}
                textAnchor="middle"
                className="pin"
              >
                {position.pin}
              </text>
            )}
            <circle cx={anchor.x} cy={PORT_Y} r="3" className="port" />
          </g>
        );
      })}
    </g>
  );
}

function routePath(
  source: { x: number; y: number },
  destination: { x: number; y: number } | undefined,
  lane: number,
  sourceOffset = 0,
  destinationOffset = 0,
) {
  const sourceX = source.x + sourceOffset;
  const targetX = destination
    ? destination.x + destinationOffset
    : Math.min(945, sourceX + 105);
  const sourceFan = `M ${source.x} ${source.y} Q ${source.x} ${source.y + 12} ${sourceX} ${source.y + 20}`;
  if (!destination) {
    const direction = targetX >= sourceX ? 1 : -1;
    const radius = 14;
    return `${sourceFan} L ${sourceX} ${lane - radius} Q ${sourceX} ${lane} ${sourceX + direction * radius} ${lane} L ${targetX} ${lane}`;
  }
  if (
    Math.abs(destination.x - source.x) < 1 &&
    Math.abs(destination.y - source.y) < 1
  ) {
    const pointY = Math.max(source.y + 42, lane - 78);
    const bottomY = pointY + 70;
    const halfWidth = 34;
    return `M ${source.x} ${source.y} L ${source.x} ${pointY} C ${source.x + halfWidth} ${pointY + 20} ${source.x + halfWidth} ${bottomY - 12} ${source.x} ${bottomY} C ${source.x - halfWidth} ${bottomY - 12} ${source.x - halfWidth} ${pointY + 20} ${source.x} ${pointY}`;
  }
  const direction = targetX >= sourceX ? 1 : -1;
  const radius = Math.min(14, Math.abs(targetX - sourceX) / 3);
  return `${sourceFan} L ${sourceX} ${lane - radius} Q ${sourceX} ${lane} ${sourceX + direction * radius} ${lane} L ${targetX - direction * radius} ${lane} Q ${targetX} ${lane} ${targetX} ${lane - radius} L ${targetX} ${destination.y + 20} Q ${targetX} ${destination.y + 8} ${destination.x} ${destination.y}`;
}

export function DiagramSvg({
  project,
  svgRef,
}: {
  project: HarnessProject;
  svgRef?: React.Ref<SVGSVGElement>;
}) {
  const height = Math.max(
    690,
    LANE_START + Math.max(project.wires.length - 1, 0) * LANE_GAP + 115,
  );
  const endpointGroups = new Map<string, string[]>();
  const addOccurrence = (
    connectorId: string,
    terminalId: string,
    token: string,
  ) => {
    const key = `${connectorId}:${terminalId}`;
    endpointGroups.set(key, [...(endpointGroups.get(key) ?? []), token]);
  };
  project.wires.forEach((wire, index) => {
    if (wire.source.type === "terminal")
      addOccurrence(
        wire.source.connectorId,
        wire.source.terminalId,
        `${index}:source`,
      );
    if (wire.destination?.type === "terminal")
      addOccurrence(
        wire.destination.connectorId,
        wire.destination.terminalId,
        `${index}:destination`,
      );
  });
  const stagger = (connectorId: string, terminalId: string, token: string) => {
    const group = endpointGroups.get(`${connectorId}:${terminalId}`) ?? [token];
    const position = group.indexOf(token) - (group.length - 1) / 2;
    return Math.max(-24, Math.min(24, position * 9));
  };
  const wireGeometry = project.wires.map((wire, index) => {
    if (wire.source.type !== "terminal") return null;
    const source = endpointAnchor(
      project,
      wire.source.connectorId,
      endpointPin(wire, "source") || 1,
    );
    const destination =
      wire.destination?.type === "terminal"
        ? endpointAnchor(
            project,
            wire.destination.connectorId,
            endpointPin(wire, "destination") || 1,
          )
        : undefined;
    const lane = LANE_START + index * LANE_GAP;
    const sourceOffset = stagger(
      wire.source.connectorId,
      wire.source.terminalId,
      `${index}:source`,
    );
    const destinationOffset =
      wire.destination?.type === "terminal"
        ? stagger(
            wire.destination.connectorId,
            wire.destination.terminalId,
            `${index}:destination`,
          )
        : 0;
    const sourceX = source.x + sourceOffset;
    const targetX = destination
      ? destination.x + destinationOffset
      : Math.min(945, sourceX + 105);
    return {
      source,
      destination,
      lane,
      sourceOffset,
      destinationOffset,
      sourceX,
      targetX,
      path: routePath(
        source,
        destination,
        lane,
        sourceOffset,
        destinationOffset,
      ),
    };
  });
  const verticalWireSegments = wireGeometry.flatMap((geometry) =>
    geometry
      ? [
          { x: geometry.sourceX, top: PORT_Y, bottom: geometry.lane },
          ...(geometry.destination
            ? [{ x: geometry.targetX, top: PORT_Y, bottom: geometry.lane }]
            : []),
        ]
      : [],
  );
  const placeLabel = (
    geometry: NonNullable<(typeof wireGeometry)[number]>,
    labelWidth: number,
  ) => {
    const ideal = (geometry.sourceX + geometry.targetX) / 2;
    const segmentLeft = Math.min(geometry.sourceX, geometry.targetX);
    const segmentRight = Math.max(geometry.sourceX, geometry.targetX);
    const halfWidth = labelWidth / 2;
    const left = Math.max(65 + halfWidth, segmentLeft + halfWidth + 8);
    const right = Math.min(935 - halfWidth, segmentRight - halfWidth - 8);
    if (left > right)
      return Math.max(65 + halfWidth, Math.min(935 - halfWidth, ideal));

    const candidates = [ideal, left, right];
    for (let x = left; x <= right; x += 12) candidates.push(x);
    const labelTop = geometry.lane - 25;
    const labelBottom = geometry.lane - 3;
    return candidates
      .filter((x) => x >= left && x <= right)
      .sort((a, b) => {
        const score = (x: number) => {
          const crossings = verticalWireSegments.filter(
            (segment) =>
              segment.x >= x - halfWidth - 7 &&
              segment.x <= x + halfWidth + 7 &&
              segment.top <= labelBottom &&
              segment.bottom >= labelTop,
          ).length;
          return crossings * 10000 + Math.abs(x - ideal);
        };
        return score(a) - score(b);
      })[0];
  };
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 1000 ${height}`}
      className="diagram-svg"
      role="img"
      aria-label={`${project.name} wiring diagram`}
    >
      <style>{`.paper{fill:#fff;stroke:#cbd5e1;stroke-width:2}.housing{fill:#f3f4f6;stroke:#1f2937;stroke-width:3}.housing-detail,.latch{fill:#e5e7eb;stroke:#1f2937;stroke-width:2}.cavity{fill:#fff;stroke:#334155;stroke-width:2}.leader{fill:none;stroke:#9ca3af;stroke-width:1}.port{fill:#334155}.ref-title{font:800 10px system-ui;fill:#64748b;letter-spacing:1px}.family-title{font:700 13px system-ui;fill:#111827}.part{font:600 8px ui-monospace;fill:#475569}.pin{font:700 9px ui-monospace;fill:#111827}.view{font:600 7px system-ui;fill:#475569;letter-spacing:.45px}.wire-label{font:650 11px system-ui;fill:#111827}.label-box{fill:#fff;stroke:#cbd5e1;stroke-width:1}.branch{fill:#fff;stroke:#475569;stroke-width:2}`}</style>
      <rect
        x="10"
        y="10"
        width="980"
        height={height - 20}
        rx="3"
        className="paper"
      />
      <text
        x="500"
        y="28"
        textAnchor="middle"
        style={{ font: "700 19px system-ui", fill: "#111827" }}
      >
        {project.name}
      </text>
      {project.connectors.map((_, index) => (
        <ConnectorGraphic
          key={project.connectors[index].id}
          project={project}
          index={index}
        />
      ))}
      {project.wires.map((wire, index) => {
        const geometry = wireGeometry[index];
        if (!geometry) return null;
        const outlineColor = ["#ffffff", "#fefefe", "#ffff00"].includes(
          wire.color.toLowerCase(),
        )
          ? "#475569"
          : "#ffffff";
        return (
          <g key={wire.id} data-wire={wire.id}>
            <path
              d={geometry.path}
              fill="none"
              stroke={outlineColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="wire-outline"
            />
            <path
              d={geometry.path}
              fill="none"
              stroke={wire.color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {wire.stripeColor && (
              <path
                d={geometry.path}
                fill="none"
                stroke={wire.stripeColor}
                strokeWidth="1.5"
                strokeDasharray="10 7"
              />
            )}
          </g>
        );
      })}
      <g id="wire-label-layer">
        {project.wires.map((wire, index) => {
          const geometry = wireGeometry[index];
          if (!geometry) return null;
          const label = [
            project.layout.showLabels && wire.label,
            project.layout.showGauge && `${wire.awg} AWG`,
            project.layout.showLength && `${wire.lengthMm} mm`,
            !geometry.destination && "UNCONNECTED",
          ]
            .filter(Boolean)
            .join(" · ");
          if (!label) return null;
          const labelWidth = Math.max(
            92,
            Math.min(280, label.length * 6.4 + 18),
          );
          const labelX = placeLabel(geometry, labelWidth);
          const labelY = geometry.lane - 10;
          const underlineOutline = ["#ffffff", "#fefefe", "#ffff00"].includes(
            wire.color.toLowerCase(),
          )
            ? "#475569"
            : "#ffffff";
          return (
            <g key={`label-${wire.id}`}>
              <rect
                x={labelX - labelWidth / 2}
                y={labelY - 15}
                width={labelWidth}
                height="22"
                rx="3"
                className="label-box"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                className="wire-label"
              >
                {label}
              </text>
              <line
                x1={labelX - labelWidth / 2 + 8}
                x2={labelX + labelWidth / 2 - 8}
                y1={labelY + 4}
                y2={labelY + 4}
                stroke={underlineOutline}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1={labelX - labelWidth / 2 + 8}
                x2={labelX + labelWidth / 2 - 8}
                y1={labelY + 4}
                y2={labelY + 4}
                stroke={wire.color}
                strokeWidth="2"
                strokeLinecap="round"
                className="wire-label-underline"
              />
            </g>
          );
        })}
      </g>
      <text x="500" y={height - 32} textAnchor="middle" className="view">
        PIN NUMBERS ARE CAVITY NUMBERS · CONFIRM HOUSING PART, VIEW AND LATCH
        ORIENTATION BEFORE ASSEMBLY
      </text>
    </svg>
  );
}

export function svgString(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", "2000");
  clone.setAttribute("height", String(2 * (svg.viewBox.baseVal.height || 700)));
  return new XMLSerializer().serializeToString(clone);
}
