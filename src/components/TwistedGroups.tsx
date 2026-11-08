import { X } from "lucide-react";
import { HarnessProject } from "@/domain/model";
import { Twist } from "@/domain/twists";

// Twists are assigned per wire in the wire table; this panel names them and
// sets the lay length.
export function TwistedGroups({
  project,
  update,
}: {
  project: HarnessProject;
  update: (fn: (project: HarnessProject) => HarnessProject) => void;
}) {
  const twists = project.twists ?? [];
  if (!twists.length) return null;
  const setTwist = (id: string, change: (twist: Twist) => Twist) =>
    update((x) => ({
      ...x,
      twists: (x.twists ?? []).map((t) => (t.id === id ? change(t) : t)),
    }));
  return (
    <div className="twists" aria-label="Twisted wire groups">
      <b className="twists-head">TWISTED GROUPS</b>
      {twists.map((twist) => {
        const members = project.wires.flatMap((wire, index) =>
          twist.wireIds.includes(wire.id)
            ? [`W${index + 1}${wire.label ? ` ${wire.label}` : ""}`]
            : [],
        );
        return (
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
            <span className="twist-wires">
              {members.join(" + ")}
              {members.length < 2 && (
                <em>
                  {" "}
                  Pick {twist.label || "this twist"} on another wire to finish
                  it.
                </em>
              )}
            </span>
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
        );
      })}
    </div>
  );
}
