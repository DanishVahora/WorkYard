const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/Db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Buildfolio backend running 🚀");
});

app.use("/api/auth", require("./routes/auth.routes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
