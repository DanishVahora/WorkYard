const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { summarizeUser, isValidObjectId } = require("../utils/sanitize");
const { emitToUser } = require("../realtime/socket");

function toPlain(doc) {
  if (!doc) return null;
  return typeof doc.toObject === "function" ? doc.toObject({ virtuals: true }) : doc;
}

function mapStringIds(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return entry;
      if (typeof entry.toString === "function") return entry.toString();
      return null;
    })
    .filter(Boolean);
}

function sanitizeMessage(doc, currentUserId) {
  const data = toPlain(doc);
  if (!data) return null;

  const id = data._id?.toString?.();
  const senderId = data.sender?._id?.toString?.() || data.sender?.id || data.sender?.toString?.();
  const recipientId = data.recipient?._id?.toString?.() || data.recipient?.id || data.recipient?.toString?.();

  const reactions = Array.isArray(data.reactions)
    ? data.reactions.map((reaction) => ({
        userId: reaction.user?.toString?.() || reaction.user?.id,
        type: reaction.type,
        emoji: reaction.emoji,
      }))
    : [];

  const reactionCounts = reactions.reduce((acc, item) => {
    if (!item?.type) return acc;
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  const userReaction = reactions.find((r) => r.userId === currentUserId?.toString());

  return {
    id,
    conversationId: data.conversation?._id?.toString?.() || data.conversation?.toString?.(),
    senderId,
    recipientId,
    body: data.body,
    attachments: Array.isArray(data.attachments)
      ? data.attachments.map((file) => ({
          url: file.url,
          name: file.name,
          mime: file.mime,
          size: file.size,
        }))
      : [],
    reactions,
    reactionCounts,
    userReaction,
    readAt: data.readAt,
    createdAt: data.createdAt,
    isMine: currentUserId ? senderId === currentUserId.toString() : undefined,
  };
}

function sanitizeConversation(doc, currentUserId, unreadMap = new Map()) {
  const data = toPlain(doc);
  if (!data) return null;

  const participants = Array.isArray(data.participants)
    ? data.participants.map((user) => summarizeUser(user, { currentUserId }))
    : [];

  const unreadCount = unreadMap.get(data._id?.toString?.()) || 0;

  return {
    id: data._id?.toString?.(),
    participants,
    lastMessage: data.lastMessage ? sanitizeMessage(data.lastMessage, currentUserId) : null,
    lastMessageAt: data.lastMessageAt,
    unreadCount,
  };
}

async function buildUnreadMap(userId) {
  const stats = await Message.aggregate([
    { $match: { recipient: new mongoose.Types.ObjectId(userId), readAt: { $in: [null, undefined] } } },
    { $group: { _id: "$conversation", unread: { $sum: 1 } } },
  ]);

  const map = new Map();
  stats.forEach((entry) => {
    map.set(entry._id.toString(), entry.unread);
  });
  return map;
}

function getOtherParticipantId(conversation, currentUserId) {
  const data = toPlain(conversation);
  if (!data?.participants) return null;
  return data.participants
    .map((p) => p?._id?.toString?.() || p?.id || p?.toString?.())
    .find((id) => id && id !== currentUserId.toString());
}

async function ensureCanMessage(currentUserId, targetUserId) {
  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId).select("followers following name username avatar role"),
    User.findById(targetUserId).select("followers following name username avatar role"),
  ]);

  if (!targetUser) {
    return { allowed: false, reason: "Target user not found", targetUser: null };
  }

  const currentFollowing = mapStringIds(currentUser?.following);
  const currentFollowers = mapStringIds(currentUser?.followers);
  const targetFollowing = mapStringIds(targetUser?.following);
  const targetFollowers = mapStringIds(targetUser?.followers);

  const isFollowing = currentFollowing.includes(targetUserId.toString());
  const isFollowedBy = currentFollowers.includes(targetUserId.toString());
  const targetFollowsCurrent = targetFollowing.includes(currentUserId.toString());
  const targetHasCurrent = targetFollowers.includes(currentUserId.toString());

  const allowed = isFollowing || isFollowedBy || targetFollowsCurrent || targetHasCurrent;
  return { allowed, targetUser };
}

exports.listConversations = async (req, res) => {
  const currentUserId = req.user._id;

  try {
    const conversations = await Conversation.find({ participants: currentUserId })
      .sort({ lastMessageAt: -1 })
      .populate({ path: "participants", select: "name username avatar role followers" })
      .populate({ path: "lastMessage" });

    const unreadMap = await buildUnreadMap(currentUserId);
    const payload = conversations.map((conversation) => sanitizeConversation(conversation, currentUserId, unreadMap));

    res.json({ conversations: payload });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.startConversation = async (req, res) => {
  const { userId } = req.body;
  const currentUserId = req.user._id.toString();

  if (!isValidObjectId(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  if (userId === currentUserId) {
    return res.status(400).json({ message: "You cannot message yourself" });
  }

  try {
    const { allowed, targetUser } = await ensureCanMessage(currentUserId, userId);
    if (!allowed) {
      return res.status(403).json({ message: "Messaging is allowed only between followers" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    })
      .populate({ path: "participants", select: "name username avatar role followers" })
      .populate({ path: "lastMessage" });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, userId],
        lastMessageAt: new Date(),
      });
      conversation = await Conversation.findById(conversation._id)
        .populate({ path: "participants", select: "name username avatar role followers" })
        .populate({ path: "lastMessage" });
    }

    const [currentUnreadMap, targetUnreadMap] = await Promise.all([
      buildUnreadMap(currentUserId),
      buildUnreadMap(userId),
    ]);

    const payloadCurrent = sanitizeConversation(conversation, currentUserId, currentUnreadMap);
    const payloadTarget = sanitizeConversation(conversation, userId, targetUnreadMap);
    const otherId = targetUser?._id?.toString?.();

    emitToUser(currentUserId, "conversations:updated", payloadCurrent);
    if (otherId) {
      emitToUser(otherId, "conversations:updated", payloadTarget);
    }

    res.status(201).json({ conversation: payloadCurrent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  const { id } = req.params;
  const { before, limit = 60 } = req.query;
  const currentUserId = req.user._id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid conversation id" });
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 200);

  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((p) => p.toString() === currentUserId.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const query = { conversation: id };
    if (before) {
      const date = new Date(before);
      if (!isNaN(date.getTime())) {
        query.createdAt = { $lt: date };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .sort({ createdAt: 1 });

    const payload = messages.map((msg) => sanitizeMessage(msg, currentUserId));
    res.json({ messages: payload });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;
  const currentUserId = req.user._id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid conversation id" });
  }

  const hasBody = Boolean(body && body.trim());
  const hasAttachment = Array.isArray(req.files) && req.files.length > 0;

  if (!hasBody && !hasAttachment) {
    return res.status(400).json({ message: "Message body or attachment is required" });
  }

  try {
    const conversation = await Conversation.findById(id).populate({
      path: "participants",
      select: "name username avatar role followers",
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((p) => p._id.toString() === currentUserId.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const recipientId = getOtherParticipantId(conversation, currentUserId);
    if (!recipientId) {
      return res.status(400).json({ message: "Conversation has no recipient" });
    }

    const attachments = (req.files || []).map((file) => ({
      url: `uploads/messages/${file.filename}`,
      name: file.originalname,
      mime: file.mimetype,
      size: file.size,
    }));

    const message = await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      recipient: recipientId,
      body: hasBody ? body.trim().slice(0, 4000) : "",
      attachments,
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    const [populatedMessage, refreshedConversation, senderUnreadMap, recipientUnreadMap] = await Promise.all([
      Message.findById(message._id),
      Conversation.findById(conversation._id)
        .populate({ path: "participants", select: "name username avatar role followers" })
        .populate({ path: "lastMessage" }),
      buildUnreadMap(currentUserId),
      buildUnreadMap(recipientId),
    ]);

    const sanitizedMessage = sanitizeMessage(populatedMessage, currentUserId);
    const senderConversation = sanitizeConversation(refreshedConversation, currentUserId, senderUnreadMap);
    const recipientConversation = sanitizeConversation(refreshedConversation, recipientId, recipientUnreadMap);

    emitToUser(recipientId, "messages:new", sanitizedMessage);
    emitToUser(recipientId, "conversations:updated", recipientConversation);
    emitToUser(currentUserId, "conversations:updated", senderConversation);

    res.status(201).json({ message: sanitizedMessage, conversation: senderConversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markConversationRead = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid conversation id" });
  }

  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((p) => p.toString() === currentUserId.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const result = await Message.updateMany(
      { conversation: id, recipient: currentUserId, readAt: { $in: [null, undefined] } },
      { readAt: new Date() }
    );

    const otherUserId = getOtherParticipantId(conversation, currentUserId);

    emitToUser(otherUserId, "messages:read", {
      conversationId: id,
      readerId: currentUserId.toString(),
    });

    const unreadMap = await buildUnreadMap(currentUserId);
    const refreshedConversation = await Conversation.findById(id)
      .populate({ path: "participants", select: "name username avatar role followers" })
      .populate({ path: "lastMessage" });
    const conversationPayload = sanitizeConversation(refreshedConversation, currentUserId, unreadMap);

    emitToUser(currentUserId, "conversations:updated", conversationPayload);

    res.json({
      message: "Conversation marked as read",
      updated: result.modifiedCount,
      conversation: conversationPayload,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reactToMessage = async (req, res) => {
  const { id, messageId } = req.params;
  const { type, emoji } = req.body;
  const currentUserId = req.user._id;

  if (!isValidObjectId(id) || !isValidObjectId(messageId)) {
    return res.status(400).json({ message: "Invalid ids" });
  }

  const allowedTypes = ["like", "love", "laugh", "wow", "sad", "angry", "emoji"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ message: "Invalid reaction type" });
  }

  if (type === "emoji" && !emoji) {
    return res.status(400).json({ message: "Emoji is required for emoji reaction" });
  }

  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!conversation.participants.some((p) => p.toString() === currentUserId.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const message = await Message.findById(messageId);
    if (!message || message.conversation.toString() !== id) {
      return res.status(404).json({ message: "Message not found" });
    }

    // remove previous reaction from same user, then add
    message.reactions = (message.reactions || []).filter(
      (r) => r.user.toString() !== currentUserId.toString()
    );
    message.reactions.push({ user: currentUserId, type, emoji });
    await message.save();

    const sanitized = sanitizeMessage(message, currentUserId);
    const otherUserId = getOtherParticipantId(conversation, currentUserId);

    emitToUser(currentUserId, "messages:reacted", sanitized);
    emitToUser(otherUserId, "messages:reacted", sanitized);

    res.json({ message: sanitized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
