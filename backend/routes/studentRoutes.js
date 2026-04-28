const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  uploadCsvData,
  uploadNepPdfData,
  uploadAtktCsvData,
  getStudents,
  getStudentHistory,
  getStudentsByBatch,
  mergeStudents,
  getSem1Students,
  getSem2Students,
  getSem7Students,
} = require("../controllers/studentController");

const { getStudentMLInsights } = require("../controllers/mlController");
const { getBatchAnalytics } = require("../controllers/analyticsController.js");
const analyticsController = require("../controllers/analyticsController"); // Adjust path if needed
const upload = multer({ storage: multer.memoryStorage() });

// File Upload Routes
router.post("/upload-csv", upload.single("file"), uploadCsvData);
router.post("/upload-atkt-csv", upload.single("file"), uploadAtktCsvData);
router.post("/upload-nep-pdf", upload.single("file"), uploadNepPdfData);
router.post("/:prn/ml-insights", getStudentMLInsights);

// Utility Routes
router.post("/merge", mergeStudents);
router.get("/", getStudents);
router.get("/sem1", getSem1Students);
router.get("/sem2", getSem2Students);
router.get("/sem7", getSem7Students);
router.get("/history/:prn", getStudentHistory);
router.get("/batch/:batch", getStudentsByBatch);
router.get("/analytics/batch", getBatchAnalytics);
router.get("/analytics/batch", analyticsController.getBatchAnalytics);
router.get("/analytics/golden", analyticsController.getGoldenStudents);
router.get("/analytics/golden1", analyticsController.getGoldenStudents1);

const { spawn } = require("child_process");

router.get("/ml-analysis", (req, res) => {
  const pythonProcess = spawn("python", ["./ML/ml_service.py"]);
  let dataString = "";

  pythonProcess.stdout.on("data", (data) => {
    dataString += data.toString();
  });

  pythonProcess.stdout.on("end", () => {
    try {
      // If dataString is empty or not valid JSON, it will throw to catch block
      const analysis = JSON.parse(dataString);
      res.json(Array.isArray(analysis) ? analysis : []);
    } catch (error) {
      console.error("Parse Error:", dataString);
      res.status(500).json([]); // Send empty array on error to prevent .map() crash
    }
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python Script Error: ${data}`);
  });
});

module.exports = router;
