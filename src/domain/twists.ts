import { HarnessProject, uid } from "./model";

export type Twist = NonNullable<HarnessProject["twists"]>[number];

const nextTwistLabel = (twists: Twist[]) => {
  const used = new Set(twists.map((t) => t.label));
  let n = 1;
  while (used.has(`TP${n}`)) n++;
  return `TP${n}`;
};

// Moves a wire into a twisted group ("new" starts one, "" untwists it). A
// wire twists with one group at a time, and groups left empty are dropped.
export function setWireTwist(
  project: HarnessProject,
  wireId: string,
  twistId: string,
): HarnessProject {
  const existing = project.twists ?? [];
  const twists =
    twistId === "new"
      ? [
          ...existing,
          { id: uid("twist"), label: nextTwistLabel(existing), wireIds: [] },
        ]
      : existing;
  const target = twistId === "new" ? twists[twists.length - 1].id : twistId;
  return {
    ...project,
    twists: twists
      .map((t) => ({
        ...t,
        wireIds:
          t.id === target
            ? [...t.wireIds.filter((id) => id !== wireId), wireId]
            : t.wireIds.filter((id) => id !== wireId),
      }))
      .filter((t) => t.wireIds.length > 0),
  };
}
