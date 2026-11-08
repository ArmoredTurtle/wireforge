# Sleeving catalog

Sleeves cover a chosen set of wires over part or all of the harness. Each
sleeve picks a type from `src/config/sleeving.ts`, and the type decides which
build options the editor shows, how the size field is read, and how the
assembly drawing textures it. Adding a type is a catalog edit; the editor,
drawings, wiring table and cut list pick it up without component changes.

## Options every sleeve has

| Option | Notes |
| --- | --- |
| Name | Short callout such as `S1`, used on the drawing and in the wiring table. |
| Type | One catalog entry, grouped by family in the editor. |
| Color | Base color, from the wire color list. |
| Tracer | Optional stripe color woven or printed into the sleeve. |
| Size | Nominal inside diameter, the supplied (expanded) diameter for heat shrink, or the width for tape. |
| From / Length | Covered span measured from the source end. Blank means from the source end and to the far end. The span is clamped to the shortest covered wire. |
| P/N | Optional manufacturer part number for the cut list. |
| Wires | The wires the sleeve covers. A wire may sit under several sleeves, for example braid with heat-shrink ends. |

## Options that depend on the type

| Option | Shown for | Values |
| --- | --- | --- |
| Shrink ratio | Heat shrink | The ratios listed on the type, such as 2:1, 3:1, 4:1. |
| Wrap style | Tapes | Half-lap, open spiral, spot taped. |
| End finish | Braids and wraps that can fray | Hot-knife cut, heat-shrink ends, taped ends, no finish. |

## Types

| Family | Type | Construction | Typical max °C |
| --- | --- | --- | --- |
| Braided | Braided PET | expandable monofilament | 125 |
| Braided | Fray-resistant PET | expandable, cuts cleanly | 125 |
| Braided | Multifilament braid | soft PET or nylon yarn | 125 |
| Braided | Paracord | nylon 550 cord, core removed | 100 |
| Braided | Nomex braid | flame-resistant aramid | 200 |
| Braided | Fiberglass sleeve | coated glass braid | 200 |
| Braided | Tinned copper shield braid | EMI shield | n/a |
| Wrap-around | Self-wrapping split braid | woven PET, self-closing | 125 |
| Wrap-around | Hook-and-loop wrap | fabric or neoprene, reopenable | 80 |
| Wrap-around | Spiral wrap | cut plastic spiral | 85 |
| Tubing and loom | Split loom | corrugated, slit | 105 |
| Tubing and loom | Convoluted tubing | corrugated, closed | 125 |
| Tubing and loom | Silicone tubing | closed tube | 200 |
| Tubing and loom | PVC tubing | closed tube | 80 |
| Tubing and loom | PTFE tubing | closed tube | 260 |
| Heat shrink | Polyolefin | single wall, 2:1 to 4:1 | 125 |
| Heat shrink | Adhesive-lined | dual wall, 3:1 to 6:1 | 110 |
| Heat shrink | PTFE | single wall, 1.3:1 to 4:1 | 260 |
| Heat shrink | Fluoroelastomer | Viton-type, 2:1 | 200 |
| Harness tape | PET cloth tape | woven, abrasion resistant | 150 |
| Harness tape | PET fleece tape | anti-rattle | 105 |
| Harness tape | PVC electrical tape | vinyl | 80 |
| Harness tape | Polyimide tape | Kapton-type film | 260 |

Temperatures are typical upper limits for the class of product, gathered from
distributor and manufacturer overviews. They are a guide for choosing a type,
not a rating for any specific part; confirm against the datasheet of the part
you buy and record its number in P/N.

## Adding a type

Add its id to `sleeveTypeIds` and its entry to `sleeveTypes`. Set:

- `family` and `construction` for grouping and the editor hint;
- `sizing` so the size field reads as ID, supplied ID or width;
- `texture` for the assembly drawing (`braid`, `soft-braid`, `metal-braid`,
  `weave`, `spiral`, `ribbed`, `smooth` or `tape`);
- `shrinkRatios`, `wrapped` or `finishEnds` when those options apply;
- `maxTempC` only when a typical figure is well established.

Project files store the type id, so renaming or removing an id breaks saved
projects that use it.

## References

- Cable Ties Unlimited, [Comparing wire protectors](https://cabletiesunlimited.com/learn/comparing-wire-protectors)
- Assembly Magazine, [Options for protecting wire harnesses](https://www.assemblymag.com/articles/93589-options-for-protecting-wire-harnesses)
- Techflex, [Flexo F6](https://techflex.com/general-purpose/flexo-f6) and [F6 Woven Nomex](https://www.techflex.com/advanced-engineering/f6-woven-nomex)
- Sycor, [Types of heat shrink tubing](https://www.sycor.com/blog/post/the-different-types-of-heat-shrink-tubing)
- SEA Wire, [Heat shrink tubing types and recovery](https://www.sea-wire.com/heat-shrink-tubing-types-and-recovery-characteristics/)
- tesa, [51036](https://www.tesa.com/en/industry/tesa-51036-pv0.html) and [51608](https://www.tesa.com/en/industry/tesa-51608.html) harness tapes
