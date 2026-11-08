import { Plus, X } from "lucide-react";
import {
  HarnessProject,
  SleeveMaterial,
  sleeveMaterialNames,
  sleeveMaterials,
  uid,
} from "@/domain/model";
import { wireColors } from "@/config/wire-colors";

type Sleeve = NonNullable<HarnessProject["sleeves"]>[number];

// Blank or non-positive entries clear an optional measurement.
const optionalMm = (value: string, allowZero = false) => {
  const mm = +value;
  return value !== "" && (allowZero ? mm >= 0 : mm > 0) ? mm : undefined;
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
                  material: "braided-pet",
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
      {sleeves.map((sleeve) => (
        <div className="sleeve-row" key={sleeve.id}>
          <input
            aria-label={`Sleeve ${sleeve.label} name`}
            value={sleeve.label}
            maxLength={32}
            onChange={(e) =>
              setSleeve(sleeve.id, (s) => ({ ...s, label: e.target.value }))
            }
          />
          <select
            aria-label={`Sleeve ${sleeve.label} material`}
            value={sleeve.material}
            onChange={(e) =>
              setSleeve(sleeve.id, (s) => ({
                ...s,
                material: e.target.value as SleeveMaterial,
              }))
            }
          >
            {sleeveMaterials.map((material) => (
              <option key={material} value={material}>
                {sleeveMaterialNames[material]}
              </option>
            ))}
          </select>
          <select
            aria-label={`Sleeve ${sleeve.label} color`}
            value={sleeve.color}
            onChange={(e) =>
              setSleeve(sleeve.id, (s) => ({ ...s, color: e.target.value }))
            }
          >
            {wireColors.map(([name, hex]) => (
              <option key={hex} value={hex}>
                {name}
              </option>
            ))}
          </select>
          <label className="sleeve-measure">
            Ø
            <input
              type="number"
              min="0.5"
              step="0.5"
              aria-label={`Sleeve ${sleeve.label} diameter`}
              value={sleeve.diameterMm ?? ""}
              placeholder="—"
              onChange={(e) =>
                setSleeve(sleeve.id, (s) => ({
                  ...s,
                  diameterMm: optionalMm(e.target.value),
                }))
              }
            />
            mm
          </label>
          <label className="sleeve-measure">
            From
            <input
              type="number"
              min="0"
              aria-label={`Sleeve ${sleeve.label} start from source end`}
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
              aria-label={`Sleeve ${sleeve.label} length`}
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
          <button
            aria-label={`Remove sleeve ${sleeve.label}`}
            onClick={() =>
              update((x) => ({
                ...x,
                sleeves: (x.sleeves ?? []).filter((s) => s.id !== sleeve.id),
              }))
            }
          >
            <X />
          </button>
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
      ))}
    </div>
  );
}
