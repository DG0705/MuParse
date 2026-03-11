const Papa = require("papaparse");
const { spawn } = require("child_process");
const path = require("path");
const fs = require('fs');
const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");

// --- NEP PDF Processor ---
const uploadNepPdfData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload an NEP PDF file." });

    // Ensure directory exists for temp storage
    const tempDir = path.join(__dirname, "../../nep_analysis/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `upload_${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const pythonScript = path.join(__dirname, "../../nep_analysis/parser_bridge.py");
    const pythonProcess = spawn("python", [pythonScript, tempFilePath]);

    let resultData = "";
    pythonProcess.stdout.on("data", (data) => { resultData += data.toString(); });
    pythonProcess.stderr.on("data", (data) => { console.error(`Python Error: ${data}`); });

    pythonProcess.on("close", async (code) => {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        if (code !== 0) return res.status(500).json({ error: "Python script failed to execute." });

        const students = JSON.parse(resultData);
        const masterOps = [];
        const academicOps = [];

        for (const data of students) {
          const finalPRN = data.prn || data.seat_no;

          masterOps.push({
            updateOne: {
              filter: { prn: finalPRN },
              update: {
                $set: { gender: data.gender, status: "Regular" },
                $setOnInsert: { name: data.name, batch: "NEP-2024" },
              },
              upsert: true,
            },
          });

          academicOps.push({
            updateOne: {
              filter: { prn: finalPRN, semester: req.body.semester || 1 },
              update: {
                $set: { 
                  seatNo: data.seat_no, 
                  sgpi: data.sgpi, 
                  totalMarks: data.total_marks, 
                  finalResult: data.result, 
                  subjects: data.subjects, 
                  isNEP: true 
                },
              },
              upsert: true,
            },
          });
        }

        if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
        if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);

        // --- UPDATED RESPONSE: Sends data back to React ---
        res.json({ 
          success: true, 
          message: `NEP PDF Processed. Found ${students.length} students.`,
          students: students // This line feeds your frontend preview table
        });
      } catch (parseErr) {
        res.status(500).json({ error: "Data processing failed." });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- R-19 CSV Processor ---
const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    // Existing R-19 logic...
    
    // --- UPDATED RESPONSE: Sends mapped CSV data back to React ---
    res.status(200).json({ 
      success: true,
      message: "CSV Processed",
      students: data.map((s) => ({
        seat_no: s["Seat No"] || s["Seat_No"],
        name: s["Name"],
        prn: s["PRN"],
        result: s["Result"] || s["Final Result"],
        sgpi: s["SGPI"] || s["SGPA"],
      })) // This mapping ensures keys match what your frontend table expects
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- Retrieval Logic ---
const getStudents = async (req, res) => {
  const students = await StudentMaster.find({}).limit(100);
  res.json(students);
};

const getStudentHistory = async (req, res) => {
  const records = await AcademicRecord.find({ prn: req.params.prn });
  res.json(records);
};

// --- EXPORTS (The Critical Part) ---
module.exports = { 
    uploadCsvData, 
    uploadNepPdfData, // This must match the name used in routes
    getStudents, 
    getStudentHistory 
};