const express = require("express");
const {
  listConversations,
  startConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  reactToMessage,
} = require("../controller/message.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadMessageMedia } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(protect);
router.get("/conversations", listConversations);
router.post("/conversations", startConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", uploadMessageMedia.array("files", 1), sendMessage);
router.post("/conversations/:id/read", markConversationRead);
router.post("/conversations/:id/messages/:messageId/react", reactToMessage);

module.exports = router;
