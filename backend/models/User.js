const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    bio: { type: String },
    avatar: { type: String },
    skills: [{ type: String }],
    experienceLevel: { type: String },
    location: { type: String },
    github: { type: String },
    linkedin: { type: String },
    portfolio: { type: String },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    savedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
