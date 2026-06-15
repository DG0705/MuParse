const express = require("express");
const multer = require("multer");
const router = express.Router();

const studentController = require("../controllers/studentController");
const analyticsController = require("../controllers/analyticsController"); 

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. FILE UPLOAD ROUTES
// ==========================================
router.post("/upload-master", upload.single("file"), studentController.uploadMasterCsv);
router.post("/upload-csv", upload.single("file"), studentController.uploadCsvData);
router.post("/upload-csv-sem3", upload.single("file"), studentController.uploadCsvDataSem3);
router.post("/upload-csv-sem4", upload.single("file"), studentController.uploadCsvDataSem4);
router.post("/upload-csv-sem5", upload.single("file"), studentController.uploadCsvDataSem5);
router.post("/upload-atkt-csv", upload.single("file"), studentController.uploadAtktCsvData);
router.post("/upload-nep-pdf", upload.single("file"), studentController.uploadNepPdfData);
router.post("/analyze-sem3-csv", upload.single("file"), studentController.analyzeSem3CsvDirectly);


// ==========================================
// 2. ANALYTICS ROUTES
// ==========================================
router.get("/sem/:sem", studentController.getSemAnalysis);
router.get("/analytics/semester-batch", analyticsController.getSemesterAnalysisBatchWise);
router.get("/analytics/golden", analyticsController.getGoldenStudents);
router.get("/analytics/golden1", analyticsController.getGoldenStudents1);


// ==========================================
// 3. STUDENT DATA & UTILITY ROUTES
// ==========================================
router.post("/merge", studentController.mergeStudents);
router.get("/", studentController.getStudents);
router.get("/history/:prn", studentController.getStudentHistory);
router.get("/batch/:batch", studentController.getStudentsByBatch);

// Individual Semester Retrievals
router.get("/sem1", studentController.getSem1Students);
router.get("/sem2", studentController.getSem2Students);
router.get("/sem3", studentController.getSem3Students);
router.get("/sem4", studentController.getSem4Students);
router.get("/sem5", studentController.getSem5Students);
router.get("/sem6", studentController.getSem6Students); 
router.get("/sem7", studentController.getSem7Students);

module.exports = router;