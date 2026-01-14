import express from 'express';
import multer from 'multer';
import {  uploadCsvData } from '../controllers/studentController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Production: Used by React (JSON)
// router.post('/upload', uploadStudentData);
// yes sir

// Testing/Admin: Used by Postman (CSV File)
router.post('/upload-csv', upload.single('file'), uploadCsvData);

export default router;