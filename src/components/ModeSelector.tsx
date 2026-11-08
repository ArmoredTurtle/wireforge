import type { EditingMode } from "@/domain/mode";

export function ModeSelector({ mode, pinned, onChange, onPinChange }: {
  mode: EditingMode;
  pinned: boolean;
  onChange: (mode: EditingMode) => void;
  onPinChange: (pinned: boolean) => void;
}) {
  return (
    <div className="mode-picker">
      <fieldset className="mode-options">
        <legend>Editing mode</legend>
        {(["standard", "advanced"] as const).map((value) => (
          <label key={value}>
            <input type="radio" name="editing-mode" value={value}
              checked={mode === value} onChange={() => onChange(value)} />
            <span>{value === "standard" ? "Standard" : "Advanced"}</span>
          </label>
        ))}
      </fieldset>
      <label className="mode-pin">
        <input type="checkbox" checked={pinned}
          onChange={(event) => onPinChange(event.target.checked)} />
        Remember mode for this project
      </label>
    </div>
  );
}
