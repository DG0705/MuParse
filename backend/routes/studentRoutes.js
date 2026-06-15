const express = require("express");
const multer = require("multer");
const router = express.Router();

const studentController = require("../controllers/studentController");
const analyticsController = require("../controllers/analyticsController"); 

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. FILE UPLOAD ROUTES
// ==========================================

// Master List Upload (Source of Truth)
router.post("/upload-master", upload.single("file"), studentController.uploadMasterCsv);

// NEW: Smart Universal Uploader Route
// This listens to the frontend SemesterConverter and routes to the correct logic!
router.post("/upload-semester/:semester", upload.single("file"), (req, res, next) => {
    const sem = req.params.semester;
    req.body.semester = sem; // Pass semester into the request body for the controller

    if (['1', '2', '7', '8'].includes(sem)) {
        return studentController.uploadCsvData(req, res, next);
    } else if (sem === '3') {
        return studentController.uploadCsvDataSem3(req, res, next);
    } else if (sem === '4') {
        return studentController.uploadCsvDataSem4(req, res, next);
    } else if (sem === '5') {
        return studentController.uploadCsvDataSem5(req, res, next);
    } else if (sem === '6') {
        // Assuming Sem 6 uses the same logic structure as Sem 5 for now
        return studentController.uploadCsvDataSem5(req, res, next);
    } else {
        return res.status(400).json({ success: false, message: "Uploader not configured for this semester." });
    }
});

// Specialized / PDF Uploads
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

// Individual Semester Retrievals (Legacy Support)
router.get("/sem1", studentController.getSem1Students);
router.get("/sem2", studentController.getSem2Students);
router.get("/sem3", studentController.getSem3Students);
router.get("/sem4", studentController.getSem4Students);
router.get("/sem5", studentController.getSem5Students);
router.get("/sem6", studentController.getSem6Students); 
router.get("/sem7", studentController.getSem7Students);

module.exports = router;