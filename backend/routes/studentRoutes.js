const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  uploadCsvData,
  uploadNepPdfData,
  getStudents,
  getStudentHistory,
  getStudentsByBatch,
  mergeStudents
} = require("../controllers/studentController");

const upload = multer({ storage: multer.memoryStorage() });

// File Upload Routes
router.post("/upload-csv", upload.single("file"), uploadCsvData);
router.post("/upload-nep-pdf", upload.single("file"), uploadNepPdfData); 

// Merge Temp Students Route
router.post("/merge", mergeStudents);

// Data Retrieval Routes
router.get("/", getStudents);
router.get("/history/:prn", getStudentHistory);
router.get("/batch/:batch", getStudentsByBatch);

module.exports = router;