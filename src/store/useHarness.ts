"use client";
import { useCallback, useRef, useState } from "react";
import {
  createBlankProject,
  createDemoProject,
  normalizeProject,
} from "@/domain/project";
import { HarnessProject, projectSchema, rebuildNets } from "@/domain/model";
const KEY = "wireforge-projects-v1";
export function useHarness() {
  const [project, setProject] = useState<HarnessProject>(createDemoProject);
  const [isDirty, setIsDirty] = useState(false);
  const [projects, setProjects] = useState<HarnessProject[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.slice(-100).flatMap((candidate) => {
        const result = projectSchema.safeParse(candidate);
        return result.success ? [normalizeProject(result.data)] : [];
      });
    } catch {
      return [];
    }
  });
  const history = useRef<HarnessProject[]>([]);
  const future = useRef<HarnessProject[]>([]);
  const commit = useCallback(
    (next: HarnessProject) => {
      history.current = [...history.current.slice(-49), project];
      future.current = [];
      setProject({
        ...next,
        nets: rebuildNets(next.wires),
        updatedAt: new Date().toISOString(),
      });
      setIsDirty(true);
    },
    [project],
  );
  const update = useCallback(
    (fn: (p: HarnessProject) => HarnessProject) => commit(fn(project)),
    [commit, project],
  );
  const save = () => {
    const next = [...projects.filter((p) => p.id !== project.id), project];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setProjects(next);
      setIsDirty(false);
      return true;
    } catch {
      return false;
    }
  };
  const deleteSavedProject = (projectId: string) => {
    const next = projects.filter((p) => p.id !== projectId);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setProjects(next);
      return true;
    } catch {
      return false;
    }
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) {
      future.current.push(project);
      setProject(prev);
      setIsDirty(true);
    }
  };
  const redo = () => {
    const next = future.current.pop();
    if (next) {
      history.current.push(project);
      setProject(next);
      setIsDirty(true);
    }
  };
  return {
    project,
    isDirty,
    projects,
    update,
    replaceProject: (next: HarnessProject, dirty = true) => {
      setProject(next);
      setIsDirty(dirty);
    },
    save,
    deleteSavedProject,
    undo,
    redo,
    newProject: () => commit(createDemoProject()),
    clearProject: () => commit(createBlankProject()),
  };
}
