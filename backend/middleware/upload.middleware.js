const multer = require("multer");
const path = require("path");
const fs = require("fs");

const AVATAR_DIR = path.join(__dirname, "..", "uploads", "avatars");
const PROJECT_MEDIA_DIR = path.join(__dirname, "..", "uploads", "projects");
const MESSAGE_MEDIA_DIR = path.join(__dirname, "..", "uploads", "messages");

// Ensure upload directories exist
for (const dir of [AVATAR_DIR, PROJECT_MEDIA_DIR, MESSAGE_MEDIA_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const projectStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PROJECT_MEDIA_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `project-${uniqueSuffix}${ext}`);
  },
});

const messageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MESSAGE_MEDIA_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `message-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const isImage = file.mimetype.startsWith("image/");
  if (!isImage) {
    return cb(new Error("Only image uploads are allowed"));
  }
  cb(null, true);
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const uploadProjectMedia = multer({
  storage: projectStorage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per file
    files: 12,
  },
});

const uploadMessageMedia = multer({
  storage: messageStorage,
  fileFilter,
  limits: {
    fileSize: 6 * 1024 * 1024,
    files: 1,
  },
});

module.exports = { uploadAvatar, uploadProjectMedia, uploadMessageMedia };
