import React from "react";

const milestones = [
  { title: "Signal-driven feedback", body: "We prioritize thoughtful critique over vanity metrics so teams learn faster." },
  { title: "Builder-first profiles", body: "Showcase stack, rituals, and open threads so collaborators know how to plug in." },
  { title: "Transparent roadmaps", body: "Every update links to issues, docs, or PRs so readers can trace progress." },
];

export default function AboutPage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">About</p>
        <h1>WorkYard helps builders ship in public</h1>
        <p className="page-subtitle">
          We are creating a calm space for product teams to document progress, ask for help, and celebrate learning in the open.
        </p>
      </header>

      <div className="page-grid">
        {milestones.map((item) => (
          <article key={item.title} className="page-card">
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
        <article className="page-card page-card--accent">
          <h3>What we believe</h3>
          <p>
            High-trust communities form when people narrate the messy middle of their work. WorkYard makes that narration feel cinematic
            without the overhead of a deck.
          </p>
        </article>
      </div>
    </main>
  );
}
