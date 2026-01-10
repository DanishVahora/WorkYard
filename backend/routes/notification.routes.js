const express = require("express");
const { getNotifications, markRead, markAllRead } = require("../controller/notification.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/", getNotifications);
router.patch("/:id/read", markRead);
router.post("/read-all", markAllRead);

module.exports = router;
