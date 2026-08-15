import Image from "next/image";
import {
  Eraser,
  FilePlus2,
  FolderOpen,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";

type AppHeaderProps = {
  onNew: () => void;
  onSave: () => void;
  onOpenProjects: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

export function AppHeader(props: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <Image
          className="brand-mark"
          src="/at-logo-mark.svg"
          width={28}
          height={35}
          alt="ArmoredTurtle"
          priority
        />
        <div>
          <b>WIREFORGE</b>
          <small>AN ARMOREDTURTLE TOOL</small>
        </div>
      </div>
      <div className="toolbar">
        <ThemeSelector />
        <button onClick={props.onNew}>
          <FilePlus2 /> New
        </button>
        <button onClick={props.onSave}>
          <Save /> Save
        </button>
        <button onClick={props.onOpenProjects}>
          <FolderOpen /> Projects
        </button>
        <button onClick={props.onClear}>
          <Eraser /> Clear fields
        </button>
        <button aria-label="Undo" onClick={props.onUndo}>
          <Undo2 />
        </button>
        <button aria-label="Redo" onClick={props.onRedo}>
          <Redo2 />
        </button>
      </div>
    </header>
  );
}

export function AppFooter({
  connectorCount,
  wireCount,
}: {
  connectorCount: number;
  wireCount: number;
}) {
  return (
    <footer className="app-footer">
      <span>WIREFORGE · LOCAL PROJECT</span>
      <span>
        {connectorCount} CONNECTORS · {wireCount} WIRES
      </span>
      <span>DATA STAYS IN THIS BROWSER</span>
      <a
        className="github-link"
        href="https://github.com/ArmoredTurtle/wireforge"
        target="_blank"
        rel="noreferrer"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.57 9.57 0 0 1 12 6.82c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.77c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
          />
        </svg>
        VIEW SOURCE ON GITHUB
      </a>
    </footer>
  );
}
