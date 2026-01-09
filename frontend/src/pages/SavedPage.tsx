import React, { useEffect, useState } from "react";
import ProjectCard from "../components/ProjectCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import type { Project } from "../types/project";

type SavedProjectsResponse = {
  projects: Project[];
};

export default function SavedPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSaved() {
      if (!token) {
        setError("Sign in to view saved projects.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch<SavedProjectsResponse>("/api/projects/saved", { token });
        if (!cancelled) {
          setProjects(response.projects || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load saved projects");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSaved();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Saved</p>
        <h1>Collections you are watching</h1>
        <p className="page-subtitle">Revisit projects you want to learn from or support.</p>
      </header>

      {error && <div className="page-alert error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--page-muted)" }}>Loading saved projects…</div>
      ) : projects.length === 0 ? (
        <div className="page-empty">You have not saved any projects yet.</div>
      ) : (
        <div className="page-grid page-grid--feed">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
