import type { HarnessProject } from "@/domain/model";

type Layout = HarnessProject["layout"];
type VisibleLayoutKey = Exclude<
  keyof Layout,
  "showConnectorNames" | "showNotes"
>;

const displayOptions: ReadonlyArray<readonly [VisibleLayoutKey, string]> = [
  ["showPinNumbers", "Pin numbers"],
  ["showLabels", "Signal labels"],
  ["showGauge", "Wire gauge"],
  ["showLength", "Wire length"],
  ["showConnectorReferences", "Connector references"],
  ["showConnectorFamily", "Connector family"],
  ["showConnectorPartNumber", "Part numbers"],
  ["showConnectorPitch", "Connector pitch"],
  ["showView", "Viewing side"],
  ["showLatchOrientation", "Latch / key direction"],
];

export function DiagramSettings({
  layout,
  onChange,
}: {
  layout: Layout;
  onChange: (key: VisibleLayoutKey, enabled: boolean) => void;
}) {
  return (
    <div className="options" aria-label="Diagram display options">
      {displayOptions.map(([key, label]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={layout[key]}
            onChange={(event) => onChange(key, event.target.checked)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
