import { describe, expect, it } from "vitest";
import { sanitizeDownloadName } from "./download";

describe("sanitizeDownloadName", () => {
  it("replaces spaces with hyphens", () => {
    expect(sanitizeDownloadName("My Project.toml")).toBe("My-Project.toml");
  });

  it("trims surrounding whitespace and collapses whitespace runs", () => {
    expect(sanitizeDownloadName("  My   Project.toml  ")).toBe(
      "My-Project.toml",
    );
  });

  it("uses a fallback for an empty name", () => {
    expect(sanitizeDownloadName("   ")).toBe("wireforge-export");
  });
});
