# Contributing connector definitions

Connector data is isolated from the editor and SVG renderer so pull requests can add connectors safely.

1. Create `src/connectors/catalog/<vendor-or-family>.ts`.
2. Export a `ConnectorDefinition[]`, normally using `defineFamily()` from `../types`.
3. Register the exported array in `src/connectors/registry.ts`.
4. Add tests for IDs, part numbers, pin counts, row layout, wire-entry mirroring, and source URLs.
5. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

Required manufacturing fields include a stable definition ID, manufacturer, family, series, exact housing part number or documented pattern, pitch, cavity count, rows, supported wire range, latch and polarization behavior, renderer style, and source status.

Use `sourceStatus: "manufacturer-verified"` only with an official manufacturer drawing or datasheet URL. Community conventions such as “DuPont-style” must remain `generic` unless the definition names a specific controlled manufacturer part.

Pin numbers are electrical cavity identities. `pinMap()` may mirror their graphical columns for a wire-entry view, but it must never renumber terminals. Drawings assume latch/key up when that annotation is enabled.

Do not commit copied manufacturer artwork. Renderer types produce original line drawings from definition data.
