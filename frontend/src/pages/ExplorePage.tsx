import React from "react";

const spotlight = [
  {
    title: "AI copilots",
    summary: "Lightweight teammates pairing with PMs and founders to unblock roadmaps in hours instead of weeks.",
    tags: ["Productivity", "NLP", "DX"],
  },
  {
    title: "Infra tooling",
    summary: "Opinionated deployment surfaces that feel like design systems for operations teams.",
    tags: ["Kubernetes", "Platform", "Observability"],
  },
  {
    title: "Community stacks",
    summary: "Micro-networks with built-in rituals for async creation, curation, and signal boosting.",
    tags: ["Social", "Web", "Design"],
  },
];

export default function ExplorePage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Explore</p>
        <h1>Follow the builders shaping the next wave</h1>
        <p className="page-subtitle">
          Curated themes surface projects with strong storytelling, transparent roadmaps, and active collaboration calls.
        </p>
      </header>

      <div className="page-grid">
        {spotlight.map((item) => (
          <article key={item.title} className="page-card page-card--accent">
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
    </main>
  );
}
