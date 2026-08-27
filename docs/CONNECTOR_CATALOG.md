# Contributing connector definitions

Wireforge keeps connector identity and manufacturing data separate from the
editor. Most connector contributions are therefore small TypeScript catalog
modules rather than new UI components. A good definition should let a reviewer
answer three questions without guessing:

1. Exactly which housing or termination is this?
2. How are its electrical cavities numbered from each viewing side?
3. Which official source, or which explicit generic assumptions, support it?

## Where connector definitions live

Create one module for the vendor, series, or closely related family under:

```text
src/connectors/catalog/<vendor-or-family>.ts
```

For example, a Deutsch DT contribution could use
`src/connectors/catalog/deutsch-dt.ts`. Export a
`ConnectorDefinition[]`, then import and add that array to `catalogs` in
`src/connectors/registry.ts`. Do not place catalog records directly in a React
component or in the registry.

The shared data types and supported renderer names are defined in
`src/connectors/types.ts`. Existing catalog files are the best reference for
the current data shape and naming conventions.

## Using `defineFamily()`

Use `defineFamily()` when the variants have the same manufacturer, series,
pitch, row layout, wire range, latch, polarization, renderer, and source, and
only the cavity count and part number change:

```ts
import { defineFamily } from "../types";

export const exampleConnectors = defineFamily({
  manufacturer: "Example Connector Co.",
  family: "Example Locking Series",
  series: "ELS",
  pins: [2, 3, 4, 6],
  part: (pins) => `ELS-${pins}P-HSG`,
  pitchMm: 3.0,
  rows: 1,
  allowedAwg: [18, 24],
  renderer: "single",
  datasheetUrl: "https://manufacturer.example/els-drawing.pdf",
  sourceDocument: "ELS housing drawing, revision C",
  sourceStatus: "manufacturer-verified",
  latch: "positive",
  polarized: true,
});
```

`defineFamily()` creates a stable ID, display name, pin count, and housing part
number for each value in `pins`. Review the generated ID convention in
`src/connectors/types.ts` before relying on it in tests or project files.

If variants differ in any manufacturing property, export explicit
`ConnectorDefinition` objects instead. Do not force unlike plug and receptacle
parts, mixed pitches, different row layouts, or different wire ranges into one
template merely because they share a marketing family name.

## Registering the catalog

Import the new array in `src/connectors/registry.ts` and add it to `catalogs`:

```ts
import { exampleConnectors } from "./catalog/example";

const catalogs: ConnectorDefinition[][] = [
  // Existing catalogs...
  exampleConnectors,
];
```

Registration makes the definitions available to the builder family and variant
selectors. Keep the registration change small so reviewers can distinguish it
from the actual connector data.

## Required manufacturing information

Every selectable variant must provide:

- A stable, unique `id`
- `manufacturer`, `family`, and `series`
- An exact `housingPartNumber`, or a clearly documented generic identifier
- `pitchMm`, using `null` when pitch does not apply
- `pinCount` and `rows`
- The supported `allowedAwg` range
- The appropriate `renderer`
- `latch` behavior and whether the part is `polarized`
- `sourceStatus`
- An official `datasheetUrl` for manufacturer-verified records
- A useful `sourceDocument` description when revision or drawing identity matters

The housing part number should identify the physical housing or termination
shown in Wireforge. It should not be a terminal contact number, mating half,
informal nickname, or distributor stock number unless the definition explicitly
represents that item. When a complete assembly requires a housing, contact,
wedge lock, seal, or backshell, document the housing accurately and avoid
implying that the definition is a complete bill of materials.

## Manufacturer-verified versus generic

Use `sourceStatus: "manufacturer-verified"` only when an official manufacturer
drawing or datasheet supports the definition. Include the official URL and,
where useful, the document name, drawing number, and revision. A distributor
page may help locate a document, but it is not a substitute for the controlled
manufacturer source.

Use `sourceStatus: "generic"` when the definition describes a convention or an
uncontrolled class of parts. Examples include DuPont-style housings, generic
male and female spades, open-spade/U-terminals, ferrules, and ring lugs. Product
photos, marketplace listings, community pinouts, and measurements from an
unidentified sample must not be labeled manufacturer verified.

Generic definitions should state the physical dimension the builder must
confirm. Depending on the termination, that may include:

- Male or female spade tab width and thickness
- Ring or U-terminal stud and fork size
- Ferrule conductor capacity, sleeve size, and pin length
- Housing pitch and mating compatibility

Visual similarity is not evidence that two terminals mate safely.

## Pin numbering and viewing side

Pin numbers are stable electrical cavity identities. They must not change when
the drawing changes from the mating face to the wire-entry side. `pinMap()` may
mirror graphical column positions for the selected view, but it must preserve
the same pin values.

Before encoding a multi-pin connector, confirm from the source:

- Whether the drawing shows the mating face or wire-entry side
- The location of circuit or cavity 1
- Row order and numbering direction
- Latch, key, or polarization feature orientation
- Skipped, blocked, asymmetrical, or keyed cavity positions
- Whether plug and receptacle drawings use different apparent orientations

Wireforge drawings assume latch/key up when that annotation is enabled. If the
existing row-and-column model cannot represent a connector's real cavity map,
do not approximate it silently. Explain the limitation and extend the model and
tests as part of the contribution.

## Choosing or adding a renderer

Choose the closest supported renderer from `src/connectors/types.ts`. Existing
renderers cover common single-row, dual-row, keyed JST/Molex-style,
DuPont-style, screw-terminal, ring-terminal, spade, U-terminal, and ferrule
drawings.

Add a new renderer only when reusing an existing one would hide or misrepresent
an assembly-critical feature. A new renderer requires all of the following:

1. Add its name to the `ConnectorDefinition["renderer"]` union.
2. Add an original SVG representation in `src/diagram/render.tsx`.
3. Preserve correct wire endpoint anchoring.
4. Add renderer tests for its label, warnings, and distinctive geometry.
5. Verify that other renderer types are unchanged.

Do not commit copied manufacturer artwork, traced product photographs, or
screenshots from datasheets. Store factual identity and layout data, link to the
source, and render an original technical line drawing.

## Tests

Add focused coverage for the new catalog in the existing domain, renderer, or
component test files. At minimum, verify:

- Stable IDs and exact housing part numbers
- Pin counts and row layouts
- Supported wire-gauge ranges
- Source status and official URLs
- Separate plug/receptacle identities where applicable
- Mating-face versus wire-entry placement for multi-row or keyed parts
- Presence in the builder family and variant selectors
- Distinctive SVG output when introducing a renderer

Tests should catch a wrong part number, mirrored numbering, or misleading
source claim—not merely prove that TypeScript can import the array.

Run the complete local gate before opening a pull request:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## Submission checklist

- [ ] The catalog file is named for a clear vendor or family scope.
- [ ] Every definition has a stable ID and exact physical part identity.
- [ ] Official sources are linked for all manufacturer-verified records.
- [ ] Generic records clearly identify dimensions the builder must verify.
- [ ] Pin 1, row order, viewing side, and latch/key orientation were checked.
- [ ] Plug and receptacle parts are separated when their identities differ.
- [ ] The closest accurate existing renderer is used, or a new one is tested.
- [ ] The catalog is registered in `src/connectors/registry.ts`.
- [ ] The family and variants appear correctly in the builder.
- [ ] Tests, type checking, linting, build, and `git diff --check` pass locally.
