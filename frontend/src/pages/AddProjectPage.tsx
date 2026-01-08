import React, { useState } from "react";

const defaultForm = {
  title: "",
  summary: "",
  tags: "",
  links: "",
};

export default function AddProjectPage() {
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDraft = () => {
    setStatus("success");
    setMessage("Draft stored locally. Connect the API to persist it.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.summary) {
      setStatus("error");
      setMessage("Add a title and a quick summary before publishing.");
      return;
    }

    setStatus("saving");
    setMessage("Publishing your update...");

    window.setTimeout(() => {
      setStatus("success");
      setMessage("Update published locally. Wire up the backend to share it with everyone.");
      setForm(defaultForm);
    }, 800);
  };

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Add project update</p>
        <h1>Tell people what you are building</h1>
        <p className="page-subtitle">Capture the latest milestone, tag collaborators, and share the next experiment.</p>
      </header>

      <article className="page-card">
        <form className="page-form" onSubmit={handleSubmit}>
          <label>
            Project title*
            <input name="title" value={form.title} onChange={handleChange} placeholder="Synthwave Croner" />
          </label>

          <label>
            What shipped?
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              placeholder="Describe the outcome, link to issues, and invite reactions"
            />
          </label>

          <label>
            Tags
            <input name="tags" value={form.tags} onChange={handleChange} placeholder="design system, ai, infra" />
          </label>

          <label>
            Links
            <input name="links" value={form.links} onChange={handleChange} placeholder="https://github.com/workyard" />
          </label>

          {message && <p className={`page-alert ${status === "error" ? "error" : "success"}`}>{message}</p>}

          <div className="page-actions">
            <button type="button" className="page-button secondary" onClick={handleDraft}>
              Save draft
            </button>
            <button type="submit" className="page-button primary" disabled={status === "saving"}>
              {status === "saving" ? "Publishing…" : "Publish update"}
            </button>
          </div>
        </form>
      </article>
    </main>
  );
}
