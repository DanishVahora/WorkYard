const Notification = require("../models/Notification");
const { emitToUser } = require("../realtime/socket");

async function createNotification({ recipientId, actorId, type, projectId }) {
  if (!recipientId || !actorId || recipientId.toString() === actorId.toString()) {
    return null;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    project: projectId,
    type,
  });

  const populated = await Notification.findById(notification._id)
    .populate({ path: "actor", select: "name username avatar role" })
    .populate({ path: "project", select: "title owner" });

  const payload = sanitizeNotification(populated);
  emitToUser(recipientId.toString(), "notifications:new", payload);
  return payload;
}

function sanitizeNotification(notification) {
  const data = notification?.toObject?.({ virtuals: true }) ?? notification;
  if (!data) return null;

  return {
    id: data._id?.toString?.(),
    type: data.type,
    read: Boolean(data.read),
    createdAt: data.createdAt,
    actor: data.actor
      ? {
          id: data.actor._id?.toString?.() ?? data.actor.id,
          name: data.actor.name,
          username: data.actor.username,
          avatar: data.actor.avatar,
          role: data.actor.role,
        }
      : null,
    project: data.project
      ? {
          id: data.project._id?.toString?.() ?? data.project.id,
          title: data.project.title,
        }
      : null,
  };
}

async function listNotifications(userId, { limit = 30 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .populate({ path: "actor", select: "name username avatar role" })
    .populate({ path: "project", select: "title" });

  return notifications.map((entry) => sanitizeNotification(entry));
}

async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true, readAt: new Date() },
    { new: true }
  )
    .populate({ path: "actor", select: "name username avatar role" })
    .populate({ path: "project", select: "title" });

  return notification ? sanitizeNotification(notification) : null;
}

async function markAllRead(userId) {
  await Notification.updateMany({ recipient: userId, read: { $ne: true } }, { read: true, readAt: new Date() });
}

module.exports = {
  createNotification,
  sanitizeNotification,
  listNotifications,
  markNotificationRead,
  markAllRead,
};
