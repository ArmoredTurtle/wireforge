import { standardDisplayKeys } from "@/domain/mode";
import type { HarnessProject } from "@/domain/model";

type Layout = HarnessProject["layout"];
type OptionKey = Exclude<
  keyof Layout,
  "showConnectorNames" | "showNotes" | "assemblyDrawing" | "mode"
>;
type View = "schematic" | "assembly";

type Option = {
  key: OptionKey;
  label: string;
  // Views in which the option has no visible effect.
  ignoredIn?: View;
};

const optionGroups: ReadonlyArray<{
  title: string;
  options: ReadonlyArray<Option>;
}> = [
  {
    title: "Wires",
    options: [
      { key: "showLabels", label: "Signal labels" },
      { key: "showGauge", label: "Wire gauge", ignoredIn: "assembly" },
      { key: "showLength", label: "Wire length" },
    ],
  },
  {
    title: "Connectors",
    options: [
      { key: "showPinNumbers", label: "Pin numbers" },
      { key: "showConnectorReferences", label: "Connector references" },
      { key: "showConnectorFamily", label: "Connector family" },
      { key: "showConnectorPartNumber", label: "Part numbers" },
      { key: "showConnectorPitch", label: "Connector pitch" },
    ],
  },
  {
    title: "Orientation",
    options: [
      { key: "showView", label: "Viewing side" },
      {
        key: "showLatchOrientation",
        label: "Latch / key direction",
        ignoredIn: "assembly",
      },
    ],
  },
];

const viewLabels: ReadonlyArray<readonly [View, string]> = [
  ["schematic", "Schematic"],
  ["assembly", "Assembly drawing"],
];

export function ViewSwitcher({
  assemblyDrawing,
  onChange,
}: {
  assemblyDrawing: boolean;
  onChange: (assemblyDrawing: boolean) => void;
}) {
  const current: View = assemblyDrawing ? "assembly" : "schematic";
  return (
    <div className="view-switcher" role="radiogroup" aria-label="Diagram view">
      {viewLabels.map(([view, label]) => (
        <button
          key={view}
          type="button"
          role="radio"
          aria-checked={current === view}
          className={current === view ? "active" : undefined}
          onClick={() => onChange(view === "assembly")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function DiagramSettings({
  layout,
  onChange,
  advanced,
}: {
  advanced: boolean;
  layout: Layout;
  onChange: (key: OptionKey, enabled: boolean) => void;
}) {
  const view: View = layout.assemblyDrawing ? "assembly" : "schematic";
  const groups = optionGroups.map((group) => ({
    ...group,
    options: group.options.filter((option) => advanced || standardDisplayKeys.some((key) => key === option.key)),
  })).filter((group) => group.options.length > 0);
  const allKeys = groups.flatMap((group) => group.options);
  const hiddenTable = advanced && !layout.showWiringTable ? 1 : 0;
  const hidden = allKeys.filter((option) => !layout[option.key]).length + hiddenTable;
  return (
    <details className="options" open aria-label="Diagram display options">
      <summary>
        <b>Customize what&apos;s shown</b>
        <span>
          {hidden ? `${hidden} of ${allKeys.length + (advanced ? 1 : 0)} hidden` : "Everything shown"}
        </span>
      </summary>
      <div className="options-groups">
        {groups.map((group) => (
          <fieldset key={group.title}>
            <legend>{group.title}</legend>
            {group.options.map(({ key, label, ignoredIn }) => {
              const ignored = ignoredIn === view;
              return (
                <label key={key} className={ignored ? "ignored" : undefined}>
                  <input
                    type="checkbox"
                    checked={layout[key]}
                    disabled={ignored}
                    onChange={(event) => onChange(key, event.target.checked)}
                  />
                  {label}
                  {ignored && <em>schematic only</em>}
                </label>
              );
            })}
          </fieldset>
        ))}
        {advanced && <fieldset>
          <legend>Table</legend>
          <label>
            <input
              type="checkbox"
              checked={layout.showWiringTable}
              onChange={(event) =>
                onChange("showWiringTable", event.target.checked)
              }
            />
            Wiring table
          </label>
        </fieldset>}
      </div>
    </details>
  );
}
