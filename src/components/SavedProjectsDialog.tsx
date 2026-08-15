import { FolderOpen, Trash2, X } from "lucide-react";
import type { HarnessProject } from "@/domain/model";

export function SavedProjectsDialog({
  projects,
  activeProjectId,
  onLoad,
  onDelete,
  onClose,
}: {
  projects: HarnessProject[];
  activeProjectId: string;
  onLoad: (project: HarnessProject) => void;
  onDelete: (projectId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="saved-projects-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-projects-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div>
            <span className="eyebrow">LOCAL STORAGE</span>
            <h2 id="saved-projects-title">Saved projects</h2>
          </div>
          <button aria-label="Close saved projects" onClick={onClose}>
            <X />
          </button>
        </div>
        {projects.length === 0 ? (
          <div className="empty-projects">
            <FolderOpen />
            <b>No saved projects yet</b>
            <span>Use Save to keep the current harness in this browser.</span>
          </div>
        ) : (
          <div className="saved-project-list">
            {[...projects]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((project) => (
                <div className="saved-project-row" key={project.id}>
                  <button
                    className="saved-project"
                    onClick={() => onLoad(project)}
                  >
                    <span>
                      <b>{project.name}</b>
                      <small>
                        {project.connectors.length} connectors ·{" "}
                        {project.wires.length} wires
                      </small>
                    </span>
                    <span className="saved-project-meta">
                      {project.id === activeProjectId && <em>ACTIVE</em>}
                      <time dateTime={project.updatedAt}>
                        {new Date(project.updatedAt).toLocaleString()}
                      </time>
                    </span>
                  </button>
                  <button
                    className="delete-saved-project"
                    aria-label={`Delete saved project ${project.name}`}
                    title="Delete saved project"
                    onClick={() => onDelete(project.id)}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
