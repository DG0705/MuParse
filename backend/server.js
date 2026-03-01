require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./configs/db");
const studentRoutes = require("./routes/studentRoutes");
const isolatedRoutes = require("./routes/isolatedRoutes");

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/isolated", isolatedRoutes);

app.get("/", (req, res) => {
  res.send("MuParse Backend is running...");
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
