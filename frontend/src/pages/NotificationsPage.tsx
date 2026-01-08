import React from "react";

const notifications = [
  {
    id: 1,
    title: "Kai left a signal",
    detail: '"Loved the new timeline component" on Lumen renderer',
    timeAgo: "5m ago",
  },
  {
    id: 2,
    title: "Project invited you",
    detail: "Beam Labs added you as a reviewer for Beacon insights",
    timeAgo: "1h ago",
  },
  {
    id: 3,
    title: "New collaborator",
    detail: "Sierra joined Atlas team rituals",
    timeAgo: "4h ago",
  },
];

export default function NotificationsPage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Notifications</p>
        <h1>Stay close to the signals that matter</h1>
        <p className="page-subtitle">Mentions, review requests, and team invites arrive here.</p>
      </header>

      <div className="page-grid">
        {notifications.map((notification) => (
          <article key={notification.id} className="page-card">
            <h3>{notification.title}</h3>
            <p>{notification.detail}</p>
            <div className="page-card__meta">
              <span>{notification.timeAgo}</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
