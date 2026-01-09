const User = require("../models/User");
const { sanitizeUser, summarizeUser, isValidObjectId } = require("../utils/sanitize");

function getCurrentUserId(req) {
  if (!req.user) {
    return undefined;
  }
  const value = req.user._id || req.user.id;
  return value ? value.toString() : undefined;
}

exports.getUser = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUserId = getCurrentUserId(req);
    res.json({ user: sanitizeUser(user, { currentUserId }) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.followUser = async (req, res) => {
  const { id } = req.params;
  const currentUserId = getCurrentUserId(req);

  if (!currentUserId) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  if (id === currentUserId) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  try {
    const target = await User.findById(id).select("-password");
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    await Promise.all([
      User.updateOne({ _id: currentUserId }, { $addToSet: { following: target._id } }),
      User.updateOne({ _id: target._id }, { $addToSet: { followers: req.user._id } }),
    ]);

    const [updatedCurrent, updatedTarget] = await Promise.all([
      User.findById(currentUserId).select("-password"),
      User.findById(id).select("-password"),
    ]);

    res.json({
      message: "Followed",
      user: sanitizeUser(updatedCurrent, { currentUserId }),
      target: sanitizeUser(updatedTarget, { currentUserId }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unfollowUser = async (req, res) => {
  const { id } = req.params;
  const currentUserId = getCurrentUserId(req);

  if (!currentUserId) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  if (id === currentUserId) {
    return res.status(400).json({ message: "You cannot unfollow yourself" });
  }

  try {
    const target = await User.findById(id).select("-password");
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    await Promise.all([
      User.updateOne({ _id: currentUserId }, { $pull: { following: target._id } }),
      User.updateOne({ _id: target._id }, { $pull: { followers: req.user._id } }),
    ]);

    const [updatedCurrent, updatedTarget] = await Promise.all([
      User.findById(currentUserId).select("-password"),
      User.findById(id).select("-password"),
    ]);

    res.json({
      message: "Unfollowed",
      user: sanitizeUser(updatedCurrent, { currentUserId }),
      target: sanitizeUser(updatedTarget, { currentUserId }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listFollowers = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const user = await User.findById(id)
      .select("followers")
      .populate({ path: "followers", select: "name username avatar role bio followers" });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUserId = getCurrentUserId(req);
    const followers = Array.isArray(user.followers)
      ? user.followers.map((follower) => summarizeUser(follower, { currentUserId }))
      : [];

    res.json({ followers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listFollowing = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const user = await User.findById(id)
      .select("following")
      .populate({ path: "following", select: "name username avatar role bio followers" });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUserId = getCurrentUserId(req);
    const following = Array.isArray(user.following)
      ? user.following.map((item) => summarizeUser(item, { currentUserId }))
      : [];

    res.json({ following });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  const { q = "", limit = 12 } = req.query;
  const trimmed = `${q}`.trim();

  if (!trimmed) {
    return res.json({ users: [] });
  }

  const maxLimit = Math.min(parseInt(limit, 10) || 12, 50);

  try {
    const query = {
      $or: [
        { name: { $regex: trimmed, $options: "i" } },
        { username: { $regex: trimmed, $options: "i" } },
      ],
    };

    const results = await User.find(query)
      .select("name username avatar role bio followers")
      .limit(maxLimit)
      .sort({ updatedAt: -1 });

    const currentUserId = getCurrentUserId(req);
    const users = results.map((user) => summarizeUser(user, { currentUserId }));

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
