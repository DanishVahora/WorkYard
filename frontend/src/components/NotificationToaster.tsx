import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import type { NotificationItem } from "../types/notification";

function formatMessage(notification: NotificationItem | null) {
  if (!notification) return "";
  const actorName = notification.actor?.name || notification.actor?.username || "Someone";
  if (notification.type === "follow") {
    return `${actorName} started following you.`;
  }
  if (notification.type === "like") {
    if (notification.project?.title) {
      return `${actorName} liked ${notification.project.title}.`;
    }
    return `${actorName} liked your project.`;
  }
  return "You have a new notification.";
}

export default function NotificationToaster() {
  const navigate = useNavigate();
  const { latest, dismissLatest, markAsRead } = useNotifications();

  const message = useMemo(() => formatMessage(latest), [latest]);

  if (!latest) {
    return null;
  }

  const handleView = () => {
    if (latest.type === "follow" && latest.actor?.id) {
      navigate(`/users/${latest.actor.id}`);
    } else if (latest.type === "like" && latest.project?.id) {
      navigate(`/projects/${latest.project.id}`);
    } else {
      navigate("/notifications");
    }
    markAsRead(latest.id).finally(() => {
      dismissLatest();
    });
  };

  const handleDismiss = () => {
    dismissLatest();
    markAsRead(latest.id).catch(() => undefined);
  };

  return (
    <div className="wy-toast" role="status" aria-live="assertive">
      <div className="wy-toast__content">
        <strong>New notification</strong>
        <p>{message}</p>
      </div>
      <div className="wy-toast__actions">
        <button type="button" onClick={handleView}>
          View
        </button>
        <button type="button" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
