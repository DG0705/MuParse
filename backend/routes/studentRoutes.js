const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  uploadCsvData,
  uploadNepPdfData,
  uploadAtktCsvData, // <-- Added ATKT Controller
  getStudents,
  getStudentHistory,
  getStudentsByBatch,
  mergeStudents
} = require("../controllers/studentController");

const upload = multer({ storage: multer.memoryStorage() });

// File Upload Routes
router.post("/upload-csv", upload.single("file"), uploadCsvData);
router.post("/upload-atkt-csv", upload.single("file"), uploadAtktCsvData); // <-- Added ATKT Route
router.post("/upload-nep-pdf", upload.single("file"), uploadNepPdfData); 

// Utility Routes
router.post("/merge", mergeStudents);
router.get("/", getStudents);
router.get("/history/:prn", getStudentHistory);
router.get("/batch/:batch", getStudentsByBatch);

module.exports = router;