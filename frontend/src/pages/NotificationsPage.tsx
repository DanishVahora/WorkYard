import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { resolveMediaUrl } from "../lib/api";

function formatRelativeTime(input: string) {
  const timestamp = new Date(input).getTime();
  if (Number.isNaN(timestamp)) {
    return "Just now";
  }
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface NotificationActor {
  id?: string;
  name?: string;
  username?: string;
  avatar?: string;
}

interface NotificationProject {
  id?: string;
  title?: string;
}

interface NotificationItem {
  id: string;
  type: "follow" | "like" | (string & {});
  createdAt: string;
  read?: boolean;
  actor?: NotificationActor | null;
  project?: NotificationProject | null;
}

function buildMessage(notification: NotificationItem) {
  const actor = notification.actor?.name || notification.actor?.username || "Someone";
  if (notification.type === "follow") {
    return `${actor} started following you.`;
  }
  if (notification.type === "like") {
    if (notification.project?.title) {
      return `${actor} liked ${notification.project.title}.`;
    }
    return `${actor} liked your project.`;
  }
  return "New notification";
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, unreadCount, loading } = useNotifications();

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications]
  );

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Notifications</p>
        <h1>Stay close to the signals that matter</h1>
        <p className="page-subtitle">
          See how the community reacts when they follow you or engage with your projects.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
          <span style={{ color: "var(--page-muted)" }}>{unreadCount} unread</span>
          <button
            type="button"
            className="page-button secondary"
            onClick={() => markAllAsRead()}
            disabled={!unreadCount}
          >
            Mark all read
          </button>
        </div>
      </header>

      {loading ? <div className="page-alert">Loading notifications…</div> : null}

      <div className="page-grid">
        {sortedNotifications.map((notification) => {
          const avatar = resolveMediaUrl(notification.actor?.avatar);
          const message = buildMessage(notification);
          const timeAgo = formatRelativeTime(notification.createdAt);
          const initials = (notification.actor?.name || notification.actor?.username || "?")
            .replace(/\s+/g, "")
            .slice(0, 2)
            .toUpperCase();

          const handleOpen = () => {
            if (notification.type === "follow" && notification.actor?.id) {
              navigate(`/users/${notification.actor.id}`);
            } else if (notification.type === "like" && notification.project?.id) {
              navigate(`/projects/${notification.project.id}`);
            }
            markAsRead(notification.id);
          };

          return (
            <article
              key={notification.id}
              className="page-card"
              style={{ borderColor: notification.read ? "var(--page-border)" : "rgba(59, 130, 246, 0.32)" }}
            >
              <header style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "rgba(15, 23, 42, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                  aria-hidden
                >
                  {avatar ? (
                    <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{message}</h3>
                  <p style={{ margin: "6px 0 0", color: "var(--page-muted)", fontSize: 14 }}>{timeAgo}</p>
                </div>
              </header>

              <div className="page-card__meta" style={{ marginTop: 18 }}>
                <button type="button" className="page-button secondary" onClick={handleOpen}>
                  View
                </button>
                {!notification.read ? (
                  <button type="button" className="page-button secondary" onClick={() => markAsRead(notification.id)}>
                    Mark read
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !sortedNotifications.length ? (
        <div className="page-empty" style={{ marginTop: 0 }}>You are all caught up. No notifications yet.</div>
      ) : null}
    </main>
  );
}
