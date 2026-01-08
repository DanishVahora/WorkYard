const express = require("express");
const router = express.Router();
const { register, login, me } = require("../controller/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadAvatar } = require("../middleware/upload.middleware");

router.post("/register", uploadAvatar.single("avatar"), register);
router.post("/login", login);
router.get("/me", protect, me);

module.exports = router;
