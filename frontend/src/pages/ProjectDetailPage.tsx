import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import { toggleFollow } from "../lib/follow";
import type { Project, ProjectDetailResponse } from "../types/project";
import type { User } from "../types/user";
import "../styles/ProjectDetailPage.css";

type AlertState = {
  type: "success" | "error";
  message: string;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, updateUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [togglingSave, setTogglingSave] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<User | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);

  const canToggleSave = Boolean(token);

  const fetchProject = useCallback(async () => {
    if (!id) {
      setError("Project not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ProjectDetailResponse>(`/api/projects/${id}`, token ? { token } : undefined);
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load project");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    const ownerId = project?.owner && ("id" in project.owner && project.owner.id ? project.owner.id : (project.owner as unknown as { _id?: string })._id);

    if (!token || !project || project.isOwner || !ownerId) {
      setOwnerProfile(null);
      return;
    }

    let cancelled = false;

    async function loadOwner() {
      setLoadingOwner(true);
      try {
        const response = await apiFetch<{ user: User }>(`/api/users/${ownerId}`, { token });
        if (!cancelled) {
          setOwnerProfile(response.user);
        }
      } catch (err) {
        if (!cancelled) {
          setOwnerProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingOwner(false);
        }
      }
    }

    loadOwner();

    return () => {
      cancelled = true;
    };
  }, [project, token]);

  const handleSaveToggle = async () => {
    if (!project) return;
    if (!token) {
      setAlert({ type: "error", message: "Sign in to save projects." });
      return;
    }
    if (togglingSave) return;

    try {
      setTogglingSave(true);
      const path = `/api/projects/${project.id}/save`;
      if (project.isSaved) {
        await apiFetch(path, { method: "DELETE", token });
        setProject((prev) => (prev ? { ...prev, isSaved: false } : prev));
        setAlert({ type: "success", message: "Removed from saved." });
      } else {
        await apiFetch(path, { method: "POST", token });
        setProject((prev) => (prev ? { ...prev, isSaved: true } : prev));
        setAlert({ type: "success", message: "Saved for later." });
      }
    } catch (err) {
      setAlert({ type: "error", message: err instanceof Error ? err.message : "Unable to update saved state" });
    } finally {
      setTogglingSave(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !token || !project.isOwner) return;
    const confirmed = window.confirm("Delete this project? This action cannot be undone.");
    if (!confirmed) return;

    try {
      setDeleting(true);
      await apiFetch(`/api/projects/${project.id}`, { method: "DELETE", token });
      setAlert({ type: "success", message: "Project deleted." });
      navigate("/profile", { replace: true });
    } catch (err) {
      setAlert({ type: "error", message: err instanceof Error ? err.message : "Unable to delete project" });
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!project) return;
    navigate(`/projects/${project.id}/edit`);
  };

  const handleFollowToggle = async () => {
    if (!ownerProfile || !token || !ownerProfile.id) {
      return;
    }

    if (togglingFollow) {
      return;
    }

    try {
      setTogglingFollow(true);
      const response = await toggleFollow(ownerProfile.id, Boolean(ownerProfile.isFollowing), token);

      setOwnerProfile(response.target);
      updateUser(() => response.user);
      setAlert({
        type: "success",
        message: ownerProfile.isFollowing ? "Unfollowed builder." : "You are now following this builder.",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to update follow state",
      });
    } finally {
      setTogglingFollow(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <div style={{ textAlign: "center", color: "var(--page-muted)" }}>Loading project…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <div className="page-alert error">{error}</div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="page-shell">
        <div className="page-empty">Project unavailable.</div>
      </main>
    );
  }

  const galleryItems = (project.gallery || []).filter((item): item is string => Boolean(item));
  const hero = resolveMediaUrl(project.heroImage || galleryItems[0]);
  const reactions = project.reactions || { applause: 0, curiosity: 0, interest: 0 };
  const updatedDate = new Date(project.updatedAt);
  const lastUpdated = Number.isNaN(updatedDate.getTime())
    ? "Unknown"
    : updatedDate.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return (
    <main className="page-shell">
      <article className="project-detail">
        {hero ? (
          <div className="project-detail__hero">
            <img src={hero} alt="Project hero" />
          </div>
        ) : null}

        <header className="project-detail__header">
          <div>
            <p className="page-kicker">Project</p>
            <h1>{project.title}</h1>
            <div className="project-detail__badges">
              <span>{project.visibility === "private" ? "Private" : "Public"}</span>
              <span>{project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
            </div>
            <div className="project-detail__owner">
              <div className="project-detail__avatar">
                {project.owner?.avatar ? (
                  <img src={resolveMediaUrl(project.owner.avatar)} alt="" loading="lazy" />
                ) : (
                  <span>
                    {project.owner?.name?.slice(0, 1).toUpperCase() ||
                      project.owner?.username?.slice(0, 1).toUpperCase() ||
                      "?"}
                  </span>
                )}
              </div>
              <div>
                      {!project.isOwner && token ? (
                        <button
                          type="button"
                          className="page-button secondary"
                          onClick={handleFollowToggle}
                          disabled={loadingOwner || togglingFollow || !ownerProfile}
                          style={{ marginLeft: "auto" }}
                        >
                          {ownerProfile?.isFollowing
                            ? togglingFollow
                              ? "Updating…"
                              : "Unfollow"
                            : loadingOwner
                              ? "Loading…"
                              : "Follow"}
                        </button>
                      ) : null}
                <strong>{project.owner?.name || project.owner?.username || "Unknown"}</strong>
                <div>@{project.owner?.username || "anon"}</div>
              </div>
            </div>
          </div>

          <div className="project-detail__actions">
            {canToggleSave && (
              <button
                type="button"
                className="page-button secondary"
                onClick={handleSaveToggle}
                disabled={togglingSave}
              >
                {project.isSaved ? "Unsave" : "Save"}
              </button>
            )}
            {project.isOwner && (
              <>
                <button type="button" className="page-button secondary" onClick={handleEdit} disabled={deleting}>
                  Edit
                </button>
                <button type="button" className="page-button primary" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
        </header>

        {alert && <div className={`page-alert ${alert.type === "error" ? "error" : "success"}`}>{alert.message}</div>}

        <section className="project-detail__body">
          <div>
            <h2>Summary</h2>
            <p>{project.summary}</p>
          </div>

          {project.description ? (
            <div>
              <h2>Full description</h2>
              <p style={{ whiteSpace: "pre-line" }}>{project.description}</p>
            </div>
          ) : null}

          {project.tags?.length ? (
            <div>
              <h2>Tech stack</h2>
              <div className="project-detail__tags">
                {project.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ) : null}

          {project.links?.length ? (
            <div>
              <h2>Links</h2>
              <ul className="project-detail__links">
                {project.links.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {galleryItems.length ? (
            <div>
              <h2>Gallery</h2>
              <div className="project-detail__gallery">
                {galleryItems.map((item) => {
                  const mediaUrl = resolveMediaUrl(item);
                  if (!mediaUrl) return null;
                  return (
                    <button
                      key={item}
                      type="button"
                      className="project-detail__gallery-item"
                      onClick={() => window.open(mediaUrl, "_blank", "noopener")}
                      aria-label="Open project media"
                    >
                      <img src={mediaUrl} alt="Project media" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <section className="project-detail__meta">
          <div>
            <h3>Applause</h3>
            <strong>{reactions.applause}</strong>
          </div>
          <div>
            <h3>Curiosity</h3>
            <strong>{reactions.curiosity}</strong>
          </div>
          <div>
            <h3>Interest</h3>
            <strong>{reactions.interest}</strong>
          </div>
          <div>
            <h3>Last updated</h3>
            <span className="project-detail__meta-date">{lastUpdated}</span>
          </div>
        </section>
      </article>
    </main>
  );
}
