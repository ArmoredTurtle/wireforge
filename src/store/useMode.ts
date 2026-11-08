"use client";

import { useEffect, useRef, useState } from "react";
import type { HarnessProject } from "@/domain/model";
import type { EditingMode } from "@/domain/mode";

const STORAGE_KEY = "wireforge-mode";

export function useMode(
  project: HarnessProject,
  update: (change: (project: HarnessProject) => HarnessProject) => void,
) {
  const [browserMode, setBrowserMode] = useState<EditingMode>("standard");

  const selectedInSession = useRef(false);

  useEffect(() => {
    // Defer browser preferences until after the matching server/client render.
    const timer = window.setTimeout(() => {
      if (selectedInSession.current) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "standard" || saved === "advanced") setBrowserMode(saved);
      } catch {
        // Session preferences still work when storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const mode = project.layout.mode ?? browserMode;
  const pinned = project.layout.mode !== undefined;

  function selectMode(next: EditingMode) {
    selectedInSession.current = true;
    setBrowserMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the session choice even if it cannot be persisted.
    }
    if (pinned && project.layout.mode !== next) {
      update((current) => ({ ...current, layout: { ...current.layout, mode: next } }));
    }
  }

  function setPinned(remember: boolean) {
    if (remember === pinned) return;
    update((current) => {
      const layout = { ...current.layout };
      if (remember) layout.mode = mode;
      else delete layout.mode;
      return { ...current, layout };
    });
  }

  return { mode, pinned, selectMode, setPinned };
}
