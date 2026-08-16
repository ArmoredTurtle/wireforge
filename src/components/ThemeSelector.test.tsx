import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { ThemeSelector } from "./ThemeSelector";

describe("ThemeSelector", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("hydrates with a saved theme after the initial render", async () => {
    // Arrange
    localStorage.setItem("wireforge-theme", "forge");
    const clientWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    const serverMarkup = renderToString(<ThemeSelector />);
    vi.stubGlobal("window", clientWindow);
    const container = document.createElement("div");
    container.innerHTML = serverMarkup;
    document.body.appendChild(container);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    // Act
    hydrateRoot(container, <ThemeSelector />);

    // Assert
    await waitFor(() => {
      expect(container.querySelector("select")).toHaveProperty(
        "value",
        "forge",
      );
    });
    expect(document.documentElement.dataset.theme).toBe("forge");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
