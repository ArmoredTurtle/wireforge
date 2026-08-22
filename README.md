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

Connector definitions are ordinary typed modules under `src/connectors/catalog`. A definition records:

- Stable ID, manufacturer, family, and series
- Exact housing part number or documented pattern
- Pitch, cavity count, row layout, latch, and polarization
- Supported wire-gauge range
- Mating-face and wire-entry cavity mapping
- Renderer style and source-verification status
- Official drawing or datasheet URL when manufacturer verified

New connector families do not require a custom React component. Follow [docs/CONNECTOR_CATALOG.md](docs/CONNECTOR_CATALOG.md) for the contribution workflow and verification requirements.

Included families cover JST XH, JST PH, JST SM, Molex Micro-Fit 3.0, Molex Mini-Fit Jr., DuPont-style and Mini-PV-compatible housings, generic headers and screw terminals, and generic crimp-on ring terminals.

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
producing an incomplete order link. It can also ingest a supported CableBuilder
share URL and reconstruct the connectors, pin mappings, gauges, colors, material
notes, and overall wire length as a new WireForge project.

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
