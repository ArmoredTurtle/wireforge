import { describe, expect, it } from "vitest";
import { createDemoProject, deserializeProject, deserializeProjectJson, normalizeProject, serializeProject, serializeProjectJson } from "./project";

describe("project mode persistence", () => {
  const formats = [
    { name: "TOML", encode: serializeProject, decode: deserializeProject },
    { name: "JSON", encode: serializeProjectJson, decode: deserializeProjectJson },
  ];
  for (const { name, encode, decode } of formats) {
    it(`${name} preserves an absent override in old files and normalization`, () => {
      const project = createDemoProject();
      expect(normalizeProject(decode(encode(project))).layout).not.toHaveProperty("mode");
    });
    it.each(["standard", "advanced"] as const)(`${name} preserves an explicit %s override`, (mode) => {
      const project = createDemoProject();
      project.layout.mode = mode;
      expect(normalizeProject(decode(encode(project))).layout.mode).toBe(mode);
    });
    it(`${name} rejects an invalid explicit override`, () => {
      const project = createDemoProject();
      project.layout.mode = "advanced";
      expect(() => decode(encode(project).replace('"advanced"', '"expert"'))).toThrow();
    });
  }
});
