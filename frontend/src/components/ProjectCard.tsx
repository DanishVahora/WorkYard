import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProjectCard.css";
import { resolveMediaUrl, toggleProjectLike } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Project } from "../types/project";

type ProjectCardProps = {
  project: Project;
  onSelect?: (project: Project) => void;
};

export default function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [liked, setLiked] = useState(project.isLiked);
  const [likesCount, setLikesCount] = useState(project.likesCount);
  const [liking, setLiking] = useState(false);

  const handleClick = () => {
    if (onSelect) {
      onSelect(project);
      return;
    }
    navigate(`/projects/${project.id}`);
  };

  const handleTagNavigate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, tag: string) => {
      event.preventDefault();
      event.stopPropagation();
      const normalized = tag.startsWith("#") ? tag.slice(1) : tag;
      if (!normalized) return;
      navigate(`/explore?tag=${encodeURIComponent(normalized)}`);
    },
    [navigate]
  );

  useEffect(() => {
    setLiked(project.isLiked);
    setLikesCount(project.likesCount);
  }, [project.isLiked, project.likesCount]);

  const handleLikeToggle = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!token || liking) {
        if (!token) {
          navigate("/login");
        }
        return;
      }

      try {
        setLiking(true);
        const response = await toggleProjectLike(project.id, liked, token);
        setLiked(response.project.isLiked);
        setLikesCount(response.project.likesCount);
      } catch (err) {
        console.warn("Unable to toggle like", err);
      } finally {
        setLiking(false);
      }
    },
    [liked, liking, navigate, project.id, token]
  );

  const galleryCover = project.gallery?.find((item) => Boolean(item));
  const thumbnail = resolveMediaUrl(project.heroImage || galleryCover);
  const summary = project.summary?.length > 140 ? `${project.summary.slice(0, 137)}…` : project.summary;

  return (
    <article className="project-card" onClick={handleClick} role="button" tabIndex={0} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    }}>
      {thumbnail ? (
        <div className="project-card__thumb">
          <img src={thumbnail} alt="" loading="lazy" />
        </div>
      ) : (
        <div className="project-card__thumb project-card__thumb--placeholder">
          <span>{project.title.slice(0, 1).toUpperCase()}</span>
        </div>
      )}

      <div className="project-card__body">
        <h3>{project.title}</h3>
        <p>{summary}</p>
        {project.tags?.length ? (
          <div className="project-card__tags">
            {project.tags.filter(Boolean).slice(0, 4).map((tag) => (
              <button
                key={tag}
                type="button"
                className="project-card__tag"
                onClick={(event) => handleTagNavigate(event, tag)}
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <footer className="project-card__footer">
        <div className="project-card__owner">
          <div className="project-card__avatar">
            {project.owner?.avatar ? (
              <img src={resolveMediaUrl(project.owner.avatar)} alt="" loading="lazy" />
            ) : (
              <span>{project.owner?.name?.slice(0, 1).toUpperCase() || project.owner?.username?.slice(0, 1).toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <strong>{project.owner?.name || project.owner?.username || "Unknown"}</strong>
            <div>@{project.owner?.username || "anon"}</div>
          </div>
        </div>
          <button
            type="button"
            className="project-card__like"
            onClick={handleLikeToggle}
            disabled={liking}
            aria-pressed={liked}
            aria-label={liked ? "Unlike project" : "Like project"}
          >
            <span aria-hidden className={`project-card__like-heart${liked ? " is-liked" : ""}`}>
              ❤
            </span>
            <strong>{likesCount}</strong>
            <span className="project-card__like-label">{likesCount === 1 ? "Like" : "Likes"}</span>
          </button>
      </footer>
    </article>
  );
}
