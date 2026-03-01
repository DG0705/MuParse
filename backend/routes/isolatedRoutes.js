const express = require("express");
const multer = require("multer");
const {
  handleIsolatedExtraction,
} = require("../controllers/isolatedUploadController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Route for extracting PDF data without saving to the database
router.post("/extract-pdf", upload.single("file"), handleIsolatedExtraction);

module.exports = router;
