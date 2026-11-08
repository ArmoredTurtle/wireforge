import { svgString } from "./render";

const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

/** Canvas defaults to 96 dpi; mark these A4 pixels as 300 dpi for printing. */
async function pngPrintResolution(blob: Blob) {
  const data = await blob.arrayBuffer();
  const view = new DataView(data);
  const chunk = new ArrayBuffer(21);
  const resolution = new DataView(chunk);
  resolution.setUint32(0, 9);
  resolution.setUint32(4, 0x70485973); // pHYs
  resolution.setUint32(8, 11811); // 300 dpi, in pixels per metre
  resolution.setUint32(12, 11811);
  resolution.setUint8(16, 1);
  resolution.setUint32(17, crc32(new Uint8Array(chunk, 4, 13)));
  const parts: BlobPart[] = [data.slice(0, 33), chunk]; // signature + IHDR
  for (let offset = 33; offset < data.byteLength;) {
    const length = view.getUint32(offset) + 12;
    if (view.getUint32(offset + 4) !== 0x70485973)
      parts.push(data.slice(offset, offset + length));
    offset += length;
  }
  return new Blob(parts, { type: "image/png" });
}

/** Uncompressed ZIP: SVG and PNG pages download together without extra dependencies. */
export async function zipPages(files: { name: string; blob: Blob }[]) {
  const parts: BlobPart[] = [];
  const directory: BlobPart[] = [];
  let offset = 0;
  let directorySize = 0;
  for (const file of files) {
    const data = await file.blob.arrayBuffer();
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(new Uint8Array(data));
    const local = new ArrayBuffer(30);
    const header = new DataView(local);
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 0x800, true); // UTF-8 names
    header.setUint16(12, 33, true); // 1980-01-01
    header.setUint32(14, crc, true);
    header.setUint32(18, data.byteLength, true);
    header.setUint32(22, data.byteLength, true);
    header.setUint16(26, name.byteLength, true);
    parts.push(local, name, data);
    const central = new ArrayBuffer(46);
    const entry = new DataView(central);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    new Uint8Array(central, 8, 22).set(new Uint8Array(local, 6, 22));
    entry.setUint32(42, offset, true);
    directory.push(central, name);
    offset += 30 + name.byteLength + data.byteLength;
    directorySize += 46 + name.byteLength;
  }
  const end = new ArrayBuffer(22);
  const footer = new DataView(end);
  footer.setUint32(0, 0x06054b50, true);
  footer.setUint16(8, files.length, true);
  footer.setUint16(10, files.length, true);
  footer.setUint32(12, directorySize, true);
  footer.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: "application/zip" });
}

async function pngPage(svg: SVGSVGElement): Promise<Blob> {
  // A4 landscape at 300 pixels per inch; never stretch the source diagram.
  const canvas = document.createElement("canvas");
  canvas.width = 3508;
  canvas.height = 2480;
  const image = new Image();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(canvas.width));
  clone.setAttribute("height", String(canvas.height));
  const url = URL.createObjectURL(new Blob(
    [new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" },
  ));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render the diagram image."));
      image.src = url;
    });
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image export is unavailable in this browser.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Could not export the diagram image.")),
      "image/png",
    ));
    return await pngPrintResolution(blob);
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}

export async function exportDiagramImages(svgs: SVGSVGElement[], format: "svg" | "png") {
  if (!svgs.length) throw new Error("No diagram pages to export.");
  const pages: { name: string; blob: Blob }[] = [];
  // Render one page at a time to bound canvas memory for large harnesses.
  for (const [index, svg] of svgs.entries()) {
    pages.push({
      name: `page-${String(index + 1).padStart(3, "0")}.${format}`,
      blob: format === "svg"
        ? new Blob([svgString(svg)], { type: "image/svg+xml" })
        : await pngPage(svg),
    });
  }
  return {
    extension: pages.length === 1 ? format : `${format}.zip`,
    blob: pages.length === 1 ? pages[0].blob : await zipPages(pages),
  };
}
