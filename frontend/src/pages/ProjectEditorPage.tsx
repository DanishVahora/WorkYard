import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import type { Project, ProjectDetailResponse } from "../types/project";

type EditorMode = "create" | "edit";

type FormState = {
  title: string;
  summary: string;
  description: string;
  tags: string;
  visibility: "public" | "private";
  githubUrl: string;
  liveUrl: string;
  otherLinks: string;
};

type ProjectEditorPageProps = {
  mode: EditorMode;
};

const defaultForm: FormState = {
  title: "",
  summary: "",
  description: "",
  tags: "",
  visibility: "public",
  githubUrl: "",
  liveUrl: "",
  otherLinks: "",
};

const parseList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const toFormState = (project: Project): FormState => {
  const tags = project.tags?.join(", ") || "";
  const links = project.links || [];
  const githubLink = links.find((link) => link.toLowerCase().includes("github")) || "";
  const liveLink = links.find((link) => link !== githubLink) || "";
  const remaining = links.filter((link) => link !== githubLink && link !== liveLink);

  return {
    title: project.title || "",
    summary: project.summary || "",
    description: project.description || "",
    tags,
    visibility: project.visibility === "private" ? "private" : "public",
    githubUrl: githubLink,
    liveUrl: liveLink,
    otherLinks: remaining.join("\n"),
  };
};

export default function ProjectEditorPage({ mode }: ProjectEditorPageProps) {
  const isEdit = mode === "edit";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(isEdit);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [existingHero, setExistingHero] = useState<string | undefined>(undefined);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroObjectUrl, setHeroObjectUrl] = useState<string | null>(null);
  const [removeHero, setRemoveHero] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (heroObjectUrl) {
        URL.revokeObjectURL(heroObjectUrl);
      }
    };
  }, [heroObjectUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      if (!isEdit) return;
      if (!id) {
        setMessage("Missing project identifier");
        setStatus("error");
        setLoading(false);
        return;
      }
      if (!token) {
        setMessage("Sign in to edit your project.");
        setStatus("error");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiFetch<ProjectDetailResponse>(`/api/projects/${id}`, { token });
        if (cancelled) return;
        setForm(toFormState(response.project));
        const heroPath = response.project.heroImage || undefined;
        setExistingHero(heroPath);
        setHeroPreview(heroPath ? resolveMediaUrl(heroPath) ?? null : null);
        setHeroFile(null);
        setHeroObjectUrl(null);
        setRemoveHero(false);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Unable to load project");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, token]);

  const disableSubmit = status === "saving";

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetState = () => {
    setStatus("idle");
    setMessage("");
  };

  const handleHeroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const file = event.target.files?.[0] || null;

    if (heroObjectUrl) {
      URL.revokeObjectURL(heroObjectUrl);
      setHeroObjectUrl(null);
    }

    if (file) {
      setHeroFile(file);
      const objectUrl = URL.createObjectURL(file);
      setHeroObjectUrl(objectUrl);
      setHeroPreview(objectUrl);
      setRemoveHero(false);
    } else {
      setHeroFile(null);
      const fallback = existingHero ? resolveMediaUrl(existingHero) : null;
      setHeroPreview(fallback ?? null);
    }
  };

  const handleRemoveHero = () => {
    resetState();
    if (heroObjectUrl) {
      URL.revokeObjectURL(heroObjectUrl);
      setHeroObjectUrl(null);
    }
    setHeroFile(null);
    setHeroPreview(null);
    setExistingHero(undefined);
    setRemoveHero(isEdit);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setStatus("error");
      setMessage("Log in again to continue.");
      return;
    }

    if (!form.title.trim() || !form.summary.trim()) {
      setStatus("error");
      setMessage("Add a project title and a short summary before publishing.");
      return;
    }

    try {
      setStatus("saving");
      setMessage(isEdit ? "Updating project…" : "Publishing your project…");

      if (isEdit && !id) {
        throw new Error("Missing project identifier");
      }

      const tags = parseList(form.tags).slice(0, 25);
      const linkCandidates = [form.githubUrl, form.liveUrl, ...parseList(form.otherLinks)].map((link) =>
        link.trim()
      );
      const links = Array.from(new Set(linkCandidates.filter(Boolean))).slice(0, 20);

      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("summary", form.summary.trim());
      formData.append("description", form.description.trim());
      formData.append("tags", tags.join(", "));
      formData.append("links", links.join("\n"));
      formData.append("visibility", form.visibility);

      if (heroFile) {
        formData.append("heroImage", heroFile);
      } else if (isEdit && removeHero) {
        formData.append("heroImage", "");
      } else if (!isEdit && existingHero) {
        formData.append("heroImage", existingHero);
      }

      const endpoint = isEdit ? `/api/projects/${id}` : "/api/projects";
      const method = isEdit ? "PATCH" : "POST";

      const response = await apiFetch<ProjectDetailResponse>(endpoint, {
        method,
        body: formData,
        token,
      });

      setStatus("success");
      setMessage(isEdit ? "Project updated." : "Project published successfully.");

      if (isEdit) {
        navigate(`/projects/${response.project.id}`, { replace: true });
      } else {
        setForm(defaultForm);
        setExistingHero(undefined);
        setHeroPreview(null);
        setHeroFile(null);
        setHeroObjectUrl(null);
        setRemoveHero(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        navigate("/feed", { replace: true });
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to save project");
    }
  };

  const pageTitle = useMemo(() => (isEdit ? "Update project" : "Add project"), [isEdit]);

  if (loading) {
    return (
      <main className="page-shell">
        <div style={{ textAlign: "center", color: "var(--page-muted)" }}>Loading project…</div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">{pageTitle}</p>
        <h1>{isEdit ? "Keep the momentum going" : "Tell people what you are building"}</h1>
        <p className="page-subtitle">
          {isEdit
            ? "Refresh your project details and keep followers updated."
            : "Capture the latest milestone, tag collaborators, and share the next experiment."}
        </p>
      </header>

      <article className="page-card">
        <form className="page-form" onSubmit={handleSubmit} onChange={resetState}>
          <label>
            Project title*
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Synthwave Croner"
              autoComplete="off"
            />
          </label>

          <label>
            Short summary*
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              placeholder="Give people the headline version of this update"
            />
          </label>

          <label>
            Full description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Share context, embed links, and outline what is next"
              rows={6}
            />
          </label>

          <label>
            Tech stack / tags
            <textarea
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="design system, ai, infra"
              rows={3}
            />
          </label>

          <label>
            Visibility
            <select name="visibility" value={form.visibility} onChange={handleChange}>
              <option value="public">Public — shown in Explore</option>
              <option value="private">Private — only visible to you</option>
            </select>
          </label>

          <label>
            GitHub URL
            <input
              name="githubUrl"
              value={form.githubUrl}
              onChange={handleChange}
              placeholder="https://github.com/workyard"
              autoComplete="off"
            />
          </label>

          <label>
            Live URL
            <input
              name="liveUrl"
              value={form.liveUrl}
              onChange={handleChange}
              placeholder="https://app.workyard.dev"
              autoComplete="off"
            />
          </label>

          <fieldset className="page-form-file">
            <legend>Hero image</legend>
            {heroPreview ? (
              <div className="page-form-file__preview">
                <img src={heroPreview} alt="Selected hero preview" />
              </div>
            ) : (
              <p className="page-form-file__placeholder">Upload a featured image to showcase your project.</p>
            )}
            <div className="page-form-file__controls">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleHeroChange} />
              {(heroPreview || existingHero) && (
                <button type="button" className="page-button secondary" onClick={handleRemoveHero}>
                  Remove image
                </button>
              )}
            </div>
            <small className="page-form-file__hint">Recommended 1200×630 PNG or JPG, up to 8MB.</small>
          </fieldset>

          <label>
            Additional links
            <textarea
              name="otherLinks"
              value={form.otherLinks}
              onChange={handleChange}
              placeholder="conference deck, product video, documentation"
              rows={3}
            />
          </label>

          {message && <p className={`page-alert ${status === "error" ? "error" : "success"}`}>{message}</p>}

          <div className="page-actions">
            <button type="submit" className="page-button primary" disabled={disableSubmit}>
              {status === "saving" ? (isEdit ? "Updating…" : "Publishing…") : isEdit ? "Update project" : "Publish project"}
            </button>
          </div>
        </form>
      </article>
    </main>
  );
}
