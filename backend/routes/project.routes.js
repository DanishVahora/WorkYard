const express = require("express");
const {
  createProject,
  listProjects,
  getProjectById,
  getMyProjects,
  updateProject,
  deleteProject,
  listSavedProjects,
  saveProject,
  unsaveProject,
} = require("../controller/project.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadProjectMedia } = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/", listProjects);
router.get("/mine", protect, getMyProjects);
router.get("/saved", protect, listSavedProjects);
router.post(
  "/",
  protect,
  uploadProjectMedia.fields([
    { name: "heroImage", maxCount: 1 },
    { name: "gallery", maxCount: 8 },
  ]),
  createProject
);
router.post("/:id/save", protect, saveProject);
router.delete("/:id/save", protect, unsaveProject);
router.get("/:id", getProjectById);
router.patch(
  "/:id",
  protect,
  uploadProjectMedia.fields([
    { name: "heroImage", maxCount: 1 },
    { name: "gallery", maxCount: 8 },
  ]),
  updateProject
);
router.delete("/:id", protect, deleteProject);

module.exports = router;
