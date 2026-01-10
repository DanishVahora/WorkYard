const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const { createNotification } = require("../services/notification.service");

const allowedStatuses = new Set(["draft", "published", "archived"]);
const allowedVisibility = new Set(["public", "private"]);

const resolveProjectPath = (filename) =>
  filename ? `/uploads/projects/${filename}` : undefined;

const normalizeList = (input) => {
  if (!input) return [];
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
    ? input.split(/[,\n]/)
    : [];
  const cleaned = raw
    .map((value) => (value || "").toString().trim())
    .filter(Boolean);
  return [...new Set(cleaned)].slice(0, 50);
};

const normalizeTags = (input) =>
  normalizeList(input)
    .map((value) => value.replace(/^#+/, "").trim())
    .filter(Boolean)
    .slice(0, 25);

const safeJSONParse = (input, fallback) => {
  if (!input) return fallback;
  try {
    return JSON.parse(input);
  } catch (_err) {
    return fallback;
  }
};

const normalizeRoadmap = (input) => {
  const raw = Array.isArray(input) ? input : safeJSONParse(input, []);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const title = item?.title?.toString().trim();
      if (!title) return null;
      const description = item?.description?.toString().trim() || undefined;
      const targetDateRaw = item?.targetDate ? new Date(item.targetDate) : undefined;
      const targetDate = targetDateRaw && !Number.isNaN(targetDateRaw.getTime()) ? targetDateRaw : undefined;

      return {
        title: title.slice(0, 160),
        description: description ? description.slice(0, 1000) : undefined,
        targetDate,
      };
    })
    .filter(Boolean)
    .slice(0, 12);
};

const sanitizeProject = (project, currentUser, options = {}) => {
  const includeComments = options.includeComments ?? false;
  const data = project.toObject({ virtuals: true });
  const currentUserId = currentUser?._id?.toString?.() || currentUser?.toString?.();
  const savedIds = Array.isArray(currentUser?.savedProjects)
    ? currentUser.savedProjects.map((value) => value.toString())
    : [];
  const projectId = data._id?.toString?.();
  const likedIds = Array.isArray(data.likedBy)
    ? data.likedBy.map((value) => value?.toString?.()).filter(Boolean)
    : [];
  const commentEntries = Array.isArray(data.comments) ? data.comments : [];

  const ownerData = data.owner || {};
  const ownerId = ownerData?._id?.toString?.() || ownerData?.id || (typeof ownerData === "string" ? ownerData : undefined);

  const comments = includeComments
    ? commentEntries.map((entry) => {
        const author = entry.author || {};
        const authorId = author?._id?.toString?.() || author?.id || undefined;
        return {
          id: entry._id?.toString?.(),
          body: entry.body,
          createdAt: entry.createdAt,
          author: authorId
            ? {
                id: authorId,
                name: author.name,
                username: author.username,
                avatar: author.avatar,
                role: author.role,
              }
            : null,
        };
      })
    : undefined;

  let owner;
  if (ownerId && ownerData && typeof ownerData === "object" && !Array.isArray(ownerData)) {
    owner = {
      id: ownerId,
      name: ownerData.name,
      username: ownerData.username,
      avatar: ownerData.avatar,
      role: ownerData.role,
    };
  } else if (typeof data.owner === "string") {
    owner = { id: data.owner };
  } else {
    owner = data.owner;
  }

  return {
    id: projectId,
    title: data.title,
    summary: data.summary,
    description: data.description,
    tags: data.tags,
    links: data.links,
    objective: data.objective,
    problemStatement: data.problemStatement,
    solutionOverview: data.solutionOverview,
    successMetrics: data.successMetrics,
    keyFeatures: Array.isArray(data.keyFeatures) ? data.keyFeatures : [],
    collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
    roadmap: Array.isArray(data.roadmap)
      ? data.roadmap.map((item) => ({
          title: item.title,
          description: item.description,
          targetDate: item.targetDate ? item.targetDate.toISOString() : undefined,
        }))
      : [],
    budget: data.budget,
    callToAction: data.callToAction,
    status: data.status,
    visibility: data.visibility,
    heroImage: data.heroImage,
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    reactions: data.reactions,
    owner,
    lastActivityAt: data.lastActivityAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isOwner: !!currentUserId && ownerId === currentUserId,
    isSaved: projectId ? savedIds.includes(projectId) : false,
    isLiked: currentUserId ? likedIds.includes(currentUserId) : false,
    likesCount: likedIds.length,
    commentCount: commentEntries.length,
    comments,
  };
};

const ensureOwnership = (project, user) => {
  const isOwner = project.owner.toString() === user._id.toString();
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    const error = new Error("Not authorized to modify this project");
    error.statusCode = 403;
    throw error;
  }
};

exports.createProject = async (req, res) => {
  const { title, summary, description, status, visibility } = req.body;

  if (!title || !summary) {
    return res.status(400).json({ message: "title and summary are required" });
  }

  try {
    const tags = normalizeTags(req.body.tags);
    const links = normalizeList(req.body.links);
    const galleryFromBody = normalizeList(req.body.gallery);
    const keyFeatures = normalizeList(req.body.keyFeatures).slice(0, 20);
    const collaborators = normalizeList(req.body.collaborators).slice(0, 20);
    const roadmap = normalizeRoadmap(req.body.roadmap);

    const heroUpload = req.files?.heroImage?.[0];
    const galleryUploads = Array.isArray(req.files?.gallery) ? req.files.gallery : [];

    const heroImage = heroUpload ? resolveProjectPath(heroUpload.filename) : req.body.heroImage;
    const galleryUploadsPaths = galleryUploads.map((file) => resolveProjectPath(file.filename)).filter(Boolean);
    const combinedGallery = [...new Set([...galleryFromBody, ...galleryUploadsPaths])].slice(0, 12);

    const project = await Project.create({
      owner: req.user._id,
      title: title.trim(),
      summary: summary.trim(),
      description: description?.trim() || undefined,
      tags,
      links,
      objective: req.body.objective?.trim() || undefined,
      problemStatement: req.body.problemStatement?.trim() || undefined,
      solutionOverview: req.body.solutionOverview?.trim() || undefined,
      successMetrics: req.body.successMetrics?.trim() || undefined,
      keyFeatures,
      collaborators,
      roadmap,
      budget: req.body.budget?.trim() || undefined,
      callToAction: req.body.callToAction?.trim() || undefined,
      status: allowedStatuses.has(status) ? status : "published",
      visibility: allowedVisibility.has(visibility) ? visibility : "public",
      heroImage,
      gallery: combinedGallery,
      lastActivityAt: new Date(),
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { projects: project._id },
    });

    await project.populate([
      { path: "owner", select: "name username avatar role" },
      { path: "comments.author", select: "name username avatar role" },
    ]);
    const populated = project;

    res.status(201).json({
      message: "Project created",
      project: sanitizeProject(populated, req.user),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.listProjects = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
  const skip = (page - 1) * limit;
  const query = { visibility: "public" };

  if (req.query.owner && mongoose.isValidObjectId(req.query.owner)) {
    query.owner = req.query.owner;
  }

  if (req.query.status && allowedStatuses.has(req.query.status)) {
    query.status = req.query.status;
  } else {
    query.status = "published";
  }

  if (req.query.tags) {
    const tags = normalizeTags(req.query.tags);
    if (tags.length) {
      query.tags = { $all: tags };
    }
  }

  if (req.query.search) {
    query.$text = { $search: req.query.search.trim() };
  }

  try {
    const [items, total] = await Promise.all([
      Project.find(query)
        .populate("owner", "name username avatar role")
        .sort({ lastActivityAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(query),
    ]);

    res.json({
      projects: items.map((project) => sanitizeProject(project, req.user)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    const project = await Project.findById(id).populate([
      { path: "owner", select: "name username avatar role" },
      { path: "comments.author", select: "name username avatar role" },
    ]);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = req.user && project.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";
    if (project.visibility !== "public" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Project is not publicly accessible" });
    }
    if (project.status !== "published" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Project is not published" });
    }

    res.json({ project: sanitizeProject(project, req.user, { includeComments: true }) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .populate("owner", "name username avatar role")
      .sort({ updatedAt: -1 });

    res.json({ projects: projects.map((project) => sanitizeProject(project, req.user)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    ensureOwnership(project, req.user);

    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) {
        return res.status(400).json({ message: "title cannot be empty" });
      }
      project.title = req.body.title.trim();
    }

    if (req.body.summary !== undefined) {
      if (!req.body.summary.trim()) {
        return res.status(400).json({ message: "summary cannot be empty" });
      }
      project.summary = req.body.summary.trim();
    }

    if (req.body.description !== undefined) {
      project.description = req.body.description?.trim() || undefined;
    }

    if (req.body.tags !== undefined) {
      project.tags = normalizeTags(req.body.tags);
    }

    if (req.body.links !== undefined) {
      project.links = normalizeList(req.body.links).slice(0, 20);
    }

    if (req.body.objective !== undefined) {
      project.objective = req.body.objective?.trim() || undefined;
    }

    if (req.body.problemStatement !== undefined) {
      project.problemStatement = req.body.problemStatement?.trim() || undefined;
    }

    if (req.body.solutionOverview !== undefined) {
      project.solutionOverview = req.body.solutionOverview?.trim() || undefined;
    }

    if (req.body.successMetrics !== undefined) {
      project.successMetrics = req.body.successMetrics?.trim() || undefined;
    }

    if (req.body.keyFeatures !== undefined) {
      project.keyFeatures = normalizeList(req.body.keyFeatures).slice(0, 20);
    }

    if (req.body.collaborators !== undefined) {
      project.collaborators = normalizeList(req.body.collaborators).slice(0, 20);
    }

    if (req.body.roadmap !== undefined) {
      project.roadmap = normalizeRoadmap(req.body.roadmap);
    }

    if (req.body.budget !== undefined) {
      project.budget = req.body.budget?.trim() || undefined;
    }

    if (req.body.callToAction !== undefined) {
      project.callToAction = req.body.callToAction?.trim() || undefined;
    }

    if (req.body.status !== undefined) {
      if (!allowedStatuses.has(req.body.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      project.status = req.body.status;
    }

    if (req.body.visibility !== undefined) {
      if (!allowedVisibility.has(req.body.visibility)) {
        return res.status(400).json({ message: "Invalid visibility" });
      }
      project.visibility = req.body.visibility;
    }

    if (req.body.heroImage !== undefined) {
      project.heroImage = req.body.heroImage || undefined;
    }

    const heroUpload = req.files?.heroImage?.[0];
    if (heroUpload) {
      project.heroImage = resolveProjectPath(heroUpload.filename);
    }

    const galleryUploads = Array.isArray(req.files?.gallery) ? req.files.gallery : [];
    const hasGalleryUpdate =
      galleryUploads.length > 0 || req.body.keepGallery !== undefined || req.body.gallery !== undefined;
    if (hasGalleryUpdate) {
      const keepGallery = req.body.keepGallery !== undefined
        ? normalizeList(req.body.keepGallery)
        : project.gallery;
      const galleryFromBody = req.body.gallery !== undefined ? normalizeList(req.body.gallery) : keepGallery;
      const galleryUploadsPaths = galleryUploads
        .map((file) => resolveProjectPath(file.filename))
        .filter(Boolean);
      project.gallery = [...new Set([...(galleryFromBody || []), ...galleryUploadsPaths])].slice(0, 12);
    }

    project.lastActivityAt = new Date();
    await project.save();

    await project.populate([
      { path: "owner", select: "name username avatar role" },
      { path: "comments.author", select: "name username avatar role" },
    ]);
    const populated = project;

    res.json({
      message: "Project updated",
      project: sanitizeProject(populated, req.user, { includeComments: true }),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    ensureOwnership(project, req.user);

    await project.deleteOne();

    await Promise.all([
      User.findByIdAndUpdate(project.owner, { $pull: { projects: project._id } }),
      User.updateMany(
        { savedProjects: project._id },
        { $pull: { savedProjects: project._id } }
      ),
    ]);

    res.json({ message: "Project deleted" });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.listSavedProjects = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "savedProjects",
      populate: { path: "owner", select: "name username avatar role" },
      options: { sort: { updatedAt: -1 } },
    });

    res.json({
      projects: user.savedProjects.map((project) => sanitizeProject(project, req.user)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveProject = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.visibility !== "public" && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Cannot save a private project" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { savedProjects: project._id },
    });

    res.json({ message: "Project saved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unsaveProject = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedProjects: id },
    });

    res.json({ message: "Project removed from saved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProjectComments = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    const project = await Project.findById(id).populate([
      { path: "comments.author", select: "name username avatar role" },
      { path: "owner", select: "name username avatar role" },
    ]);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const requesterId = req.user?._id?.toString?.();
    const ownerId = project.owner && project.owner._id ? project.owner._id.toString() : null;
    const isOwner = requesterId && ownerId === requesterId;
    const isAdmin = req.user?.role === "admin";

    if (project.visibility !== "public" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Comments are not available" });
    }
    if (project.status !== "published" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Comments are not available" });
    }

    const sanitized = sanitizeProject(project, req.user, { includeComments: true });
    res.json({ comments: sanitized.comments || [], commentCount: sanitized.commentCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addComment = async (req, res) => {
  const { id } = req.params;
  const body = req.body?.body ? req.body.body.toString() : "";
  const trimmed = body.trim().slice(0, 2000);

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  if (!trimmed) {
    return res.status(400).json({ message: "Comment text is required" });
  }

  try {
    const project = await Project.findById(id).populate([
      { path: "owner", select: "name username avatar role" },
      { path: "comments.author", select: "name username avatar role" },
    ]);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const requesterId = req.user._id.toString();
    const ownerId = project.owner && project.owner._id ? project.owner._id.toString() : null;
    const isOwner = ownerId === requesterId;
    const isAdmin = req.user.role === "admin";

    if (project.visibility !== "public" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Cannot comment on a private project" });
    }
    if (project.status !== "published" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Cannot comment on an unpublished project" });
    }

    project.comments.push({ author: req.user._id, body: trimmed });
    project.lastActivityAt = new Date();
    await project.save();
    await project.populate({ path: "comments.author", select: "name username avatar role" });

    const sanitized = sanitizeProject(project, req.user, { includeComments: true });
    res.status(201).json({ message: "Comment added", project: sanitized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.likeProject = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    const project = await Project.findById(id).populate([
      { path: "owner", select: "name username avatar role" },
      { path: "comments.author", select: "name username avatar role" },
    ]);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const requesterId = req.user._id.toString();
    const ownerId = project.owner && project.owner._id ? project.owner._id.toString() : null;
    const isOwner = ownerId === requesterId;
    const isAdmin = req.user.role === "admin";

    if (project.visibility !== "public" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Cannot like a private project" });
    }
    if (project.status !== "published" && !isOwner && !isAdmin) {
      return res.status(403).json({ message: "Cannot like an unpublished project" });
    }

    const likedIds = Array.isArray(project.likedBy)
      ? project.likedBy.map((value) => value?.toString?.()).filter(Boolean)
      : [];

    if (!likedIds.includes(requesterId)) {
      if (!Array.isArray(project.likedBy)) {
        project.likedBy = [];
      }
      if (typeof project.likedBy.addToSet === "function") {
        project.likedBy.addToSet(req.user._id);
      } else {
        project.likedBy.push(req.user._id);
      }
      if (!project.reactions) {
        project.reactions = { applause: 0, curiosity: 0, interest: 0 };
      }
      project.reactions.applause = project.likedBy.length;
      project.lastActivityAt = new Date();
      await project.save();
      await project.populate({ path: "comments.author", select: "name username avatar role" });

      if (!isOwner) {
        createNotification({
          recipientId: project.owner?._id || project.owner,
          actorId: req.user._id,
          type: "like",
          projectId: project._id,
        }).catch((error) => {
          console.warn("Unable to dispatch like notification", error);
        });
      }
    }

    const sanitized = sanitizeProject(project, req.user, { includeComments: true });
    res.json({ message: "Project liked", project: sanitized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unlikeProject = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }

  try {
    const project = await Project.findById(id).populate([
      { path: "owner", select: "name username avatar role" },
      { path: "comments.author", select: "name username avatar role" },
    ]);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const requesterId = req.user._id.toString();
    const likedIds = Array.isArray(project.likedBy)
      ? project.likedBy.map((value) => value?.toString?.()).filter(Boolean)
      : [];

    if (likedIds.includes(requesterId)) {
      project.likedBy.pull(req.user._id);
      if (!project.reactions) {
        project.reactions = { applause: 0, curiosity: 0, interest: 0 };
      }
      project.reactions.applause = project.likedBy.length;
      project.lastActivityAt = new Date();
      await project.save();
      await project.populate({ path: "comments.author", select: "name username avatar role" });
    }

    const sanitized = sanitizeProject(project, req.user, { includeComments: true });
    res.json({ message: "Project unliked", project: sanitized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
