import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { WireforgeApp } from "./WireforgeApp";
import { createDemoProject, serializeProjectJson } from "@/domain/project";
import type { HarnessProject } from "@/domain/model";
import { advancedDisplayKeys } from "@/domain/mode";
import { svgString } from "@/diagram/render";

const choose = (name: "Standard" | "Advanced") => fireEvent.click(screen.getByRole("radio", { name }));
const pin = () => screen.getByRole("checkbox", { name: "Remember mode for this project" });
const svg = (container: HTMLElement) => svgString(container.querySelector<SVGSVGElement>(".diagram-svg")!);

function advancedProject() {
  const project = createDemoProject();
  project.name = "Advanced fixture";
  project.twists = [{ id: "t1", label: "TP1", wireIds: ["wire-demo-4", "wire-demo-5"], layMm: 25 }];
  project.sleeves = [{ id: "s1", label: "S1", type: "braided-pet", color: "#18181b", wireIds: ["wire-demo-1", "wire-demo-2"] }];
  project.connectors[0].face = "bottom";
  project.wires[0].color = "#123456";
  project.layout.showConnectorPartNumber = false;
  project.layout.showWiringTable = false;
  return project;
}

function openSaved(project: HarnessProject) {
  localStorage.setItem("wireforge-projects-v1", JSON.stringify([project]));
  const view = render(<WireforgeApp />);
  fireEvent.click(screen.getByRole("button", { name: "Projects" }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${project.name}`) }));
  return view;
}

function savedProject(): HarnessProject {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  return JSON.parse(localStorage.getItem("wireforge-projects-v1")!)[0];
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Standard and Advanced editing", () => {
  it("defaults to Standard and reveals exactly the specialist controls in Advanced", () => {
    const { container } = render(<WireforgeApp />);
    expect(screen.getByRole("radio", { name: "Standard" })).toHaveProperty("checked", true);
    expect(screen.getByLabelText("Wire 1 palette")).toBeTruthy();
    expect(screen.getByLabelText("Wire 1 length")).toBeTruthy();
    expect(screen.getByLabelText("Connector A view")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Advanced settings in use" })).toBeNull();
    const display = screen.getByLabelText("Diagram display options");
    expect(within(display).getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.queryByLabelText("Wire 1 color")).toBeNull();
    expect(screen.queryByLabelText("Wire 1 twist")).toBeNull();
    expect(screen.queryByLabelText("Connector A drawn from")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add sleeve" })).toBeNull();
    expect(container.querySelectorAll("#wire-editor .th > span")).toHaveLength(7);
    choose("Advanced");
    expect(within(display).getAllByRole("checkbox")).toHaveLength(11);
    expect(screen.getByLabelText("Wire 1 color")).toBeTruthy();
    expect(screen.queryByLabelText("Connector B drawn from")).toBeNull();
    expect(screen.getByLabelText("Wire 1 twist")).toBeTruthy();
    expect(screen.getByLabelText("Connector A drawn from")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add sleeve" })).toBeTruthy();
    expect(container.querySelectorAll("#wire-editor .th > span")).toHaveLength(8);
    choose("Standard");
    expect(screen.queryByLabelText("Wire 1 twist")).toBeNull();
    expect(within(display).getAllByRole("checkbox")).toHaveLength(4);
  });

  it("persists an unpinned browser preference without dirtying the project or adding history", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const view = render(<WireforgeApp />);
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Saved name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    choose("Advanced");
    expect(localStorage.getItem("wireforge-mode")).toBe("advanced");
    expect(pin()).toHaveProperty("checked", false);
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(screen.getByLabelText("Project name")).toHaveProperty("value", "Toolhead Example Harness");
    // Reloading applies the preference, and mode alone never causes discard prompts.
    view.unmount();
    render(<WireforgeApp />);
    await waitFor(() => expect(screen.getByLabelText("Wire 1 color")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(savedProject().layout.mode).toBeUndefined();
  });

  it("falls back from invalid browser settings and stays usable with storage blocked", async () => {
    localStorage.setItem("wireforge-mode", "expert");
    const first = render(<WireforgeApp />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(screen.getByRole("radio", { name: "Standard" })).toHaveProperty("checked", true);
    first.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
    render(<WireforgeApp />);
    await new Promise((resolve) => setTimeout(resolve, 10));
    choose("Advanced");
    expect(screen.getByLabelText("Wire 1 color")).toBeTruthy();
    choose("Standard");
    expect(screen.queryByLabelText("Wire 1 color")).toBeNull();
  });

  it("pins explicitly, updates the pinned selection, and removes the override with undo and redo", () => {
    render(<WireforgeApp />);
    choose("Advanced");
    fireEvent.click(pin());
    expect(savedProject().layout.mode).toBe("advanced");
    choose("Standard");
    expect(savedProject().layout.mode).toBe("standard");
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(screen.getByRole("radio", { name: "Advanced" })).toHaveProperty("checked", true);
    // Browser preference is still Standard. Unpinning immediately uses it.
    fireEvent.click(pin());
    expect(screen.getByRole("radio", { name: "Standard" })).toHaveProperty("checked", true);
    expect(savedProject().layout).not.toHaveProperty("mode");
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(pin()).toHaveProperty("checked", true);
    expect(screen.getByRole("radio", { name: "Advanced" })).toHaveProperty("checked", true);
    fireEvent.click(screen.getByLabelText("Redo"));
    expect(pin()).toHaveProperty("checked", false);
  });

  it("honors a saved project override without changing the browser preference", async () => {
    localStorage.setItem("wireforge-mode", "standard");
    const project = advancedProject();
    project.layout.mode = "advanced";
    openSaved(project);
    await waitFor(() => expect(pin()).toHaveProperty("checked", true));
    expect(screen.getByRole("radio", { name: "Advanced" })).toHaveProperty("checked", true);
    expect(localStorage.getItem("wireforge-mode")).toBe("standard");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(pin()).toHaveProperty("checked", false);
    expect(screen.getByRole("radio", { name: "Standard" })).toHaveProperty("checked", true);
  });

  it("summarizes advanced content without auto-switching, and preserves custom colors and the full drawing", () => {
    const project = advancedProject();
    const { container } = openSaved(project);
    const before = svg(container);
    const summary = screen.getByRole("region", { name: "Advanced settings in use" });
    expect(summary.textContent).toContain("1 twisted group, 1 sleeve, 2 display options hidden, 1 connector drawn from bottom, 1 wire with a custom color");
    expect(screen.getByLabelText("Wire 1 palette")).toHaveProperty("value", "#123456");
    expect(before).toContain('data-twist="TP1"');
    expect(before).toContain('data-sleeve="S1"');
    expect(container.querySelector("#wiring-table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit in Advanced" }));
    expect(svg(container)).toBe(before);
    expect(screen.getByLabelText("Wire 1 color")).toHaveProperty("value", "#123456");
    expect(screen.getByLabelText("Twisted group TP1 name")).toBeTruthy();
    expect(screen.getByLabelText("Sleeve S1 type")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Advanced settings in use" })).toBeNull();
    choose("Standard");
    expect(svg(container)).toBe(before);
    expect(savedProject().wires[0].color).toBe("#123456");
  });

  it("restores only the seven Advanced flags in one undoable edit", () => {
    const project = advancedProject();
    for (const key of advancedDisplayKeys) project.layout[key] = false;
    project.layout.showLabels = false;
    project.layout.showNotes = false;
    project.layout.showConnectorNames = false;
    project.layout.assemblyDrawing = true;
    const { container } = openSaved(project);
    const before = svg(container);
    expect(screen.getByRole("region", { name: "Advanced settings in use" }).textContent).toContain("7 display options hidden");
    fireEvent.click(screen.getByRole("button", { name: "Show everything" }));
    const after = savedProject();
    for (const key of advancedDisplayKeys) expect(after.layout[key]).toBe(true);
    expect(after.layout.showLabels).toBe(false);
    expect(after.layout.showNotes).toBe(false);
    expect(after.layout.showConnectorNames).toBe(false);
    expect(after.layout.assemblyDrawing).toBe(true);
    expect(after.layout.mode).toBeUndefined();
    expect(after.twists).toEqual(project.twists);
    expect(after.sleeves).toEqual(project.sleeves);
    expect(after.connectors).toEqual(project.connectors);
    expect(after.wires).toEqual(project.wires);
    expect(screen.queryByRole("button", { name: "Show everything" })).toBeNull();
    expect(container.querySelector("#wiring-table")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(svg(container)).toBe(before);
    expect(screen.getByRole("button", { name: "Show everything" })).toBeTruthy();
  });

  it("imports a pinned JSON project and lets an unpinned import inherit the browser mode", async () => {
    const { container } = render(<WireforgeApp />);
    localStorage.setItem("wireforge-mode", "advanced");
    choose("Advanced");
    const project = advancedProject();
    project.layout.mode = "standard";
    const file = { name: "pinned.json", size: 100, text: () => Promise.resolve(serializeProjectJson(project)) };
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(pin()).toHaveProperty("checked", true));
    expect(screen.getByRole("radio", { name: "Standard" })).toHaveProperty("checked", true);
    expect(localStorage.getItem("wireforge-mode")).toBe("advanced");
    delete project.layout.mode;
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.change(input, { target: { files: [{ ...file, text: () => Promise.resolve(serializeProjectJson(project)) }] } });
    await waitFor(() => expect(pin()).toHaveProperty("checked", false));
    expect(screen.getByRole("radio", { name: "Advanced" })).toHaveProperty("checked", true);
  });

  it("keeps every export and import action available in Standard", () => {
    render(<WireforgeApp />);
    fireEvent.click(screen.getByText("Export", { selector: "summary" }));
    for (const name of ["SVG", "PNG", "TOML", "JSON"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    fireEvent.click(screen.getByText("CableBuilder", { selector: "summary" }));
    expect(screen.getByRole("button", { name: /Send to CableBuilder/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Import URL/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Import file/ })).toBeTruthy();
  });
});

// Exercise the real export handlers: both must serialize the unchanged live SVG.
describe("mode independent export actions", () => {
  it.each([false, true])("uses the same complete SVG for SVG and PNG exports with assemblyDrawing %s", async (assemblyDrawing) => {
    const project = advancedProject();
    project.layout.assemblyDrawing = assemblyDrawing;
    project.layout.showWiringTable = true;
    const { container } = openSaved(project);
    const expected = svg(container);
    const blobs: Blob[] = [];
    vi.stubGlobal("URL", class extends URL {
      static createObjectURL(blob: Blob) { blobs.push(blob); return "blob:export-test"; }
      static revokeObjectURL() {}
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    for (const mode of ["Standard", "Advanced", "Standard"] as const) {
      choose(mode);
      for (const format of ["SVG", "PNG"]) {
        const summary = screen.getByText("Export", { selector: "summary" });
        if (!summary.parentElement!.hasAttribute("open")) fireEvent.click(summary);
        fireEvent.click(screen.getByRole("button", { name: format }));
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsText(blobs.at(-1)!);
        });
        expect(text).toBe(expected);
        expect(text).toContain('data-sleeve="S1"');
        expect(text).toContain('data-twist="TP1"');
      }
    }
    expect(blobs).toHaveLength(6);
  });
});
