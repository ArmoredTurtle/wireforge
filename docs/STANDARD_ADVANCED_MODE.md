# WireForge Standard and Advanced mode specification

Status: Final specification.

WireForge will open in Standard mode for first-time users, keeping connector and wire entry, a clean drawing, and every existing import and export option easy to reach. Advanced mode adds specialist editing controls.

**Core rule: mode changes which controls are available, never the drawing or export generated from the same project data.** Changing an actual display setting still changes the drawing and its SVG/PNG exports in either mode.

# Controls in each mode

Advanced includes every Standard control.

| Area | Standard | Additional controls in Advanced |
| --- | --- | --- |
| Header | Theme, New, Save, Saved projects, Clear, Undo, Redo, Standard / Advanced selector | Same controls |
| Project | Project name | Same controls |
| Connectors | Reference, family, variant, View (mating / wire-entry), read-only metadata, add, delete, swap | Drawn from Top/Bottom where supported |
| Wires | Source, label, named-color dropdown, gauge, length, destination, reorder, branch, remove, add | Free-form color picker; TWIST column, including New twist |
| Twisted groups | Existing groups remain drawn and exported | Group name, lay length, membership through the wire column, remove |
| Sleeving | Existing sleeves remain drawn and exported | Full sleeving panel |
| Preview | Schematic / Assembly drawing switcher, validation, summary of advanced settings when applicable | Same preview and validation |
| Customize | Signal labels, wire gauge, wire length, pin numbers | Connector references, connector family, part numbers, connector pitch, viewing side, latch/key direction, wiring table |
| Import and export | SVG, PNG, TOML, JSON, CableBuilder menu including Send to CableBuilder and Import URL, and file import | Same options |

The named-color dropdown remains in Standard because color names help communication across languages. It edits the same wire color value as the Advanced picker. Switching modes must preserve custom colors, including colors that have no named-dropdown match.

Connector View stays in Standard because mating-face versus wire-entry changes pin orientation. Drawn from remains Advanced and retains its existing capability restrictions, including no bottom drawing for unsupported stacked or multi-row connectors.

The entire sleeving panel is Advanced: add/remove, name, type catalog, color, tracer color, size, shrink ratio, wrap style, end finish, start offset, length, part number, wire membership, and the typical-temperature note.

There is one Customize panel. Standard shows its four common switches; Advanced adds the other seven. The inspected display-options implementation has **11 checkboxes**, including the wiring table. Controls that have no effect in Assembly view retain their existing disabled state and “schematic only” explanation.

# Mode selection and persistence

Place a two-option segmented control, **Standard | Advanced**, in the header next to the theme selector. It controls editing across both columns and exposes its selected state to assistive technology. It must support keyboard operation and visible focus.

There are two persistence layers:

1. Browser preference: localStorage key `wireforge-mode`, with values `standard` or `advanced`. Missing or invalid stored values fall back to Standard.

2. Optional project override: `layout.mode?: "standard" | "advanced"`. When present, this takes precedence over the browser preference.

Effective mode is the project override, otherwise the browser preference, otherwise Standard.

Add a nearby, clearly labeled **Remember mode for this project** checkbox, available in both modes. This is the explicit pin action; the mode selector alone must not silently introduce a project override.

| User action | Browser preference | Project override |
| --- | --- | --- |
| Change mode on an unpinned project | Set selected mode | Remains absent |
| Enable Remember mode for this project | Unchanged | Set current effective mode |
| Change mode on a pinned project | Set selected mode | Set selected mode |
| Disable Remember mode for this project | Unchanged | Remove; browser preference applies |

Changing the browser preference alone is an app preference change and must not mark the project dirty or create a project undo entry. Pinning, unpinning, and changing a pinned override are project edits and follow existing dirty-state and undo/redo behavior.

New projects have no override and inherit the browser preference. Save/open and JSON/TOML export/import preserve an explicit override and preserve its absence when unpinned.

Opening a project honors an explicit override but never changes the browser preference. Advanced content by itself must never trigger a mode change. This is the distinction between honoring a user-pinned mode and automatically switching based on project contents.

Render Standard on the server and on the first client render. Apply the browser preference after hydration through an effect. If a loaded project has an override, use that override rather than overwriting it with the stored browser preference.

Wrap storage reads and writes in try/catch. If storage is blocked, the app remains usable and mode changes work for the current session.

# Project data and drawing behavior

Adding `layout.mode` is an additive project schema change. It is optional and has no schema default, so parsing an old project does not create a pin. Update project validation, types, normalization, and serializers as needed to preserve it.

Existing projects without the field continue to load. Treat an invalid explicit project mode as a validation error through the normal import flow; invalid browser preferences simply fall back to Standard. Confirm the project's existing format-version policy during implementation rather than assuming that “no schema change” applies.

Mode is never a rendering condition. Do not pass effective mode to DiagramSvg, wiring-table construction, or exporters to decide what to include. The UI may read `layout.mode` to resolve its preference, but rendering ignores that field.

Switching modes must not mutate twists, sleeves, connector orientation, wire colors, or display flags. Existing data remains drawn and exported according to the project's display settings. A pinned-mode edit may change serialized project metadata; it must not change the rendered SVG or PNG.

New projects show the wiring table by default. Standard does not force the table on for an existing project whose saved setting disables it. Entering Standard also does not reset any other display choice.

The Schematic / Assembly drawing selection remains project data. Switching that view is independent of mode.

# Summary of advanced settings

In Standard, show a compact read-only strip above the preview whenever the project contains advanced content or has information disabled through an Advanced display switch. Do not show a modal.

Example: **Advanced settings in use: 2 twisted groups, 1 sleeve, 3 display options hidden.**

Include only nonzero counts. Count twist groups and sleeves from their project arrays. Count hidden display options from these seven flags whose resolved values are false:

- `showConnectorReferences`

- `showConnectorFamily`

- `showConnectorPartNumber`

- `showConnectorPitch`

- `showView`

- `showLatchOrientation`

- `showWiringTable`

Count saved disabled flags even if the current diagram view ignores a flag. Do not count disabled common Standard switches, legacy `showConnectorNames`, `showNotes`, or the view selection.

Also report connectors using a bottom drawing view and wires using colors outside the named palette, so their hidden editing controls remain discoverable. These are summaries of existing settings, not reasons to change them.

Provide **Edit in Advanced**, which uses the same mode-change behavior as the header selector.

When at least one of the seven Advanced display flags is false, also provide **Show everything**. This explicitly sets those seven flags to true as one undoable project edit. Keep the four Standard switches, legacy flags, selected diagram view, mode preference, wire colors, orientation, twists, and sleeves unchanged. Explain the action beside the control: “Restores all Advanced display options; keeps your common display choices.”

Show everything is an intentional project display edit and may change the drawing and its exports. It is separate from switching modes.

# Export requirements

All existing import and export entry points remain available in Standard. Existing format restrictions and validation remain in place.

SVG and PNG use the same drawing as the preview. For otherwise identical projects, changing effective mode or only the optional mode metadata must produce the same SVG and PNG. Existing twists, sleeves, wiring tables, and supported bottom views remain present according to the project data.

JSON and TOML remain the complete project-transfer paths and must preserve advanced content and an explicitly pinned mode. Do not claim that CableBuilder carries the whole WireForge project. Its handling of twists and sleeves is a separate integration concern; checking its API guides remains deferred and does not block this toggle.

# Implementation scope

Implement a shared mode hook or context, the header selector and explicit pin control, conditional visibility for Advanced controls, the summary strip, and optional project-mode persistence. Advanced-only wrappers are an implementation option, not a requirement.

When the TWIST column is hidden, collapse the wire-row grid and its heading together. Hidden controls must not leave empty columns or keyboard-focusable elements behind.

Keep existing feature work separate from the mode toggle. Land the toggle after the wiring-table, twisted-groups, cable-sleeving, and display-options work is integrated. The original branch inspection found the last three were siblings from the wiring-table tip and shared edits to WireforgeApp.tsx; integration may need conflict resolution. This sequencing is guidance, not a dependency on particular PR numbers or assumed current GitHub status.

Merging or publishing the implementation is a separate step.

# Acceptance criteria

- First use is Standard. An unpinned selection survives reload when storage is available. Blocked storage does not break startup or session changes.

- Header selection, keyboard interaction, and the project pin controls implement the precedence and action table above.

- Old project files load without gaining an override. Save/open and JSON/TOML round trips preserve present and absent overrides.

- New/Open/Import resolve mode from the loaded project's override or browser preference; advanced content alone never changes mode.

- Browser-only mode changes leave project data, dirty state, and undo history unchanged. Explicit project-mode changes use the existing project history.

- Standard shows exactly its specified controls; Advanced adds the specialist controls. All export/import actions stay available.

- Wire rows have no empty TWIST column in Standard, and custom colors survive mode changes.

- Existing advanced content and hidden Advanced display settings produce accurate summary counts. Edit in Advanced follows selector semantics.

- Show everything restores exactly the seven Advanced display flags in one undoable edit and updates the summary.

- A fixture containing twists, sleeves, and a supported bottom view produces byte-identical SVG across both effective modes and across otherwise identical projects with different mode metadata.

- PNGs from that fixture are identical under the same browser, rasterization settings, and fonts; if encoded PNG metadata varies, compare decoded dimensions and pixels.

- Cover toggle behavior, storage failure, hydration, pin precedence, summary actions, and project persistence with focused tests. Run the existing suite and required project checks without weakening existing assertions.

All product choices in this specification are resolved. CableBuilder feature coverage remains a deferred integration check.

