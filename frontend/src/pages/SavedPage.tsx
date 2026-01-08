import React from "react";

const savedItems = [
  {
    title: "Atlas team rituals",
    summary: "Weekly pattern review for open design systems.",
    tags: ["Process", "Design Ops"],
  },
  {
    title: "Lumen renderer",
    summary: "Realtime GI explorer for WebGPU.",
    tags: ["Graphics", "WebGPU"],
  },
];

export default function SavedPage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Saved</p>
        <h1>Collections you are watching</h1>
        <p className="page-subtitle">Revisit projects you want to learn from or support.</p>
      </header>

      {savedItems.length === 0 ? (
        <div className="page-empty">You have not saved any projects yet.</div>
      ) : (
        <div className="page-grid">
          {savedItems.map((item) => (
            <article key={item.title} className="page-card">
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="page-card__meta">
                {item.tags.map((tag) => (
                  <span key={tag} className="page-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
