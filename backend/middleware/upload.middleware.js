const multer = require("multer");
const path = require("path");
const fs = require("fs");

const AVATAR_DIR = path.join(__dirname, "..", "uploads", "avatars");

// Ensure upload directory exists
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `avatar-${uniqueSuffix}${ext}`);
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
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = { uploadAvatar };
