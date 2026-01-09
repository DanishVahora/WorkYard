const express = require("express");
const {
  getUser,
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing,
  searchUsers,
} = require("../controller/user.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/", protect, searchUsers);
router.post("/:id/follow", protect, followUser);
router.delete("/:id/follow", protect, unfollowUser);
router.get("/:id/followers", protect, listFollowers);
router.get("/:id/following", protect, listFollowing);
router.get("/:id", protect, getUser);

module.exports = router;
