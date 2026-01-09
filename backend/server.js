const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Buildfolio backend running 🚀");
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/users", require("./routes/user.routes"));

app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);

  if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message: "Profile photo must be 2MB or smaller",
    });
  }

  const status = err?.status || err?.statusCode || (err?.name === "MulterError" ? 400 : 500);

  res.status(status).json({ message: err?.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
