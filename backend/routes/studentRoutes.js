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
  getSem3Students,
  getSem7Students,
} = require("../controllers/studentController");

const analyticsController = require("../controllers/analyticsController"); 
const upload = multer({ storage: multer.memoryStorage() });

// File Upload Routes
router.post("/upload-csv", upload.single("file"), uploadCsvData);
router.post("/upload-atkt-csv", upload.single("file"), uploadAtktCsvData);
router.post("/upload-nep-pdf", upload.single("file"), uploadNepPdfData);

// Utility Routes
router.post("/merge", mergeStudents);
router.get("/", getStudents);
router.get("/sem1", getSem1Students);
router.get("/sem2", getSem2Students);
router.get("/sem3", getSem3Students);

// TODO: Commented out until you write these functions!
// router.get("/sem4", getSem4Students);
// router.get("/sem5", getSem5Students);
// router.get("/sem6", getSem6Students); 

router.get("/sem7", getSem7Students);
router.get("/history/:prn", getStudentHistory);
router.get("/batch/:batch", getStudentsByBatch);
router.get("/analytics/golden", analyticsController.getGoldenStudents);
router.get("/analytics/golden1", analyticsController.getGoldenStudents1);

module.exports = router;