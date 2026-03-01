import express from 'express';
import multer from 'multer';
import { 
    uploadCsvData,
    uploadPdfData,
    getStudents,
    getStudentHistory,
    getStudentsByBatch 
} from '../controllers/studentController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); 

// File Upload Routes
router.post('/upload-csv', upload.single('file'), uploadCsvData);
router.post('/upload-pdf', upload.single('file'), uploadPdfData);

// Data Retrieval Routes
router.get('/', getStudents);
router.get('/history/:prn', getStudentHistory);
router.get('/batch/:batch', getStudentsByBatch);

export default router;