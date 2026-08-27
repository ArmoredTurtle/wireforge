# Wireforge

Wireforge is a local-first wire-harness documentation designer from ArmoredTurtle. It turns connector and pin data into clear, manufacturing-oriented wiring diagrams that can be understood and assembled across teams, suppliers, and regions.

**Live application:** [wireforge.armoredturtle.com](https://wireforge.armoredturtle.com)

## Why Wireforge?

Harness documentation often depends on ambiguous sketches, connector nicknames, or pin numbering without a defined viewing direction. Wireforge keeps electrical pin identity separate from drawing orientation and places manufacturing context directly on the exported diagram.

- Build harnesses with two or more connectors.
- Connect any pin to another connector, the same connector, or an unconnected end.
- Represent multiple destinations from one source pin.
- Use datasheet-backed connector families and explicit cavity maps.
- Export deterministic SVG and PNG diagrams, versioned TOML project files, and readable JSON snapshots.
- Save projects locally without accounts, databases, or server uploads.
- Switch between ArmoredTurtle, Forge, Slate, and Light themes.

## Privacy model

Saved projects remain in the user's browser under the `wireforge-projects-v1` local-storage key. Wireforge has no project API, server database, authentication layer, analytics integration, or synchronization service.

TOML import and SVG, PNG, and TOML export happen in the browser. The production host is a static site and rejects non-read HTTP methods. Browser storage is origin-scoped but is not encrypted; anyone with access to the browser profile can inspect it. Export important work to TOML for backup or transfer.

See [SECURITY.md](SECURITY.md) for the complete security boundary and production requirements.

## Getting started

Requirements:

- Node.js 20.9 or newer
- npm

```bash
git clone https://github.com/ArmoredTurtle/wireforge.git
cd wireforge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Using the builder

1. Name the harness.
2. Add connectors and select their family, variant, and viewing side.
3. Add wires and choose source and destination cavities.
4. Enter the signal name, color, gauge, and finished length.
5. Drag wire handles to control diagram lane and paint order.
6. Use the diagram options to show only the connector annotations required by the manufacturer.
7. Save locally or export the project and finished diagram.

Multiple wires can share a source cavity. Same-connector connections use a loop route, while unconnected wires terminate cleanly. Wire labels are placed above their routes and dynamically seek positions that avoid vertical wire crossings where space permits.

## Connector catalog

Wireforge keeps connector data in ordinary TypeScript modules under
`src/connectors/catalog`. This makes connector additions reviewable as data:
the editor, project format, and wire-routing logic do not need to be rewritten
for every new family. Start with a descriptive file such as
`src/connectors/catalog/deutsch-dt.ts`, export a `ConnectorDefinition[]`, and
register that array in `src/connectors/registry.ts`.

Each definition describes one selectable connector variant. It must identify
the part clearly enough that someone building the harness can distinguish it
from a similar-looking housing. Record a stable ID, manufacturer, family,
series, exact housing part number, pitch, cavity count, row count, supported
wire range, latch behavior, polarization, renderer style, and source status.
The part number is the housing or termination being documented—not an informal
shop nickname. If a manufacturer uses different plug and receptacle parts,
create separate definitions when that distinction affects assembly.

### Example connector module

Use `defineFamily()` when several variants share all properties except pin
count and part number:

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

`defineFamily()` generates one definition per entry in `pins`, including the
stable ID, display name, pin count, and housing part number. If variants differ
in pitch, row layout, wire range, latch, or another manufacturing property,
write explicit `ConnectorDefinition` objects instead of forcing them into one
family template.

After creating the module, import and add its exported array to `catalogs`:

```ts
import { exampleConnectors } from "./catalog/example";

const catalogs: ConnectorDefinition[][] = [
  // Existing catalogs...
  exampleConnectors,
];
```

### Sources and verification

Use `sourceStatus: "manufacturer-verified"` only when the definition is based
on an official manufacturer drawing or datasheet, and include that document in
`datasheetUrl`. Note the document title or revision in `sourceDocument` when it
helps reviewers reproduce the interpretation. Distributor listings, marketplace
photos, community pinouts, and measurements from an unknown sample are not
manufacturer verification.

Use `sourceStatus: "generic"` for intentionally generic parts and community
conventions such as DuPont-style housings, generic spade terminals, U-terminals,
ferrules, and ring lugs. Generic definitions should say what the builder must
verify physically—for example tab width, stud size, fork opening, sleeve size,
or pin length—rather than implying that all visually similar parts mate.

Do not copy manufacturer artwork into the repository. Store the factual
dimensions and identity information, link to the source, and use Wireforge's
original technical line renderers.

### Pin numbering and drawing orientation

Pin numbers are electrical cavity identities, not left-to-right drawing
positions. Determine numbering from the official drawing and note whether it is
shown from the mating face or wire-entry side. Wireforge can mirror the cavity
positions for the selected view, but must never renumber the electrical pins.
Check circuit 1, row order, latch/key-up orientation, and any skipped or keyed
cavities before submitting a definition. A visually plausible drawing with the
wrong viewing side is a manufacturing error.

Choose the closest existing renderer in `src/connectors/types.ts`. Common
housing renderers cover single-row, dual-row, keyed JST/Molex-style housings,
DuPont-style housings, and screw terminals. Dedicated one-terminal renderers
cover rings, male and female spades, open-spade/U-terminals, and ferrules. A new
renderer is only necessary when an existing drawing would hide an important
assembly feature; adding one requires updating the renderer type and SVG logic
as well as the catalog data.

### Tests and contribution checklist

Add focused tests for the stable ID, exact part number, pin count, rows,
supported wire range, source status, and official URL. Multi-row and keyed
families should also test mating-face versus wire-entry placement. If a new
renderer is added, test its identifying label, warning text, and distinctive SVG
feature. Finally, confirm that the family and every variant appear in the
builder selector.

Before opening a pull request, run the complete local gate:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The more compact contributor checklist is available in
[docs/CONNECTOR_CATALOG.md](docs/CONNECTOR_CATALOG.md).

Included families cover JST XH, JST PH, JST SM, Molex Micro-Fit 3.0, Molex
Mini-Fit Jr., DuPont-style and Mini-PV-compatible housings, generic headers,
screw terminals, ring terminals, male and female spades, U-terminals, and wire
ferrules.

## Project files

Editable projects use TOML with a versioned envelope:

```toml
format = "wire-harness-project"
version = 1
name = "Toolhead Harness"
```

Imports are limited to 2 MB and validated with Zod before entering application state. Identifiers, labels, collections, colors, gauges, and lengths are bounded by the project schema. Invalid or unsupported projects are rejected without replacing the open harness.

The editor can open a CableBuilder share URL for two-ended JST XH, JST PH, and
Micro-Fit harnesses in a new tab. It uses CableBuilder's documented `cable=1`
format with explicit pin mapping. Unsupported connector families,
bare/unconnected wires, and three-connector harnesses are reported instead of
producing an incomplete order link.

JSON is also available as an additional, human-readable export for integrations and downstream tooling. TOML remains Wireforge's editable import and archival project format.

## Architecture

```text
src/
├── app/          Next.js shell and global theme system
├── components/   Builder features and reusable application chrome
├── config/       User-facing static configuration such as wire colors
├── connectors/   Connector types, registry, and modular catalog
├── diagram/      Deterministic SVG routing and rendering
├── domain/       Project schema, net graph, validation, and TOML I/O
└── store/        Undo/redo and browser-local persistence
```

Wires are graph edges with stable IDs. Endpoints are discriminated references to connector terminals, splice nodes, or bare terminations. Nets group related wire edges, including deliberate multiple-wire crimps. Electrical cavity identity does not change when the diagram view is mirrored.

## Development commands

| Command              | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start the local development server       |
| `npm test`           | Run domain, renderer, and UI tests       |
| `npm run test:watch` | Run tests in watch mode                  |
| `npm run typecheck`  | Run TypeScript without emitting files    |
| `npm run lint`       | Run ESLint                               |
| `npm run build`      | Create and validate the production build |

For the static production artifact used by ArmoredTurtle:

```bash
WIREFORGE_STATIC_EXPORT=1 npm run build
```

The generated site is written to `out/`. Security headers must be preserved in the web-server configuration; the reference Apache configuration is under `deploy/`.

## Contributing

Issues and pull requests are welcome. For connector additions, include an official manufacturer datasheet whenever claiming manufacturer verification and add coverage for part numbers, pin counts, row layout, source URLs, and wire-entry mirroring.

Before opening a pull request, run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Do not commit copied manufacturer artwork. Connector renderers produce original technical line drawings from structured definition data.

## Current limitations

Manual canvas placement, twisted pairs, shields, BOM generation, PDF export, and in-app custom connector-definition editing are not yet implemented. PNG export depends on the browser's SVG-to-canvas support.

## License

Wireforge is free software licensed under the [GNU General Public License v3.0](LICENSE), SPDX identifier `GPL-3.0-only`.

Copyright © 2026 ArmoredTurtle contributors.
