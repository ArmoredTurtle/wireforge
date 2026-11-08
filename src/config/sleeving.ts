// Sleeving catalog. Each type says how it is sized and which build options
// apply to it, so the editor and drawings stay driven by data. Temperatures
// are typical upper limits for the class of product, not a datasheet value
// for any one part; see docs/SLEEVING_CATALOG.md.

export type SleeveFamily = "braided" | "wrap" | "tube" | "heat-shrink" | "tape";
export type SleeveTexture =
  | "braid"
  | "soft-braid"
  | "metal-braid"
  | "weave"
  | "spiral"
  | "ribbed"
  | "smooth"
  | "tape";
// How the size field reads for a type: a nominal inside diameter, the
// supplied (expanded) diameter of heat shrink, or the width of a tape.
export type SleeveSizing = "inside-diameter" | "supplied-diameter" | "tape-width";

export type SleeveType = {
  name: string;
  family: SleeveFamily;
  construction: string;
  texture: SleeveTexture;
  sizing: SleeveSizing;
  maxTempC?: number;
  shrinkRatios?: readonly string[];
  // Types whose cut ends can fray or need finishing.
  finishEnds?: boolean;
  // Types applied by wrapping, which take a wrap style.
  wrapped?: boolean;
  summary: string;
};

export const sleeveFamilyNames: Record<SleeveFamily, string> = {
  braided: "Braided sleeving",
  wrap: "Wrap-around sleeving",
  tube: "Tubing and loom",
  "heat-shrink": "Heat shrink",
  tape: "Harness tape",
};

export const sleeveTypeIds = [
  "braided-pet",
  "braided-pet-fray-resistant",
  "braided-multifilament",
  "paracord",
  "braided-nomex",
  "braided-fiberglass",
  "braided-copper-shield",
  "self-wrap-pet",
  "hook-and-loop-wrap",
  "spiral-wrap",
  "split-loom",
  "convoluted-tubing",
  "silicone-tubing",
  "pvc-tubing",
  "ptfe-tubing",
  "heat-shrink-polyolefin",
  "heat-shrink-adhesive",
  "heat-shrink-ptfe",
  "heat-shrink-fluoroelastomer",
  "tape-pet-cloth",
  "tape-pet-fleece",
  "tape-pvc",
  "tape-polyimide",
] as const;
export type SleeveTypeId = (typeof sleeveTypeIds)[number];

export const sleeveTypes: Record<SleeveTypeId, SleeveType> = {
  "braided-pet": {
    name: "Braided PET",
    family: "braided",
    construction: "expandable",
    texture: "braid",
    sizing: "inside-diameter",
    maxTempC: 125,
    finishEnds: true,
    summary: "General-purpose expandable monofilament braid; fed over the bundle.",
  },
  "braided-pet-fray-resistant": {
    name: "Fray-resistant PET",
    family: "braided",
    construction: "expandable",
    texture: "braid",
    sizing: "inside-diameter",
    maxTempC: 125,
    summary: "PET braid that cuts cleanly with scissors; no hot knife needed.",
  },
  "braided-multifilament": {
    name: "Multifilament braid",
    family: "braided",
    construction: "expandable",
    texture: "soft-braid",
    sizing: "inside-diameter",
    maxTempC: 125,
    finishEnds: true,
    summary: "Soft, dense fabric-like braid (PET or nylon yarn); hides wire colors.",
  },
  paracord: {
    name: "Paracord",
    family: "braided",
    construction: "gutted cord",
    texture: "soft-braid",
    sizing: "inside-diameter",
    maxTempC: 100,
    finishEnds: true,
    summary: "Nylon 550 cord with the core pulled; tight fit for small bundles.",
  },
  "braided-nomex": {
    name: "Nomex braid",
    family: "braided",
    construction: "expandable",
    texture: "soft-braid",
    sizing: "inside-diameter",
    maxTempC: 200,
    finishEnds: true,
    summary: "Flame-resistant aramid braid for hot or fire-sensitive runs.",
  },
  "braided-fiberglass": {
    name: "Fiberglass sleeve",
    family: "braided",
    construction: "closed braid",
    texture: "weave",
    sizing: "inside-diameter",
    maxTempC: 200,
    finishEnds: true,
    summary: "Silicone- or acrylic-coated glass braid for heater and hotend leads.",
  },
  "braided-copper-shield": {
    name: "Tinned copper shield braid",
    family: "braided",
    construction: "expandable",
    texture: "metal-braid",
    sizing: "inside-diameter",
    finishEnds: true,
    summary: "EMI shield over signal pairs; terminate the drain where noted.",
  },
  "self-wrap-pet": {
    name: "Self-wrapping split braid",
    family: "wrap",
    construction: "split, self-closing",
    texture: "weave",
    sizing: "inside-diameter",
    maxTempC: 125,
    finishEnds: true,
    summary: "Woven PET that curls closed; fits over finished connectors.",
  },
  "hook-and-loop-wrap": {
    name: "Hook-and-loop wrap",
    family: "wrap",
    construction: "split, hook-and-loop closure",
    texture: "smooth",
    sizing: "inside-diameter",
    maxTempC: 80,
    summary: "Fabric or neoprene sleeve closed with hook-and-loop; reopenable.",
  },
  "spiral-wrap": {
    name: "Spiral wrap",
    family: "wrap",
    construction: "spiral",
    texture: "spiral",
    sizing: "inside-diameter",
    maxTempC: 85,
    summary: "Cut plastic spiral; wires can break out anywhere along it.",
  },
  "split-loom": {
    name: "Split loom",
    family: "tube",
    construction: "corrugated, slit",
    texture: "ribbed",
    sizing: "inside-diameter",
    maxTempC: 105,
    summary: "Corrugated PE, PP or nylon tube with a slit for easy loading.",
  },
  "convoluted-tubing": {
    name: "Convoluted tubing",
    family: "tube",
    construction: "corrugated, closed",
    texture: "ribbed",
    sizing: "inside-diameter",
    maxTempC: 125,
    summary: "Unslit corrugated tube; better sealed than split loom.",
  },
  "silicone-tubing": {
    name: "Silicone tubing",
    family: "tube",
    construction: "closed tube",
    texture: "smooth",
    sizing: "inside-diameter",
    maxTempC: 200,
    summary: "Flexible high-temperature tube, common on heated bed leads.",
  },
  "pvc-tubing": {
    name: "PVC tubing",
    family: "tube",
    construction: "closed tube",
    texture: "smooth",
    sizing: "inside-diameter",
    maxTempC: 80,
    summary: "Clear or colored vinyl tube for low-cost covering.",
  },
  "ptfe-tubing": {
    name: "PTFE tubing",
    family: "tube",
    construction: "closed tube",
    texture: "smooth",
    sizing: "inside-diameter",
    maxTempC: 260,
    summary: "Low-friction, chemical- and heat-resistant tube.",
  },
  "heat-shrink-polyolefin": {
    name: "Polyolefin heat shrink",
    family: "heat-shrink",
    construction: "single wall",
    texture: "smooth",
    sizing: "supplied-diameter",
    maxTempC: 125,
    shrinkRatios: ["2:1", "3:1", "4:1"],
    summary: "Standard heat shrink for insulation, strain relief and ends.",
  },
  "heat-shrink-adhesive": {
    name: "Adhesive-lined heat shrink",
    family: "heat-shrink",
    construction: "dual wall, adhesive lined",
    texture: "smooth",
    sizing: "supplied-diameter",
    maxTempC: 110,
    shrinkRatios: ["3:1", "4:1", "6:1"],
    summary: "Melt liner seals against moisture; use on exposed transitions.",
  },
  "heat-shrink-ptfe": {
    name: "PTFE heat shrink",
    family: "heat-shrink",
    construction: "single wall",
    texture: "smooth",
    sizing: "supplied-diameter",
    maxTempC: 260,
    shrinkRatios: ["1.3:1", "1.7:1", "2:1", "4:1"],
    summary: "Fluoropolymer shrink for high heat and harsh chemicals.",
  },
  "heat-shrink-fluoroelastomer": {
    name: "Fluoroelastomer heat shrink",
    family: "heat-shrink",
    construction: "single wall",
    texture: "smooth",
    sizing: "supplied-diameter",
    maxTempC: 200,
    shrinkRatios: ["2:1"],
    summary: "Flexible Viton-type shrink resistant to fuels and oils.",
  },
  "tape-pet-cloth": {
    name: "PET cloth tape",
    family: "tape",
    construction: "woven cloth tape",
    texture: "tape",
    sizing: "tape-width",
    maxTempC: 150,
    wrapped: true,
    summary: "Abrasion-resistant harness tape for engine-bay style duty.",
  },
  "tape-pet-fleece": {
    name: "PET fleece tape",
    family: "tape",
    construction: "fleece tape",
    texture: "tape",
    sizing: "tape-width",
    maxTempC: 105,
    wrapped: true,
    summary: "Soft tape that stops rattles and squeaks against panels.",
  },
  "tape-pvc": {
    name: "PVC electrical tape",
    family: "tape",
    construction: "vinyl tape",
    texture: "tape",
    sizing: "tape-width",
    maxTempC: 80,
    wrapped: true,
    summary: "Insulating vinyl tape for bundling and spot taping.",
  },
  "tape-polyimide": {
    name: "Polyimide tape",
    family: "tape",
    construction: "film tape",
    texture: "tape",
    sizing: "tape-width",
    maxTempC: 260,
    wrapped: true,
    summary: "Kapton-type film tape for high-temperature spots such as hotends.",
  },
};

export const sleeveSizingNames: Record<SleeveSizing, string> = {
  "inside-diameter": "ID",
  "supplied-diameter": "Supplied ID",
  "tape-width": "Width",
};

export const wrapStyles = ["half-lap", "open-spiral", "spot"] as const;
export type WrapStyle = (typeof wrapStyles)[number];
export const wrapStyleNames: Record<WrapStyle, string> = {
  "half-lap": "Half-lap",
  "open-spiral": "Open spiral",
  spot: "Spot taped",
};

export const endFinishes = ["hot-cut", "heat-shrink", "tape", "none"] as const;
export type EndFinish = (typeof endFinishes)[number];
export const endFinishNames: Record<EndFinish, string> = {
  "hot-cut": "Hot-knife cut",
  "heat-shrink": "Heat-shrink ends",
  tape: "Taped ends",
  none: "No finish",
};
