import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WireforgeApp } from "./WireforgeApp";
import { serializeProjectJson } from "@/domain/project";
import { createDemoProject } from "@/domain/project";

describe("editor flow", () => {
  afterEach(cleanup);
  beforeEach(() => localStorage.clear());
  it("edits the live harness, branches, removes, and saves locally", () => {
    const { container } = render(<WireforgeApp />);
    expect(
      screen.getByLabelText("Toolhead Example Harness wiring diagram"),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Wire 1 color"), {
      target: { value: "#16a34a" },
    });
    fireEvent.change(screen.getByLabelText("Wire 1 length"), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText("Wire 1 destination"), {
      target: { value: "conn-b:2" },
    });
    expect(
      container.querySelector('[data-wire] path[stroke="#16a34a"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("300 mm");
    const before = container.querySelectorAll("[data-wire]").length;
    fireEvent.click(screen.getByLabelText("Branch wire 1"));
    expect(container.querySelectorAll("[data-wire]")).toHaveLength(before + 1);
    fireEvent.click(screen.getByLabelText(`Remove wire ${before + 1}`));
    expect(container.querySelectorAll("[data-wire]")).toHaveLength(before);
    fireEvent.click(screen.getByText("Save"));
    expect(localStorage.getItem("wireforge-projects-v1")).toContain(
      "Toolhead Example Harness",
    );
    fireEvent.click(screen.getByText("Projects"));
    expect(screen.getByRole("dialog", { name: "Saved projects" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^Toolhead Example Harness/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.click(
      screen.getByLabelText("Delete saved project Toolhead Example Harness"),
    );
    expect(screen.getByText("No saved projects yet")).toBeTruthy();
    expect(screen.getByLabelText("Wire 1 label")).toBeTruthy();
  });
  it("adds a third connector and permits same-connector wiring", () => {
    render(<WireforgeApp />);
    fireEvent.click(screen.getByText("Add connector"));
    expect(screen.getByLabelText("Connector C reference")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Wire 1 destination"), {
      target: { value: "conn-a:2" },
    });
    expect(
      (screen.getByLabelText("Wire 1 destination") as HTMLSelectElement).value,
    ).toBe("conn-a:2");
  });
  it("collapses builder sections and keeps a workspace footer", () => {
    render(<WireforgeApp />);
    expect(screen.getByText("DATA STAYS IN THIS BROWSER")).toBeTruthy();
    expect(screen.getByAltText("ArmoredTurtle")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /github/i }).getAttribute("href"),
    ).toBe("https://github.com/ArmoredTurtle/wireforge");
    fireEvent.click(screen.getAllByRole("button", { name: /Collapse/ })[0]);
    expect(screen.queryByLabelText("Connector A reference")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show/ }));
    expect(screen.getByLabelText("Connector A reference")).toBeTruthy();
  });
  it("uses JST XH by default and deletes a connector", () => {
    render(<WireforgeApp />);
    expect(screen.getAllByText(/JST XH/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText("Remove connector B"));
    expect(screen.queryByLabelText("Connector B reference")).toBeNull();
    expect(screen.getByText(/1 CONNECTORS/)).toBeTruthy();
  });
  it("clears the editor to an undoable blank harness", () => {
    render(<WireforgeApp />);
    fireEvent.click(screen.getByText("Clear fields"));
    expect(screen.getByLabelText("Project name")).toHaveProperty(
      "value",
      "Untitled Harness",
    );
    expect(screen.queryByLabelText("Connector A reference")).toBeNull();
    expect(screen.queryByLabelText("Wire 1 label")).toBeNull();
    fireEvent.click(screen.getByText("Add connector"));
    expect(screen.getByLabelText("Connector A reference")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(screen.queryByLabelText("Connector A reference")).toBeNull();
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(screen.getByLabelText("Wire 1 label")).toBeTruthy();
  });
  it("protects unsaved edits before replacing the project", () => {
    // Arrange
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<WireforgeApp />);
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Unsaved Harness" },
    });

    // Act
    fireEvent.click(screen.getByText("New"));

    // Assert
    expect(confirm).toHaveBeenCalledWith("Discard unsaved changes?");
    expect(screen.getByLabelText("Project name")).toHaveProperty(
      "value",
      "Unsaved Harness",
    );
    confirm.mockRestore();
  });
  it("exports the project as JSON", async () => {
    // Arrange
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:wireforge-json");
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<WireforgeApp />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));

    // Assert
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("application/json");
    expect(JSON.parse(await blob.text()).name).toBe("Toolhead Example Harness");
    expect(anchorClick).toHaveBeenCalled();
    createObjectURL.mockRestore();
    anchorClick.mockRestore();
  });
  it("closes action menus when clicking outside them", () => {
    // Arrange
    const { container } = render(<WireforgeApp />);
    const exportMenu = screen.getByText("Export").closest("details")!;
    const cableBuilderMenu = screen.getByText("CableBuilder").closest("details")!;

    // Act / Assert
    fireEvent.click(screen.getByText("Export"));
    expect(exportMenu.hasAttribute("open")).toBe(true);
    fireEvent.pointerDown(screen.getByText("Technical diagram"));
    expect(exportMenu.hasAttribute("open")).toBe(false);

    fireEvent.click(screen.getByText("CableBuilder"));
    expect(cableBuilderMenu.hasAttribute("open")).toBe(true);
    fireEvent.pointerDown(container.querySelector(".canvas")!);
    expect(cableBuilderMenu.hasAttribute("open")).toBe(false);
  });
  it("keeps only one action menu open at a time", () => {
    // Arrange
    render(<WireforgeApp />);
    const exportMenu = screen.getByText("Export").closest("details")!;
    const cableBuilderMenu = screen.getByText("CableBuilder").closest("details")!;

    // Act
    fireEvent.click(screen.getByText("Export"));
    fireEvent.click(screen.getByText("CableBuilder"));

    // Assert
    expect(exportMenu.hasAttribute("open")).toBe(false);
    expect(cableBuilderMenu.hasAttribute("open")).toBe(true);
    expect(screen.getByText("Send to CableBuilder")).toBeTruthy();
  });
  it("imports a JSON project file", async () => {
    // Arrange
    const { container } = render(<WireforgeApp />);
    const input = container.querySelector('input[type="file"]')!;
    const file = new File([serializeProjectJson(createDemoProject())], "backup.json", {
      type: "application/json",
    });

    // Act
    fireEvent.change(input, { target: { files: [file] } });

    // Assert
    await waitFor(() => expect(screen.getByText("Project imported successfully.")).toBeTruthy());
    expect((screen.getByLabelText("Project name") as HTMLInputElement).value).toBe(
      "Toolhead Example Harness",
    );
  });
  it("reports a local-storage save failure without crashing", () => {
    // Arrange
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Quota exceeded");
      });
    render(<WireforgeApp />);

    // Act
    fireEvent.click(screen.getByText("Save"));

    // Assert
    expect(screen.getByRole("status").textContent).toContain(
      "Save failed: Unable to save project in this browser.",
    );
    setItem.mockRestore();
  });
  it("changes one shared-source wire without mutating its peers", () => {
    render(<WireforgeApp />);
    expect(
      (screen.getByLabelText("Wire 2 source") as HTMLSelectElement).value,
    ).toBe("conn-a:2");
    fireEvent.change(screen.getByLabelText("Wire 3 source"), {
      target: { value: "conn-a:3" },
    });
    expect(
      (screen.getByLabelText("Wire 2 source") as HTMLSelectElement).value,
    ).toBe("conn-a:2");
  });
  it("reorders wire layers by dragging their handles", () => {
    render(<WireforgeApp />);
    const transfer = { effectAllowed: "none" };
    fireEvent.dragStart(screen.getByLabelText("Reorder wire 1"), {
      dataTransfer: transfer,
    });
    fireEvent.drop(screen.getByLabelText("Wire 3 label").closest(".tr")!, {
      dataTransfer: transfer,
    });
    expect(screen.getByLabelText("Wire 3 label")).toHaveProperty(
      "value",
      "24V",
    );
  });
  it("rejects malformed projects found in browser storage", () => {
    localStorage.setItem(
      "wireforge-projects-v1",
      JSON.stringify([{ name: "Unvalidated project" }]),
    );
    render(<WireforgeApp />);
    fireEvent.click(screen.getByText("Projects"));
    expect(screen.getByText("No saved projects yet")).toBeTruthy();
    expect(screen.queryByText("Unvalidated project")).toBeNull();
  });
  it("focuses the saved-project dialog and closes it with Escape", () => {
    // Arrange
    render(<WireforgeApp />);
    fireEvent.click(screen.getByText("Projects"));
    const dialog = screen.getByRole("dialog", { name: "Saved projects" });
    const closeButton = screen.getByLabelText("Close saved projects");
    expect(document.activeElement).toBe(closeButton);

    // Act
    fireEvent.keyDown(dialog, { key: "Escape" });

    // Assert
    expect(screen.queryByRole("dialog", { name: "Saved projects" })).toBeNull();
  });
});
