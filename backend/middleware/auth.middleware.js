const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies JWT and attaches the user to the request
const protect = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || "";
		const token = authHeader.startsWith("Bearer ")
			? authHeader.substring(7)
			: null;

		if (!token) return res.status(401).json({ message: "Not authorized" });

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id).select("-password");
		if (!user) return res.status(401).json({ message: "User not found" });

		req.user = user;
		next();
	} catch (err) {
		return res.status(401).json({ message: "Not authorized" });
	}
};

module.exports = { protect };
