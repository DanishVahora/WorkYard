const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    summary: { type: String, required: true, trim: true, maxlength: 4000 },
    description: { type: String, trim: true, maxlength: 20000 },
    tags: {
      type: [String],
      default: [],
      validate: (values) => values.length <= 25,
    },
    links: {
      type: [String],
      default: [],
      validate: (values) => values.length <= 20,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    heroImage: { type: String },
    gallery: {
      type: [String],
      default: [],
      validate: (values) => values.length <= 12,
    },
    lastActivityAt: { type: Date, default: Date.now },
    reactions: {
      applause: { type: Number, default: 0, min: 0 },
      curiosity: { type: Number, default: 0, min: 0 },
      interest: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

projectSchema.index({ title: "text", summary: "text", tags: "text" });
projectSchema.index({ owner: 1, status: 1, visibility: 1 });

module.exports = mongoose.model("Project", projectSchema);
