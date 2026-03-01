const express = require("express");
const multer = require("multer");

const {
  uploadCsvData,
  uploadPdfData,
  getStudents,
  getStudentHistory,
  getStudentsByBatch,
} = require("../controllers/studentController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// File Upload Routes
router.post("/upload-csv", upload.single("file"), uploadCsvData);
router.post("/upload-pdf", upload.single("file"), uploadPdfData);

// Data Retrieval Routes
router.get("/", getStudents);
router.get("/history/:prn", getStudentHistory);
router.get("/batch/:batch", getStudentsByBatch);

module.exports = router;
