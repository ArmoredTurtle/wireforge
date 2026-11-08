# A4 diagram and wiring table specification

The technical document combines the harness diagram and its wiring table on readable A4 landscape sheets. Small harnesses should fit one page when possible. Larger harnesses use additional pages rather than shrinking text until it is difficult to read. Preview and image exports use the same page plan and project data.

## Example harnesses

The default remains the unchanged Toolhead Example Harness with two connectors and five wires. A test-only Complex machine harness fixture has eight connectors and 28 wires. This example uses catalog connectors, valid terminal references, branches from shared pins, striped wires, varied lengths and gauges, same-connector and same-pin loops, two deliberately unconnected spare ends, and two unused pins. It contains descriptive signal labels long enough to exercise table wrapping.

The app retains only its existing simple default. The larger fixture lives in tests and is never imported by production code or offered in the app UI. Browser stress checks may temporarily import it through the normal project importer, then restore the simple project. It is clearly identified as test data.

## Content and controls

The Wiring table display option is enabled by default, including for older projects. Disabling it removes the table and any table-only pages without changing the harness. The choice persists through save, import and export.

The table lists wire number, source, signal, color and optional stripe, AWG, length in millimetres, destination and status. Each wire appears once in project order, with continuous numbering and separate rows for branches. Unused pins follow as NC rows in connector and pin order. Missing destinations remain unconnected; missing values use an em dash.

## Fit and readability rules

Every page is 297 by 210 mm with the existing safe margins. Project title, table text, column headings and page footer retain their original sizes.

1. Try the complete diagram and complete table at normal size and spacing.
2. If the diagram already fits one sheet but the combined document does not, try a more compact diagram: the first lane moves from 330 to 300 drawing units and lane spacing from 46 to 38 units. Connector faces and wire labels keep their original sizes at this stage.
3. If necessary, uniformly scale only that compact diagram to fit the complete table beneath it. The scale must remain between 94% and 100%. The title, table and footer do not scale. Preserve room beneath same-pin loop routes.
4. If the complete document cannot fit within that limit, keep normal diagram size and spacing and paginate. Never compress a large harness into a single sheet or reduce table text to make it fit.

No content overlaps the table, footer or safe margins. A fit decision depends on rendered table row heights, including wrapped labels and unused-pin rows, rather than only on wire count. Hiding the table restores the normal diagram layout.

## Multiple pages

Diagram sheets preserve complete routes and repeat relevant connector faces. The table follows the last diagram and may use space below it when a header and at least two complete rows fit. A single-row table may share a page when it fits. Otherwise the table starts a new page.

Rows wrap within their columns and grow in height, never splitting between sheets. Each continuation repeats the project title, table title and all column headings. A table header always has at least one whole row. There are no blank continuation pages. Every sheet has continuous Page X of Y numbering. A blank project has one diagram sheet without an empty table.

## Preview and exports

The preview updates when project data, connector references or the table option change. SVG and PNG exports preserve the page plan, content and fit scale. A single page downloads as one image; multiple pages use the numbered ZIP bundle. SVG retains A4 physical dimensions. PNG retains A4 proportions and 300 dpi print metadata.

## Acceptance checks

- The unchanged simple example fits its diagram and five table rows on one A4 sheet, within the scale limit, with W1 from A-1 to B-1 and unconnected W5 intact.
- A smaller table fits at normal size when there is room; hiding the table restores normal spacing and scale.
- The complex example passes project validation apart from its two intentional unconnected-end warnings. Its eight connectors and 28 wires survive save and import.
- The complex example uses multiple diagram and table sheets at normal size, preserving all 28 wire rows and two NC rows in order, with repeated headers and continuous numbering.
- A six-wire boundary case and a short harness with very long labels fall back to multiple pages when the complete table exceeds the readability limit.
- Same-pin loops remain above the table in compact and normal layouts.
- The larger fixture is absent from production UI and imports; the normal project import behavior remains unchanged.
- SVG and PNG output from the app match the simple and complex preview page counts and contain every row and route.

Synthetic boundary inputs are allowed in automated tests. Visual checks identify whether they show the unchanged default project or the temporary imported stress fixture.
