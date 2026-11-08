import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createDemoProject } from "@/domain/project";
import { DiagramSvg } from "./render";
import { exportDiagramImages, zipPages } from "./export";

const sheet = () => new DOMParser().parseFromString(
  renderToStaticMarkup(<DiagramSvg project={createDemoProject()} />), "image/svg+xml",
).documentElement as unknown as SVGSVGElement;

describe("A4 image exports", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("preserves physical A4 dimensions in a single SVG", async () => {
    const result = await exportDiagramImages([sheet()], "svg");
    expect(result.extension).toBe("svg");
    expect(result.blob.type).toBe("image/svg+xml");
    const document = new DOMParser().parseFromString(await result.blob.text(), "image/svg+xml");
    expect(document.querySelector("parsererror")).toBeNull();
    expect(document.documentElement.getAttribute("width")).toBe("297mm");
    expect(document.documentElement.getAttribute("height")).toBe("210mm");
  });

  it("bundles all pages with stable filenames", async () => {
    const result = await exportDiagramImages([sheet(), sheet()], "svg");
    expect(result.extension).toBe("svg.zip");
    const data = new Uint8Array(await result.blob.arrayBuffer());
    const text = new TextDecoder().decode(data);
    expect(text).toContain("page-001.svg");
    expect(text).toContain("page-002.svg");
    expect(new DataView(data.buffer).getUint16(data.length - 12, true)).toBe(2);
  });

  it("writes valid ZIP lengths, offsets and the standard CRC32 check value", async () => {
    const archive = await zipPages([{ name: "test.txt", blob: new Blob(["123456789"]) }]);
    const bytes = await archive.arrayBuffer();
    const view = new DataView(bytes);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(14, true)).toBe(0xcbf43926);
    expect(view.getUint32(18, true)).toBe(9);
    const central = view.getUint32(bytes.byteLength - 6, true);
    expect(central).toBe(30 + 8 + 9);
    expect(view.getUint32(central, true)).toBe(0x02014b50);
    expect(view.getUint32(central + 16, true)).toBe(0xcbf43926);
    expect(view.getUint32(central + 42, true)).toBe(0);
    expect(view.getUint16(central + 28, true)).toBe(8);
  });

  it("exports PNGs at A4 proportions and releases the image URL", async () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({ drawImage, fillRect }) as unknown as CanvasRenderingContext2D);
    let dimensions: number[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (this: HTMLCanvasElement, callback) {
      dimensions = [this.width, this.height];
      const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII="), (c) => c.charCodeAt(0));
      callback(new Blob([png], { type: "image/png" }));
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:page");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.stubGlobal("Image", class { onload?: () => void; set src(_value: string) { this.onload?.(); } });
    const result = await exportDiagramImages([sheet()], "png");
    expect(dimensions).toEqual([3508, 2480]);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 3508, 2480);
    expect(result.blob.type).toBe("image/png");
    const metadata = new DataView(await result.blob.arrayBuffer());
    expect(metadata.getUint32(37)).toBe(0x70485973);
    expect(metadata.getUint32(41)).toBe(11811);
    expect(metadata.getUint32(45)).toBe(11811);
    expect(metadata.getUint8(49)).toBe(1);
    expect(revoke).toHaveBeenCalledWith("blob:page");
  });

  it("reports failed image loads and releases their URLs", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:failed");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.stubGlobal("Image", class { onerror?: () => void; set src(_value: string) { this.onerror?.(); } });
    await expect(exportDiagramImages([sheet()], "png")).rejects.toThrow("Could not render");
    expect(revoke).toHaveBeenCalledWith("blob:failed");
  });
});
