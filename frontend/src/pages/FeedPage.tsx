import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, resolveMediaUrl, toggleProjectLike, addProjectComment } from "../lib/api";
import { toggleFollow } from "../lib/follow";
import { useAuth } from "../context/AuthContext";
import type { Project, ProjectListResponse } from "../types/project";
import type { UserSummary } from "../types/user";
import "../styles/FeedPage.css";

const PAGE_SIZE = 10;

type FeedProject = Project & {
  coverImage?: string | null;
};

export default function FeedPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<FeedProject[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserSummary[]>([]);
  const [expandedBodies, setExpandedBodies] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const currentUserId = user?.id;

  // Load projects feed
  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (loading || !hasMore || !token) return;
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sort: "-createdAt",
        });
        const response = await apiFetch<ProjectListResponse>(
          `/api/projects?${params.toString()}`,
          { token }
        );
        if (cancelled) return;

        setProjects((prev) =>
          page === 1 ? response.projects : [...prev, ...response.projects]
        );
        const totalPages = response.pagination?.pages || 1;
        setHasMore(page < totalPages);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load feed");
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
  }, [page, token]);

  // Load suggested users
  useEffect(() => {
    let cancelled = false;

    async function loadSuggested() {
      if (!token || !currentUserId) return;
      try {
        const response = await apiFetch<{ users: UserSummary[] }>(
          `/api/users/search?q=a&limit=12`,
          { token }
        );
        if (!cancelled) {
          const filtered = (response.users || []).filter((person) => {
            const pid = person.id || (person as any)?._id;
            if (!pid) return false;
            if (pid === currentUserId) return false;
            return !person.isFollowing;
          });
          setSuggestedUsers(filtered);
        }
      } catch (err) {
        console.warn("Failed to load suggested users", err);
      }
    }

    loadSuggested();
    return () => {
      cancelled = true;
    };
  }, [token, currentUserId]);

  const handleLike = async (projectId: string, isLiked: boolean) => {
    if (!token) return;
    try {
      await toggleProjectLike(projectId, isLiked, token);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                isLiked: !isLiked,
                likesCount: isLiked ? (p.likesCount || 0) - 1 : (p.likesCount || 0) + 1,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to toggle like", err);
    }
  };

  const handleComment = async (projectId: string) => {
    if (!token || !commentText[projectId]?.trim()) return;
    try {
      await addProjectComment(projectId, commentText[projectId].trim(), token);
      setCommentText((prev) => ({ ...prev, [projectId]: "" }));
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, commentCount: (p.commentCount || 0) + 1 }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!token) return;
    try {
      await toggleFollow(userId, isFollowing, token);
      setSuggestedUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isFollowing: !isFollowing } : u
        )
      );
    } catch (err) {
      console.error("Failed to toggle follow", err);
    }
  };

  const handleShare = (projectId: string) => {
    navigate(`/messages?share=${projectId}`);
  };

  const renderDescription = (project: FeedProject) => {
    const body = project.summary || project.description || "";
    if (!body) return null;
    const MAX_LEN = 220;
    const isExpanded = expandedBodies[project.id] || false;
    if (body.length <= MAX_LEN) return <p className="feed-item__description">{body}</p>;
    return (
      <div className="feed-item__description">
        <span>{isExpanded ? body : `${body.slice(0, MAX_LEN)}…`}</span>
        <button
          type="button"
          className="feed-item__toggle"
          onClick={() =>
            setExpandedBodies((prev) => ({ ...prev, [project.id]: !isExpanded }))
          }
        >
          {isExpanded ? "View less" : "View more"}
        </button>
      </div>
    );
  };

  return (
    <main className="feed-page">
      <div className="feed-container">
        {/* Left Summary Panel */}
        <aside className="feed-left">
          <div className="feed-profile-card">
            <div className="feed-profile-cover" aria-hidden />
            <div className="feed-profile-body">
              <img
                src={resolveMediaUrl(user?.avatar) || "/placeholder-avatar.svg"}
                alt={user?.name || user?.username || "You"}
                className="feed-profile-avatar"
              />
              <h3 className="feed-profile-name">{user?.name || user?.username || "You"}</h3>
              <p className="feed-profile-username">@{user?.username || "username"}</p>
              <div className="feed-profile-stats">
                <div>
                  <span className="label">Followers</span>
                  <strong>{(user as any)?.followersCount ?? "–"}</strong>
                </div>
                <div>
                  <span className="label">Following</span>
                  <strong>{(user as any)?.followingCount ?? "–"}</strong>
                </div>
                <div>
                  <span className="label">Projects</span>
                  <strong>{(user as any)?.projects?.length ?? "–"}</strong>
                </div>
              </div>
            </div>
          </div>
        </aside>
        {/* Main Feed */}
        <section className="feed-main">
          {/* Composer bar */}
          <div className="feed-composer">
            <div className="feed-composer__input" onClick={() => navigate("/projects/new")}>Start a post</div>
            <div className="feed-composer__actions">
              <button type="button">Photo</button>
              <button type="button">Video</button>
              <button type="button">Write</button>
            </div>
          </div>
          {error && <div className="page-alert error">{error}</div>}

          {projects.length === 0 && !loading && (
            <div className="feed-empty">
              <p>No projects yet. Start following people to see their updates!</p>
            </div>
          )}

          <div className="feed-list">
            {projects.map((project) => (
              <article key={project.id} className="feed-item">
                {/* Header */}
                <div className="feed-item__header">
                  <div className="feed-item__author">
                    <img
                      src={resolveMediaUrl(project.owner?.avatar) || "/placeholder-avatar.svg"}
                      alt={project.owner?.name || "User"}
                      className="feed-item__avatar"
                    />
                    <div className="feed-item__info">
                      <p className="feed-item__name">{project.owner?.name || project.owner?.username}</p>
                      <p className="feed-item__meta">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    className="feed-item__action"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    View
                  </button>
                </div>

                {/* Content */}
                <div className="feed-item__content">
                  <h3 className="feed-item__title">{project.title}</h3>
                  {renderDescription(project)}

                  {(() => {
                    const cover = project.heroImage || project.gallery?.[0] || project.coverImage;
                    if (!cover) return null;
                    return (
                      <div className="feed-item__media">
                        <img
                          src={resolveMediaUrl(cover)}
                          alt={project.title}
                          className="feed-item__image"
                        />
                      </div>
                    );
                  })()}

                  {project.tags && project.tags.length > 0 && (
                    <div className="feed-item__tags">
                      {project.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="feed-item__tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer - Actions */}
                <div className="feed-item__footer">
                  <div className="feed-item__stats">
                    <button
                      className={`feed-action ${project.isLiked ? "is-active" : ""}`}
                      onClick={() => handleLike(project.id, project.isLiked || false)}
                      title="Like"
                    >
                      <span>👍</span>
                      <span>{project.likesCount || 0}</span>
                    </button>
                    <button
                      className="feed-action"
                      onClick={() => navigate(`/projects/${project.id}#comments`)}
                      title="Comment"
                    >
                      <span>💬</span>
                      <span>{project.commentCount || 0}</span>
                    </button>
                    <button
                      className="feed-action"
                      onClick={() => handleShare(project.id)}
                      title="Share"
                    >
                      <span>✉️</span>
                    </button>
                  </div>
                </div>

                {/* Comment Input */}
                {token && (
                  <div className="feed-item__comment-input">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText[project.id] || ""}
                      onChange={(e) =>
                        setCommentText((prev) => ({
                          ...prev,
                          [project.id]: e.target.value,
                        }))
                      }
                      className="feed-item__input"
                    />
                    <button
                      className="feed-item__submit"
                      onClick={() => handleComment(project.id)}
                      disabled={!commentText[project.id]?.trim()}
                    >
                      Post
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {loading && (
            <div className="feed-loading">
              <span>Loading projects…</span>
            </div>
          )}

          {!loading && hasMore && projects.length > 0 && (
            <div className="feed-load-more">
              <button
                className="page-button secondary"
                onClick={() => setPage((prev) => prev + 1)}
              >
                Load more
              </button>
            </div>
          )}

          {!loading && !hasMore && projects.length > 0 && (
            <div className="feed-end">
              <span>You've seen all projects</span>
            </div>
          )}
        </section>

        {/* Sidebar - Suggested People */}
        <aside className="feed-sidebar">
          <div className="feed-sidebar__header">
            <h2>Suggested People</h2>
            <p>Discover new builders</p>
          </div>

          <div className="feed-sidebar__list">
            {suggestedUsers.length === 0 ? (
              <p className="feed-sidebar__empty">No suggestions at the moment</p>
            ) : (
              suggestedUsers.map((person) => (
                <div key={person.id} className="feed-suggestion">
                  <div className="feed-suggestion__header">
                    <img
                      src={resolveMediaUrl(person.avatar) || "/placeholder-avatar.svg"}
                      alt={person.name || person.username}
                      className="feed-suggestion__avatar"
                    />
                    <div
                      className="feed-suggestion__info"
                      onClick={() => navigate(`/users/${person.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <p className="feed-suggestion__name">{person.name || person.username}</p>
                      <p className="feed-suggestion__username">@{person.username}</p>
                    </div>
                  </div>

                  <button
                    className={`feed-suggestion__follow ${
                      person.isFollowing ? "is-following" : ""
                    }`}
                    onClick={() =>
                      handleFollow(person.id || "", person.isFollowing || false)
                    }
                  >
                    {person.isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
