import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ProjectCard.css";
import { resolveMediaUrl } from "../lib/api";
import type { Project } from "../types/project";

type ProjectCardProps = {
  project: Project;
  onSelect?: (project: Project) => void;
};

export default function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onSelect) {
      onSelect(project);
      return;
    }
    navigate(`/projects/${project.id}`);
  };

  const galleryCover = project.gallery?.find((item) => Boolean(item));
  const thumbnail = resolveMediaUrl(project.heroImage || galleryCover);
  const likeCount = project.reactions?.applause ?? 0;
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
            {project.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="project-card__tag">
                {tag}
              </span>
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
        <div className="project-card__metric" aria-label="Applause">
          <span>👏</span>
          <strong>{likeCount}</strong>
        </div>
      </footer>
    </article>
  );
}
