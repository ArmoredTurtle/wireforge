"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Link2,
  GripVertical,
  Trash2,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Upload,
} from "lucide-react";
import { useHarness } from "@/store/useHarness";
import {
  connectorDefinitions,
  families,
  getDefinition,
} from "@/domain/connectors";
import {
  deserializeProject,
  deserializeProjectJson,
  remapWirePins,
  serializeProject,
  serializeProjectJson,
  suggestWireEndpoints,
  validateProject,
} from "@/domain/project";
import { DiagramSvg, svgString } from "@/diagram/render";
import { terminalEndpoint, uid } from "@/domain/model";
import { wireColors } from "@/config/wire-colors";
import { AppFooter, AppHeader } from "./AppChrome";
import { DiagramSettings } from "./DiagramSettings";
import { SavedProjectsDialog } from "./SavedProjectsDialog";
import {
  createCableBuilderShareUrl,
  importCableBuilderShareUrl,
  validateCableBuilderShareUrl,
} from "@/domain/cablebuilder";
const MAX_PROJECT_FILE_BYTES = 2 * 1024 * 1024;
const download = (name: string, data: Blob) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(data);
  a.download =
    name
      .replace(/ /g, "_")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 180) ||
    "wireforge-export";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
export function WireforgeApp() {
  const h = useHarness(),
    p = h.project,
    svgRef = useRef<SVGSVGElement>(null),
    fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [savedProjectsOpen, setSavedProjectsOpen] = useState(false);
  const canReplaceProject = () =>
    !h.isDirty || window.confirm("Discard unsaved changes?");
  const [connectorsCollapsed, setConnectorsCollapsed] = useState(false);
  const [wiresCollapsed, setWiresCollapsed] = useState(false);
  const [draggedWireId, setDraggedWireId] = useState<string | null>(null);
  const [dragOverWireId, setDragOverWireId] = useState<string | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) h.redo();
        else h.undo();
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });
  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest(".action-menu")) return;
      document.querySelectorAll<HTMLDetailsElement>(".action-menu[open]").forEach((menu) => {
        menu.removeAttribute("open");
      });
    };
    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);
  const updateConnector = (index: number, definitionId: string) =>
    h.update((old) => {
      const cs = [...old.connectors];
      cs[index] = { ...cs[index], definitionId };
      const def = getDefinition(definitionId)!;
      const terminals = old.terminals
        .filter((t) => t.connectorId !== cs[index].id)
        .concat(
          Array.from({ length: def.pinCount }, (_, i) => ({
            id: `${cs[index].id}-p${i + 1}`,
            connectorId: cs[index].id,
            pin: i + 1,
            label: "",
          })),
        );
      const wires = remapWirePins(old.wires, cs[index].id, def.pinCount).map(
        (w) => {
          const source = w.source;
          const dest = w.destination;
          const attached =
            (source.type === "terminal" && source.connectorId === cs[index].id) ||
            (dest?.type === "terminal" && dest.connectorId === cs[index].id);
          return {
            ...w,
            awg:
              attached && def.metadata?.gauge
                ? Number(def.metadata.gauge)
                : w.awg,
          };
        },
      );
      return { ...old, connectors: cs, terminals, wires };
    });
  const exportSvg = () => {
    if (svgRef.current)
      download(
        `${p.name}.svg`,
        new Blob([svgString(svgRef.current)], { type: "image/svg+xml" }),
      );
  };
  const exportPng = () => {
    if (!svgRef.current) return;
    const img = new Image();
    const url = URL.createObjectURL(
      new Blob([svgString(svgRef.current)], { type: "image/svg+xml" }),
    );
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 2000;
      c.height = 1240;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => b && download(`${p.name}.png`, b), "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  const importProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > MAX_PROJECT_FILE_BYTES)
        throw new Error("Project files must be 2 MB or smaller.");
      if (!canReplaceProject()) return;
      const raw = await f.text();
      const project = f.name.toLowerCase().endsWith(".json")
        ? deserializeProjectJson(raw)
        : deserializeProject(raw);
      h.replaceProject(project);
      setMessage("Project imported successfully.");
    } catch (err) {
      setMessage(
        `Import failed: ${err instanceof Error ? err.message : "Invalid file"}`,
      );
    }
    e.target.value = "";
  };
  const swap = () =>
    h.update((old) => ({
      ...old,
      connectors: [old.connectors[1], old.connectors[0]],
      wires: old.wires.map((w) => ({
        ...w,
        source: w.destination || w.source,
        destination: w.destination ? w.source : undefined,
      })),
    }));
  const addConnector = () =>
    h.update((old) => {
      const id = uid("conn"),
        definitionId = "jst-xh-4",
        reference = String.fromCharCode(65 + old.connectors.length),
        def = getDefinition(definitionId)!;
      return {
        ...old,
        connectors: [
          ...old.connectors,
          { id, definitionId, reference, view: "mating", x: 0, y: 0 },
        ],
        terminals: [
          ...old.terminals,
          ...Array.from({ length: def.pinCount }, (_, i) => ({
            id: `${id}-p${i + 1}`,
            connectorId: id,
            pin: i + 1,
            label: "",
          })),
        ],
      };
    });
  const removeConnector = (id: string) =>
    h.update((old) => ({
      ...old,
      connectors: old.connectors.filter((c) => c.id !== id),
      terminals: old.terminals.filter((t) => t.connectorId !== id),
      wires: old.wires
        .filter(
          (w) => !(w.source.type === "terminal" && w.source.connectorId === id),
        )
        .map((w) =>
          w.destination?.type === "terminal" && w.destination.connectorId === id
            ? { ...w, destination: undefined }
            : w,
        ),
    }));
  const sourceKey = (wire: (typeof p.wires)[number]) =>
    JSON.stringify(wire.source);
  const orderedWires = p.wires;
  const moveWire = (targetWireId: string) => {
    if (!draggedWireId || draggedWireId === targetWireId) return;
    h.update((project) => {
      const wires = [...project.wires];
      const from = wires.findIndex((wire) => wire.id === draggedWireId);
      const to = wires.findIndex((wire) => wire.id === targetWireId);
      if (from < 0 || to < 0) return project;
      const [moved] = wires.splice(from, 1);
      wires.splice(to, 0, moved);
      return { ...project, wires };
    });
    setDraggedWireId(null);
    setDragOverWireId(null);
  };
  const validationIssues = useMemo(() => validateProject(p), [p]);
  const openCableBuilder = async () => {
    const result = createCableBuilderShareUrl(p);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    const opened = window.open("about:blank", "_blank", "noopener,noreferrer");
    if (!opened) {
      setMessage("CableBuilder could not be opened. Please allow pop-ups for WireForge.");
      return;
    }
    const preflight = await validateCableBuilderShareUrl(result.url!);
    if (preflight.errors.length) {
      opened.close();
      setMessage(`CableBuilder export blocked: ${preflight.errors.join(" ")}`);
      return;
    }
    opened.location.href = result.url!;
    const notices = [...result.warnings, ...preflight.warnings];
    setMessage(
      notices.length
        ? `CableBuilder opened. ${notices.join(" ")}`
        : "CableBuilder opened in a new tab.",
    );
  };
  const importCableBuilder = async () => {
    const url = window.prompt("Paste a CableBuilder share URL:");
    if (!url || !canReplaceProject()) return;
    setMessage("Validating CableBuilder URL...");
    const result = await importCableBuilderShareUrl(url.trim());
    if (!result.project) {
      setMessage(`CableBuilder import blocked: ${result.errors.join(" ")}`);
      return;
    }
    h.replaceProject(result.project);
    setMessage(
      result.warnings.length
        ? `CableBuilder project imported. ${result.warnings.join(" ")}`
        : "CableBuilder project imported successfully.",
    );
  };
  const menuAction = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    action();
  };
  const toggleMenu = (event: React.MouseEvent<HTMLElement>) => {
    const currentMenu = event.currentTarget.closest("details");
    if (!currentMenu || currentMenu.open) return;
    currentMenu.parentElement
      ?.querySelectorAll<HTMLDetailsElement>(".action-menu[open]")
      .forEach((menu) => {
        if (menu !== currentMenu) menu.removeAttribute("open");
      });
  };
  return (
    <main>
      <AppHeader
        onNew={() => canReplaceProject() && h.newProject()}
        onSave={() => {
          setMessage(
            h.save()
              ? "Project saved locally."
              : "Save failed: Unable to save project in this browser.",
          );
        }}
        onOpenProjects={() => setSavedProjectsOpen(true)}
        onClear={() => {
          if (!canReplaceProject()) return;
          h.clearProject();
          setMessage("Started a blank harness. Undo is available.");
        }}
        onUndo={h.undo}
        onRedo={h.redo}
      />
      <div className="workspace">
        <section className="editor">
          <div className="title-row">
            <div>
              <span className="eyebrow">ACTIVE PROJECT</span>
              <input
                className="project-title"
                value={p.name}
                aria-label="Project name"
                onChange={(e) =>
                  h.update((x) => ({ ...x, name: e.target.value }))
                }
              />
            </div>
            <span className="status">LIVE</span>
          </div>
          <div className="section-toggle-row">
            <div>
              <span className="eyebrow">HARNESS HARDWARE</span>
              <h2>
                Connectors <small>{p.connectors.length}</small>
              </h2>
            </div>
            <button
              aria-expanded={!connectorsCollapsed}
              aria-controls="connector-editor"
              onClick={() => setConnectorsCollapsed((value) => !value)}
            >
              {connectorsCollapsed ? <ChevronRight /> : <ChevronDown />}
              {connectorsCollapsed ? "Show" : "Collapse"}
            </button>
          </div>
          {!connectorsCollapsed && (
            <div className="connector-grid" id="connector-editor">
              {p.connectors.map((c, i) => {
                const def = getDefinition(c.definitionId)!;
                return (
                  <div className="panel" key={c.id}>
                    <div className="panel-head">
                      <b>CONNECTOR {c.reference}</b>
                      <input
                        value={c.reference}
                        aria-label={`Connector ${c.reference} reference`}
                        onChange={(e) =>
                          h.update((x) => ({
                            ...x,
                            connectors: x.connectors.map((q, j) =>
                              j === i ? { ...q, reference: e.target.value } : q,
                            ),
                          }))
                        }
                      />
                    </div>
                    <label>
                      Family
                      <select
                        value={def.family}
                        onChange={(e) =>
                          updateConnector(
                            i,
                            connectorDefinitions.find(
                              (d) => d.family === e.target.value,
                            )!.id,
                          )
                        }
                      >
                        {families.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Variant
                      <select
                        value={c.definitionId}
                        onChange={(e) => updateConnector(i, e.target.value)}
                      >
                        {connectorDefinitions
                          .filter((d) => d.family === def.family)
                          .map((d) => (
                            <option value={d.id} key={d.id}>
                              {d.metadata?.gauge
                                ? `${d.metadata.gauge} AWG`
                                : `${d.pinCount}-pin · ${d.pitchMm} mm`}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      View
                      <select
                        value={c.view}
                        onChange={(e) =>
                          h.update((x) => ({
                            ...x,
                            connectors: x.connectors.map((q, j) =>
                              j === i
                                ? {
                                    ...q,
                                    view: e.target.value as typeof q.view,
                                  }
                                : q,
                            ),
                          }))
                        }
                      >
                        <option value="mating">Mating face</option>
                        <option value="wire-entry">Wire entry side</option>
                      </select>
                    </label>
                    <div className="connector-meta">
                      <b>{def.housingPartNumber}</b> ·{" "}
                      {def.sourceStatus === "manufacturer-verified"
                        ? "VERIFIED SOURCE"
                        : "GENERIC"}
                      <br />
                      {def.allowedAwg[0]}–{def.allowedAwg[1]} AWG · {def.rows}{" "}
                      row
                      {def.rows > 1 ? "s" : ""}
                    </div>
                    {p.connectors.length > 1 && (
                      <button
                        aria-label={`Remove connector ${c.reference}`}
                        onClick={() => removeConnector(c.id)}
                      >
                        <Trash2 /> Delete connector
                      </button>
                    )}
                  </div>
                );
              })}
              <button className="add-connector" onClick={addConnector}>
                <Plus /> Add connector
              </button>
              {p.connectors.length === 2 && (
                <button
                  className="swap"
                  onClick={swap}
                  aria-label="Swap connectors"
                >
                  <ArrowLeftRight />
                </button>
              )}
            </div>
          )}
          <section className="mapping">
            <div className="section-head">
              <div>
                <span className="eyebrow">NETLIST</span>
                <h2>Pin & wire mapping</h2>
              </div>
              <div className="section-actions">
                <button
                  aria-expanded={!wiresCollapsed}
                  aria-controls="wire-editor"
                  onClick={() => setWiresCollapsed((value) => !value)}
                >
                  {wiresCollapsed ? <ChevronRight /> : <ChevronDown />}
                  {wiresCollapsed ? "Show" : "Collapse"}
                </button>
                <button
                  className="primary"
                  onClick={() =>
                    h.update((x) => {
                      const endpoints = suggestWireEndpoints(x);
                      return {
                        ...x,
                        wires: [
                          ...x.wires,
                          {
                            id: uid("wire"),
                            source: endpoints.source,
                            destination: endpoints.destination,
                            color: "#f97316",
                            awg: 24,
                            lengthMm: 250,
                            label: "NEW",
                          },
                        ],
                      };
                    })
                  }
                >
                  <Plus />
                  Add wire
                </button>
              </div>
            </div>
            {!wiresCollapsed && (
              <div className="table" id="wire-editor">
                <div className="tr th">
                  <span>SOURCE</span>
                  <span>NET / SIGNAL</span>
                  <span>COLOR</span>
                  <span>GAUGE</span>
                  <span>LENGTH</span>
                  <span>DESTINATION</span>
                  <span />
                </div>
                {orderedWires.map((w, wi) => {
                  const sp =
                    w.source.type === "terminal"
                      ? Number(w.source.terminalId.split("-p").pop())
                      : 1;
                  const dp =
                    w.destination?.type === "terminal"
                      ? Number(w.destination.terminalId.split("-p").pop())
                      : 0;
                  const sourceConnectorId =
                    w.source.type === "terminal"
                      ? w.source.connectorId
                      : p.connectors[0].id;
                  const destinationConnectorId =
                    w.destination?.type === "terminal"
                      ? w.destination.connectorId
                      : "";
                  const peers = orderedWires.filter(
                    (q) => sourceKey(q) === sourceKey(w),
                  );
                  const same = peers.length > 1;
                  const firstInGroup =
                    orderedWires.findIndex(
                      (q) => sourceKey(q) === sourceKey(w),
                    ) === wi;
                  const branchIndex = peers.findIndex((q) => q.id === w.id) + 1;
                  const netLabels = [
                    ...new Set(peers.map((q) => q.label).filter(Boolean)),
                  ];
                  return (
                    <Fragment key={w.id}>
                      <div
                        className={`tr ${same ? "branch-row" : ""} ${dragOverWireId === w.id ? "drag-over" : ""}`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverWireId(w.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          moveWire(w.id);
                        }}
                      >
                        <button
                          className="drag-handle"
                          draggable
                          aria-label={`Reorder wire ${wi + 1}`}
                          title="Drag to reorder wire layer"
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            setDraggedWireId(w.id);
                          }}
                          onDragEnd={() => {
                            setDraggedWireId(null);
                            setDragOverWireId(null);
                          }}
                        >
                          <GripVertical />
                        </button>
                        <div
                          className="group-source-inline mobile-field"
                          data-label="Source"
                        >
                          <select
                            aria-label={`Wire ${wi + 1} source`}
                            value={`${sourceConnectorId}:${sp}`}
                            onChange={(e) =>
                              h.update((x) => ({
                                ...x,
                                wires: x.wires.map((q) =>
                                  q.id === w.id
                                    ? {
                                        ...q,
                                        source: terminalEndpoint(
                                          e.target.value.split(":")[0],
                                          +e.target.value.split(":")[1],
                                        ),
                                        sourcePinMemory: undefined,
                                      }
                                    : q,
                                ),
                              }))
                            }
                          >
                            {p.connectors.flatMap((connector) =>
                              Array.from(
                                {
                                  length: getDefinition(connector.definitionId)!
                                    .pinCount,
                                },
                                (_, pin) => (
                                  <option
                                    key={`${connector.id}-${pin + 1}`}
                                    value={`${connector.id}:${pin + 1}`}
                                  >
                                    {connector.reference}
                                    {pin + 1}
                                  </option>
                                ),
                              ),
                            )}
                          </select>
                          {same && (
                            <small>
                              {firstInGroup
                                ? `${peers.length} DEST.`
                                : `DEST ${branchIndex}`}
                            </small>
                          )}
                          {same && firstInGroup && netLabels.length > 1 && (
                            <small className="net-review">REVIEW LABELS</small>
                          )}
                        </div>
                        <div className="mobile-field" data-label="Net / signal">
                          <input
                            aria-label={`Wire ${wi + 1} label`}
                            value={w.label}
                            onChange={(e) =>
                              h.update((x) => ({
                                ...x,
                                wires: x.wires.map((q) =>
                                  q.id === w.id
                                    ? { ...q, label: e.target.value }
                                    : q,
                                ),
                              }))
                            }
                          />
                          {same && (
                            <small className="branch-tag">
                              FROM SHARED SOURCE
                            </small>
                          )}
                        </div>
                        <div
                          className="color-cell mobile-field"
                          data-label="Color"
                        >
                          <input
                            type="color"
                            aria-label={`Wire ${wi + 1} color`}
                            value={w.color}
                            onChange={(e) =>
                              h.update((x) => ({
                                ...x,
                                wires: x.wires.map((q) =>
                                  q.id === w.id
                                    ? { ...q, color: e.target.value }
                                    : q,
                                ),
                              }))
                            }
                          />
                          <select
                            value={w.color}
                            aria-label={`Wire ${wi + 1} palette`}
                            onChange={(e) =>
                              h.update((x) => ({
                                ...x,
                                wires: x.wires.map((q) =>
                                  q.id === w.id
                                    ? { ...q, color: e.target.value }
                                    : q,
                                ),
                              }))
                            }
                          >
                            {wireColors.map(([n, c]) => (
                              <option value={c} key={c}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mobile-field" data-label="Gauge (AWG)">
                          <input
                            type="number"
                            aria-label={`Wire ${wi + 1} gauge`}
                            value={w.awg}
                            min="10"
                            max="40"
                            onChange={(e) =>
                              h.update((x) => ({
                                ...x,
                                wires: x.wires.map((q) =>
                                  q.id === w.id
                                    ? { ...q, awg: +e.target.value }
                                    : q,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="unit mobile-field" data-label="Length">
                          <input
                            type="number"
                            aria-label={`Wire ${wi + 1} length`}
                            value={w.lengthMm}
                            min="1"
                            onChange={(e) => {
                              const n = +e.target.value;
                              if (n > 0)
                                h.update((x) => ({
                                  ...x,
                                  wires: x.wires.map((q) =>
                                    q.id === w.id ? { ...q, lengthMm: n } : q,
                                  ),
                                }));
                            }}
                          />
                          <span>mm</span>
                        </div>
                        <div
                          className="mobile-field"
                          data-label="Destination"
                        >
                          <select
                            aria-label={`Wire ${wi + 1} destination`}
                            value={
                              destinationConnectorId
                                ? `${destinationConnectorId}:${dp}`
                                : ""
                            }
                            onChange={(e) =>
                              h.update((x) => ({
                                ...x,
                                wires: x.wires.map((q) =>
                                  q.id === w.id
                                    ? {
                                        ...q,
                                        destination: e.target.value
                                          ? terminalEndpoint(
                                              e.target.value.split(":")[0],
                                              +e.target.value.split(":")[1],
                                            )
                                          : undefined,
                                        destinationPinMemory: undefined,
                                      }
                                    : q,
                                ),
                              }))
                            }
                          >
                            <option value="">Unconnected</option>
                            {p.connectors.flatMap((connector) =>
                              Array.from(
                                {
                                  length: getDefinition(
                                    connector.definitionId,
                                  )!.pinCount,
                                },
                                (_, pin) => (
                                  <option
                                    key={`${connector.id}-${pin + 1}`}
                                    value={`${connector.id}:${pin + 1}`}
                                  >
                                    {connector.reference}
                                    {pin + 1}
                                  </option>
                                ),
                              ),
                            )}
                          </select>
                        </div>
                        <div
                          className="row-actions mobile-field"
                          data-label="Actions"
                        >
                          <button
                            aria-label={`Branch wire ${wi + 1}`}
                            title="Add destination branch"
                            onClick={() =>
                              h.update((x) => ({
                                ...x,
                                wires: (() => {
                                  const wires = [...x.wires];
                                  const lastPeer = wires.reduce(
                                    (last, candidate, index) =>
                                      sourceKey(candidate) === sourceKey(w)
                                        ? index
                                        : last,
                                    -1,
                                  );
                                  wires.splice(lastPeer + 1, 0, {
                                    ...w,
                                    id: uid("wire"),
                                    destination: terminalEndpoint(
                                      destinationConnectorId ||
                                        sourceConnectorId,
                                      Math.min(
                                        getDefinition(
                                          x.connectors.find(
                                            (c) =>
                                              c.id ===
                                              (destinationConnectorId ||
                                                sourceConnectorId),
                                          )!.definitionId,
                                        )!.pinCount,
                                        (dp || 0) + 1 || 1,
                                      ),
                                    ),
                                  });
                                  return wires;
                                })(),
                              }))
                            }
                          >
                            <Plus />
                          </button>
                          <button
                            aria-label={`Remove wire ${wi + 1}`}
                            onClick={() =>
                              h.update((x) => ({
                                ...x,
                                wires: x.wires.filter((q) => q.id !== w.id),
                              }))
                            }
                          >
                            <X />
                          </button>
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}
          </section>
        </section>
        <aside className="preview">
          <div className="preview-head">
            <div>
              <span className="eyebrow">DOCUMENT PREVIEW</span>
              <h2>Technical diagram</h2>
            </div>
            <div className="exports">
              <details className="action-menu">
                <summary onClick={toggleMenu}>
                  <Download />
                  Export
                  <ChevronDown />
                </summary>
                <div className="action-menu-items">
                  <button onClick={(event) => menuAction(event, exportSvg)}>
                    <Download />
                    SVG
                  </button>
                  <button onClick={(event) => menuAction(event, exportPng)}>
                    <Download />
                    PNG
                  </button>
                  <button
                    onClick={(event) =>
                      menuAction(event, () =>
                        download(
                          `${p.name}.toml`,
                          new Blob([serializeProject(p)], {
                            type: "application/toml",
                          }),
                        ),
                      )
                    }
                  >
                    <Download />
                    TOML
                  </button>
                  <button
                    onClick={(event) =>
                      menuAction(event, () =>
                        download(
                          `${p.name}.json`,
                          new Blob([serializeProjectJson(p)], {
                            type: "application/json",
                          }),
                        ),
                      )
                    }
                  >
                    <Download />
                    JSON
                  </button>
                </div>
              </details>
              <details className="action-menu">
                <summary onClick={toggleMenu}>
                  <Link2 />
                  CableBuilder
                  <ChevronDown />
                </summary>
                <div className="action-menu-items">
                  <button onClick={(event) => menuAction(event, openCableBuilder)}>
                    <Link2 />
                    Send to CableBuilder
                  </button>
                  <button onClick={(event) => menuAction(event, importCableBuilder)}>
                    <Link2 />
                    Import URL
                  </button>
                </div>
              </details>
              <button onClick={() => fileRef.current?.click()}>
                <Upload />
                Import file
              </button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept=".toml,.json,application/json,application/toml,text/plain"
                onChange={importProject}
              />
            </div>
          </div>
          <div className="canvas">
            <DiagramSvg project={p} svgRef={svgRef} />
          </div>
          <DiagramSettings
            layout={p.layout}
            onChange={(key, enabled) =>
              h.update((x) => ({
                ...x,
                layout: { ...x.layout, [key]: enabled },
              }))
            }
          />
          <div className="validation">
            {validationIssues.length ? (
              <>
                <b>{validationIssues.length} documentation warning(s)</b>
                {validationIssues.map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </>
            ) : (
              <b>✓ Harness validation passed</b>
            )}
          </div>
          {message && (
            <div className="toast" role="status" onClick={() => setMessage("")}>
              {message}
            </div>
          )}
        </aside>
      </div>
      <AppFooter
        connectorCount={p.connectors.length}
        wireCount={p.wires.length}
      />
      {savedProjectsOpen && (
        <SavedProjectsDialog
          projects={h.projects}
          activeProjectId={p.id}
          onClose={() => setSavedProjectsOpen(false)}
          onDelete={(projectId) => {
            setMessage(
              h.deleteSavedProject(projectId)
                ? "Saved project deleted from this browser."
                : "Delete failed: Unable to update projects in this browser.",
            );
          }}
          onLoad={(project) => {
            if (!canReplaceProject()) return;
            h.replaceProject(project, false);
            setSavedProjectsOpen(false);
            setMessage(`Loaded ${project.name}.`);
          }}
        />
      )}
    </main>
  );
}
