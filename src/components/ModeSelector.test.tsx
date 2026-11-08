import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { createDemoProject } from "@/domain/project";
import type { EditingMode } from "@/domain/mode";
import { useMode } from "@/store/useMode";
import { ModeSelector } from "./ModeSelector";

function Preference({ override }: { override?: EditingMode }) {
  const project = createDemoProject();
  if (override) project.layout.mode = override;
  const editing = useMode(project, () => undefined);
  return <ModeSelector mode={editing.mode} pinned={editing.pinned}
    onChange={editing.selectMode} onPinChange={editing.setPinned} />;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("mode preference initialization", () => {
  it("renders Standard without touching storage, then hydrates a saved preference without mismatches", async () => {
    localStorage.setItem("wireforge-mode", "advanced");
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const html = renderToString(<Preference />);
    expect(getItem).not.toHaveBeenCalled();
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    expect(container.querySelector('input[value="standard"]')).toHaveProperty("checked", true);
    const recoverable = vi.fn();
    let root: Root;
    await act(async () => { root = hydrateRoot(container, <Preference />, { onRecoverableError: recoverable }); });
    try {
      await waitFor(() => expect(container.querySelector('input[value="advanced"]')).toHaveProperty("checked", true));
      expect(recoverable).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it.each(["standard", "advanced"] as const)("keeps a %s project override after browser preference initialization", async (override) => {
    localStorage.setItem("wireforge-mode", override === "standard" ? "advanced" : "standard");
    render(<Preference override={override} />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(screen.getByRole("radio", { name: override === "standard" ? "Standard" : "Advanced" })).toHaveProperty("checked", true);
  });

  it("keeps an immediate session selection when persistence fails before initialization finishes", async () => {
    localStorage.setItem("wireforge-mode", "advanced");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    render(<Preference />);
    fireEvent.click(screen.getByRole("radio", { name: "Advanced" }));
    fireEvent.click(screen.getByRole("radio", { name: "Standard" }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(screen.getByRole("radio", { name: "Standard" })).toHaveProperty("checked", true);
  });
});
