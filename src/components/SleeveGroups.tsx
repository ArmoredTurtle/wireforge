import { Plus, X } from "lucide-react";
import { HarnessProject, uid } from "@/domain/model";
import { wireColors } from "@/config/wire-colors";
import {
  EndFinish,
  endFinishes,
  endFinishNames,
  SleeveFamily,
  sleeveFamilyNames,
  sleeveSizingNames,
  SleeveTypeId,
  sleeveTypeIds,
  sleeveTypes,
  WrapStyle,
  wrapStyleNames,
  wrapStyles,
} from "@/config/sleeving";

type Sleeve = NonNullable<HarnessProject["sleeves"]>[number];

// Blank or non-positive entries clear an optional measurement.
const optionalMm = (value: string, allowZero = false) => {
  const mm = +value;
  return value !== "" && (allowZero ? mm >= 0 : mm > 0) ? mm : undefined;
};

const families = Object.keys(sleeveFamilyNames) as SleeveFamily[];

// Switching type drops options the new type has no use for and picks its
// first shrink ratio and a half-lap wrap where those apply.
const retype = (sleeve: Sleeve, typeId: SleeveTypeId): Sleeve => {
  const type = sleeveTypes[typeId];
  return {
    ...sleeve,
    type: typeId,
    shrinkRatio: type.shrinkRatios
      ? type.shrinkRatios.includes(sleeve.shrinkRatio ?? "")
        ? sleeve.shrinkRatio
        : type.shrinkRatios[0]
      : undefined,
    wrapStyle: type.wrapped ? (sleeve.wrapStyle ?? "half-lap") : undefined,
    endFinish: type.finishEnds ? sleeve.endFinish : undefined,
  };
};

export function SleeveGroups({
  project,
  update,
}: {
  project: HarnessProject;
  update: (fn: (project: HarnessProject) => HarnessProject) => void;
}) {
  const sleeves = project.sleeves ?? [];
  const setSleeve = (id: string, change: (sleeve: Sleeve) => Sleeve) =>
    update((x) => ({
      ...x,
      sleeves: (x.sleeves ?? []).map((s) => (s.id === id ? change(s) : s)),
    }));
  return (
    <div className="sleeves" aria-label="Cable sleeving">
      <div className="sleeves-head">
        <b>SLEEVING</b>
        <button
          onClick={() =>
            update((x) => ({
              ...x,
              sleeves: [
                ...(x.sleeves ?? []),
                {
                  id: uid("sleeve"),
                  label: `S${(x.sleeves?.length ?? 0) + 1}`,
                  type: "braided-pet",
                  color: "#18181b",
                  wireIds: x.wires.map((w) => w.id),
                },
              ],
            }))
          }
        >
          <Plus />
          Add sleeve
        </button>
      </div>
      {sleeves.length > 0 && (
        <p className="sleeve-note" role="note">
          Temperatures are typical values for each type of sleeve, not
          datasheet ratings. Check the datasheet for the part you use and
          record its part number.
        </p>
      )}
      {sleeves.map((sleeve) => {
        const type = sleeveTypes[sleeve.type];
        const name = `Sleeve ${sleeve.label}`;
        return (
          <div className="sleeve-row" key={sleeve.id}>
            <input
              aria-label={`${name} name`}
              value={sleeve.label}
              maxLength={32}
              onChange={(e) =>
                setSleeve(sleeve.id, (s) => ({ ...s, label: e.target.value }))
              }
            />
            <select
              aria-label={`${name} type`}
              value={sleeve.type}
              onChange={(e) =>
                setSleeve(sleeve.id, (s) =>
                  retype(s, e.target.value as SleeveTypeId),
                )
              }
            >
              {families.map((family) => (
                <optgroup key={family} label={sleeveFamilyNames[family]}>
                  {sleeveTypeIds
                    .filter((id) => sleeveTypes[id].family === family)
                    .map((id) => (
                      <option key={id} value={id}>
                        {sleeveTypes[id].name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <label className="sleeve-measure">
              Color
              <select
                aria-label={`${name} color`}
                value={sleeve.color}
                onChange={(e) =>
                  setSleeve(sleeve.id, (s) => ({ ...s, color: e.target.value }))
                }
              >
                {wireColors.map(([colorName, hex]) => (
                  <option key={hex} value={hex}>
                    {colorName}
                  </option>
                ))}
              </select>
            </label>
            <label className="sleeve-measure">
              Tracer
              <select
                aria-label={`${name} tracer color`}
                value={sleeve.tracerColor ?? ""}
                onChange={(e) =>
                  setSleeve(sleeve.id, (s) => ({
                    ...s,
                    tracerColor: e.target.value || undefined,
                  }))
                }
              >
                <option value="">None</option>
                {wireColors.map(([colorName, hex]) => (
                  <option key={hex} value={hex}>
                    {colorName}
                  </option>
                ))}
              </select>
            </label>
            <label className="sleeve-measure">
              {sleeveSizingNames[type.sizing]}
              <input
                type="number"
                min="0.5"
                step="0.5"
                aria-label={`${name} ${sleeveSizingNames[type.sizing]}`}
                value={sleeve.sizeMm ?? ""}
                placeholder="—"
                onChange={(e) =>
                  setSleeve(sleeve.id, (s) => ({
                    ...s,
                    sizeMm: optionalMm(e.target.value),
                  }))
                }
              />
              mm
            </label>
            {type.shrinkRatios && (
              <label className="sleeve-measure">
                Ratio
                <select
                  aria-label={`${name} shrink ratio`}
                  value={sleeve.shrinkRatio ?? type.shrinkRatios[0]}
                  onChange={(e) =>
                    setSleeve(sleeve.id, (s) => ({
                      ...s,
                      shrinkRatio: e.target.value,
                    }))
                  }
                >
                  {type.shrinkRatios.map((ratio) => (
                    <option key={ratio}>{ratio}</option>
                  ))}
                </select>
              </label>
            )}
            {type.wrapped && (
              <label className="sleeve-measure">
                Wrap
                <select
                  aria-label={`${name} wrap style`}
                  value={sleeve.wrapStyle ?? "half-lap"}
                  onChange={(e) =>
                    setSleeve(sleeve.id, (s) => ({
                      ...s,
                      wrapStyle: e.target.value as WrapStyle,
                    }))
                  }
                >
                  {wrapStyles.map((style) => (
                    <option key={style} value={style}>
                      {wrapStyleNames[style]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {type.finishEnds && (
              <label className="sleeve-measure">
                Ends
                <select
                  aria-label={`${name} end finish`}
                  value={sleeve.endFinish ?? ""}
                  onChange={(e) =>
                    setSleeve(sleeve.id, (s) => ({
                      ...s,
                      endFinish: (e.target.value || undefined) as
                        | EndFinish
                        | undefined,
                    }))
                  }
                >
                  <option value="">Not specified</option>
                  {endFinishes.map((finish) => (
                    <option key={finish} value={finish}>
                      {endFinishNames[finish]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="sleeve-measure">
              From
              <input
                type="number"
                min="0"
                aria-label={`${name} start from source end`}
                value={sleeve.startMm ?? ""}
                placeholder="0"
                onChange={(e) =>
                  setSleeve(sleeve.id, (s) => ({
                    ...s,
                    startMm: optionalMm(e.target.value, true),
                  }))
                }
              />
              mm
            </label>
            <label className="sleeve-measure">
              Length
              <input
                type="number"
                min="1"
                aria-label={`${name} length`}
                value={sleeve.lengthMm ?? ""}
                placeholder="full"
                onChange={(e) =>
                  setSleeve(sleeve.id, (s) => ({
                    ...s,
                    lengthMm: optionalMm(e.target.value),
                  }))
                }
              />
              mm
            </label>
            <label className="sleeve-measure">
              P/N
              <input
                className="sleeve-part"
                aria-label={`${name} part number`}
                value={sleeve.partNumber ?? ""}
                maxLength={100}
                placeholder="optional"
                onChange={(e) =>
                  setSleeve(sleeve.id, (s) => ({
                    ...s,
                    partNumber: e.target.value || undefined,
                  }))
                }
              />
            </label>
            <button
              aria-label={`Remove ${name.toLowerCase()}`}
              onClick={() =>
                update((x) => ({
                  ...x,
                  sleeves: (x.sleeves ?? []).filter((s) => s.id !== sleeve.id),
                }))
              }
            >
              <X />
            </button>
            <p className="sleeve-hint">
              {type.construction} · {type.summary}
              {type.maxTempC ? ` Typically up to ${type.maxTempC} °C.` : ""}
            </p>
            <div className="sleeve-wires">
              {project.wires.map((wire, index) => (
                <label key={wire.id}>
                  <input
                    type="checkbox"
                    checked={sleeve.wireIds.includes(wire.id)}
                    onChange={(e) =>
                      setSleeve(sleeve.id, (s) => ({
                        ...s,
                        wireIds: e.target.checked
                          ? [...s.wireIds, wire.id]
                          : s.wireIds.filter((id) => id !== wire.id),
                      }))
                    }
                  />
                  W{index + 1} {wire.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
