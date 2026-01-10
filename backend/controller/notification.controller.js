const mongoose = require("mongoose");
const {
  listNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
} = require("../services/notification.service");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await listNotifications(req.user._id, {
      limit: req.query.limit,
    });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markRead = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid notification id" });
  }

  try {
    const notification = await markNotificationRead(req.user._id, id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await markAllRead(req.user._id);
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeNotification = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid notification id" });
  }
  try {
    const removed = await deleteNotification(req.user._id, id);
    if (!removed) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
