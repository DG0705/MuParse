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
  uploadMasterCsv,
  mergeStudents,
  getSem1Students,
  getSem2Students,
  getSem3Students,
  getSem4Students,
  getSem5Students,
  getSem6Students,
  getSem7Students,
  uploadCsvDataSem3,
  uploadCsvDataSem4,
  uploadCsvDataSem5,
  getSemAnalysis,
  analyzeSem3CsvDirectly,
  // getSem7Analysis,
} = require("../controllers/studentController");

// const { getStudentMLInsights } = require("../controllers/mlController");
const { getBatchAnalytics } = require("../controllers/analyticsController.js");
const analyticsController = require("../controllers/analyticsController"); // Adjust path if needed
const upload = multer({ storage: multer.memoryStorage() });

// File Upload Routes
router.post("/upload-master", upload.single("file"), uploadMasterCsv);
router.post("/upload-csv-sem5", upload.single("file"), uploadCsvDataSem5);
router.post("/upload-csv-sem3", upload.single("file"), uploadCsvDataSem3);
router.post("/upload-csv-sem4", upload.single("file"), uploadCsvDataSem4);
router.post("/upload-csv", upload.single("file"), uploadCsvData);
router.post("/upload-atkt-csv", upload.single("file"), uploadAtktCsvData);
router.post("/upload-nep-pdf", upload.single("file"), uploadNepPdfData);
router.get("/sem/:sem", getSemAnalysis);
router.post("/analyze-sem3-csv", upload.single("file"), analyzeSem3CsvDirectly);
// router.get("/sem7/:sem", getSem7Analysis);

// Utility Routes
router.post("/merge", mergeStudents);
router.get("/", getStudents);
router.get("/sem1", getSem1Students);
router.get("/sem2", getSem2Students);
router.get("/sem3", getSem3Students);
router.get("/sem4", getSem4Students);
router.get("/sem5", getSem5Students);
router.get("/sem6", getSem6Students); // <-- Typo fixed here
router.get("/sem7", getSem7Students);
router.get("/history/:prn", getStudentHistory);
router.get("/batch/:batch", getStudentsByBatch);
router.get("/analytics/golden", analyticsController.getGoldenStudents);
router.get("/analytics/golden1", analyticsController.getGoldenStudents1);

const { spawn } = require("child_process");

module.exports = router;
