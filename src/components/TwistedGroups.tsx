import { Plus, X } from "lucide-react";
import { HarnessProject, uid } from "@/domain/model";

type Twist = NonNullable<HarnessProject["twists"]>[number];

export function TwistedGroups({
  project,
  update,
}: {
  project: HarnessProject;
  update: (fn: (project: HarnessProject) => HarnessProject) => void;
}) {
  const twists = project.twists ?? [];
  const setTwist = (id: string, change: (twist: Twist) => Twist) =>
    update((x) => ({
      ...x,
      twists: (x.twists ?? []).map((t) => (t.id === id ? change(t) : t)),
    }));
  return (
    <div className="twists" aria-label="Twisted wire groups">
      <div className="twists-head">
        <b>TWISTED GROUPS</b>
        <button
          onClick={() =>
            update((x) => ({
              ...x,
              twists: [
                ...(x.twists ?? []),
                {
                  id: uid("twist"),
                  label: `TP${(x.twists?.length ?? 0) + 1}`,
                  wireIds: [],
                },
              ],
            }))
          }
        >
          <Plus />
          Add twisted group
        </button>
      </div>
      {twists.map((twist) => (
        <div className="twist-row" key={twist.id}>
          <input
            aria-label={`Twisted group ${twist.label} name`}
            value={twist.label}
            maxLength={32}
            onChange={(e) =>
              setTwist(twist.id, (t) => ({ ...t, label: e.target.value }))
            }
          />
          <label className="twist-lay">
            Lay
            <input
              type="number"
              min="1"
              aria-label={`Twisted group ${twist.label} lay length`}
              value={twist.layMm ?? ""}
              placeholder="—"
              onChange={(e) =>
                setTwist(twist.id, (t) => ({
                  ...t,
                  layMm: +e.target.value > 0 ? +e.target.value : undefined,
                }))
              }
            />
            mm
          </label>
          <div className="twist-wires">
            {project.wires.map((wire, index) => (
              <label key={wire.id}>
                <input
                  type="checkbox"
                  checked={twist.wireIds.includes(wire.id)}
                  onChange={(e) =>
                    update((x) => ({
                      ...x,
                      twists: (x.twists ?? []).map((t) =>
                        t.id === twist.id
                          ? {
                              ...t,
                              wireIds: e.target.checked
                                ? [...t.wireIds, wire.id]
                                : t.wireIds.filter((id) => id !== wire.id),
                            }
                          : // A wire twists with one group at a time.
                            {
                              ...t,
                              wireIds: e.target.checked
                                ? t.wireIds.filter((id) => id !== wire.id)
                                : t.wireIds,
                            },
                      ),
                    }))
                  }
                />
                W{index + 1} {wire.label}
              </label>
            ))}
          </div>
          <button
            aria-label={`Remove twisted group ${twist.label}`}
            onClick={() =>
              update((x) => ({
                ...x,
                twists: (x.twists ?? []).filter((t) => t.id !== twist.id),
              }))
            }
          >
            <X />
          </button>
        </div>
      ))}
    </div>
  );
}
