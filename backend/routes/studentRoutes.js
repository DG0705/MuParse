const express = require("express");
const multer = require("multer");
const router = express.Router();

// Ensure path is correct and names match the module.exports above
const {
  uploadCsvData,
  uploadNepPdfData,
  getStudents,
  getStudentHistory,
} = require("../controllers/studentController");

const upload = multer({ storage: multer.memoryStorage() });

// File Upload Routes
router.post("/upload-csv", upload.single("file"), uploadCsvData);

// This is likely line 18 where it was crashing
router.post("/upload-nep-pdf", upload.single("file"), uploadNepPdfData); 

// Data Retrieval Routes
router.get("/", getStudents);
router.get("/history/:prn", getStudentHistory);

module.exports = router;