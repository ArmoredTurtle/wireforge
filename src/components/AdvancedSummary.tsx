import type { HarnessProject } from "@/domain/model";
import { drawnFromBottom } from "@/domain/model";
import { advancedDisplayKeys } from "@/domain/mode";
import { getDefinition } from "@/domain/connectors";
import { wireColors } from "@/config/wire-colors";

export function AdvancedSummary({ project, onEdit, onShowEverything }: {
  project: HarnessProject;
  onEdit: () => void;
  onShowEverything: () => void;
}) {
  const hidden = advancedDisplayKeys.filter((key) => project.layout[key] === false).length;
  const bottom = project.connectors.filter((connector) => {
    const definition = getDefinition(connector.definitionId);
    return definition && drawnFromBottom(connector, definition);
  }).length;
  const customColors = project.wires.filter((wire) =>
    !wireColors.some(([, color]) => color.toLowerCase() === wire.color.toLowerCase()),
  ).length;
  const items = [
    [(project.twists ?? []).length, "twisted group", "twisted groups"],
    [(project.sleeves ?? []).length, "sleeve", "sleeves"],
    [hidden, "display option hidden", "display options hidden"],
    [bottom, "connector drawn from bottom", "connectors drawn from bottom"],
    [customColors, "wire with a custom color", "wires with custom colors"],
  ] as const;
  const summary = items.filter(([count]) => count > 0)
    .map(([count, singular, plural]) => `${count} ${count === 1 ? singular : plural}`).join(", ");
  if (!summary) return null;

  return (
    <section className="advanced-summary" aria-label="Advanced settings in use">
      <p><strong>Advanced settings in use:</strong> {summary}.</p>
      <div className="advanced-summary-actions">
        <button type="button" onClick={onEdit}>Edit in Advanced</button>
        {hidden > 0 && <button type="button" onClick={onShowEverything}
          aria-describedby="restore-display-description">Show everything</button>}
      </div>
      {hidden > 0 && <small id="restore-display-description">
        Restores all Advanced display options; keeps your common display choices.
      </small>}
    </section>
  );
}
