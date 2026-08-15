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
    },
    [project],
  );
  const update = useCallback(
    (fn: (p: HarnessProject) => HarnessProject) => commit(fn(project)),
    [commit, project],
  );
  const save = () => {
    const next = [...projects.filter((p) => p.id !== project.id), project];
    setProjects(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  const deleteSavedProject = (projectId: string) => {
    const next = projects.filter((p) => p.id !== projectId);
    setProjects(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) {
      future.current.push(project);
      setProject(prev);
    }
  };
  const redo = () => {
    const next = future.current.pop();
    if (next) {
      history.current.push(project);
      setProject(next);
    }
  };
  return {
    project,
    projects,
    update,
    setProject,
    save,
    deleteSavedProject,
    undo,
    redo,
    newProject: () => commit(createDemoProject()),
    clearProject: () => commit(createBlankProject()),
  };
}
