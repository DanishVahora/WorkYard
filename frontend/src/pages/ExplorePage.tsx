import React, { useEffect, useMemo, useState } from "react";
import ProjectCard from "../components/ProjectCard";
import { apiFetch } from "../lib/api";
import type { Project, ProjectListResponse } from "../types/project";

const PAGE_SIZE = 9;

export default function ExplorePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (loading || !hasMore) return;
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch<ProjectListResponse>(`/api/projects?page=${page}&limit=${PAGE_SIZE}`);
        if (cancelled) return;

        setProjects((prev) => (page === 1 ? response.projects : [...prev, ...response.projects]));
        const totalPages = response.pagination?.pages || 1;
        setHasMore(page < totalPages);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load projects");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [page]);

  const showLoadMore = useMemo(() => hasMore && projects.length > 0, [hasMore, projects.length]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Explore</p>
        <h1>Follow the builders shaping the next wave</h1>
        <p className="page-subtitle">
          Discover public launches, request intros, and follow roadmaps from founders shipping in public.
        </p>
      </header>

      {error && <div className="page-alert error">{error}</div>}

      <div className="page-grid page-grid--feed">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
        {loading && <span style={{ color: "var(--page-muted)" }}>Loading projects…</span>}
        {!loading && showLoadMore && (
          <button className="page-button secondary" onClick={() => setPage((prev) => prev + 1)}>
            Load more
          </button>
        )}
        {!loading && !showLoadMore && projects.length > 0 && (
          <span style={{ color: "var(--page-muted)" }}>You have reached the end of the list.</span>
        )}
        {!loading && projects.length === 0 && !error && (
          <div className="page-empty" style={{ marginTop: 0 }}>No projects published yet.</div>
        )}
      </div>
    </main>
  );
}
