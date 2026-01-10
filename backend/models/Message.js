const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "love", "laugh", "wow", "sad", "angry", "emoji"], required: true },
    emoji: { type: String },
  },
  { _id: false, timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String },
    mime: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, trim: true, maxlength: 4000 },
    attachments: [attachmentSchema],
    reactions: [reactionSchema],
    readAt: { type: Date },
  },
  { timestamps: true }
);
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, readAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
