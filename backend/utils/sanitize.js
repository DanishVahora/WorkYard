const mongoose = require("mongoose");

function toPlain(user) {
  if (!user) {
    return {};
  }
  if (typeof user.toObject === "function") {
    return user.toObject({ virtuals: true });
  }
  return user;
}

function toStringId(value) {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    if (typeof value._id === "string") {
      return value._id;
    }
    if (value._id && typeof value._id.toString === "function") {
      return value._id.toString();
    }
    if (typeof value.id === "string") {
      return value.id;
    }
    if (value.id && typeof value.id.toString === "function") {
      return value.id.toString();
    }
  }
  if (typeof value.toString === "function") {
    return value.toString();
  }
  return undefined;
}

function mapStringIds(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item) => toStringId(item))
    .filter((item) => typeof item === "string");
}

function mapStringList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item) => (item == null ? undefined : `${item}`.trim()))
    .filter(Boolean);
}

function sanitizeUser(user, options = {}) {
  const data = toPlain(user);
  const id = toStringId(data._id || data.id);
  const followers = mapStringIds(data.followers);
  const following = mapStringIds(data.following);
  const projects = mapStringIds(data.projects);
  const savedProjects = mapStringIds(data.savedProjects);
  const skills = mapStringList(data.skills);

  const currentUserId = options.currentUserId
    ? options.currentUserId.toString()
    : undefined;

  const isFollowing = currentUserId
    ? followers.includes(currentUserId)
    : undefined;

  return {
    id,
    name: data.name,
    username: data.username,
    email: data.email,
    role: data.role,
    bio: data.bio,
    avatar: data.avatar,
    skills,
    experienceLevel: data.experienceLevel,
    location: data.location,
    github: data.github,
    linkedin: data.linkedin,
    portfolio: data.portfolio,
    projects,
    savedProjects,
    followers,
    following,
    followersCount: followers.length,
    followingCount: following.length,
    isVerified: data.isVerified,
    isActive: data.isActive,
    lastLogin: data.lastLogin,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isFollowing,
  };
}

function summarizeUser(user, options = {}) {
  const data = toPlain(user);
  const id = toStringId(data._id || data.id);
  const followers = mapStringIds(data.followers);
  const currentUserId = options.currentUserId
    ? options.currentUserId.toString()
    : undefined;

  const isFollowing = currentUserId
    ? followers.includes(currentUserId)
    : undefined;

  return {
    id,
    name: data.name,
    username: data.username,
    avatar: data.avatar,
    role: data.role,
    bio: data.bio,
    followersCount: followers.length,
    isFollowing,
  };
}

function isValidObjectId(value) {
  if (!value) {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(value);
}

module.exports = {
  sanitizeUser,
  summarizeUser,
  isValidObjectId,
};
