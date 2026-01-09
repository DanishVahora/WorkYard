const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sanitizeUser } = require("../utils/sanitize");

const signToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// REGISTER
exports.register = async (req, res) => {
  const { name, username, email, password, skills, ...rest } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: "name, username, email, password required" });
  }

  try {
    const userExists = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (userExists)
      return res.status(400).json({ message: "Email or username already in use" });
    const hashedPassword = await bcrypt.hash(password, 10);

    const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : rest.avatar;
    const normalizedSkills = Array.isArray(skills)
      ? skills.filter(Boolean)
      : typeof skills === "string"
        ? skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      avatar: avatarPath,
      skills: normalizedSkills,
      ...rest,
    });

    const token = signToken(user._id, user.role);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Error during user registration", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        message: "Email or username already in use",
      });
    }

    const status = err?.status || err?.statusCode || (err?.name === "ValidationError" ? 400 : 500);

    res.status(status).json({ message: err?.message || "Internal server error" });
  }
};

// LOGIN (email or username + password)
exports.login = async (req, res) => {
  const { email, username, password } = req.body;

  if (!password || (!email && !username)) {
    return res.status(400).json({ message: "Provide email or username and password" });
  }

  try {
    const query = email ? { email } : { username };
    const user = await User.findOne(query);
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id, user.role);

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CURRENT USER
exports.me = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};
