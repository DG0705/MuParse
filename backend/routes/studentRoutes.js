import express from 'express';
import multer from 'multer';
import { uploadCsvData, getStudents ,getStudentHistory, getStudentsByBatch } from '../controllers/studentController.js';






const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload CSV (Generated from PDF on Frontend)
router.post('/upload-csv', upload.single('file'), uploadCsvData);

// Get Raw Data
router.get('/', getStudents);

// Get Analysis (New Endpoint)
// router.get('/analysis', getStudentAnalysis);


// New Route for searching by PRN
router.get('/history/:prn', getStudentHistory);

router.get('/batch/:batch', getStudentsByBatch);

export default router;