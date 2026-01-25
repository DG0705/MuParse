import Papa from 'papaparse';

// Import All Semester Models
import StudentMaster from '../models/StudentMaster.js';
import Semester1 from '../models/Semester1.js';
import Semester2 from '../models/Semester2.js';
import Semester3 from '../models/Semester3.js';
import Semester4 from '../models/Semester4.js'; //
import Semester5 from '../models/Semester5.js'; //
import Semester6 from '../models/Semester6.js'; //
import Semester7 from '../models/Semester7.js';
import Semester8 from '../models/Semester8.js'; //

// Map semester numbers to their Models
const SEMESTER_MODELS = {
  1: Semester1,
  2: Semester2,
  3: Semester3,
  4: Semester4,
  5: Semester5,
  6: Semester6,
  7: Semester7,
  8: Semester8
};

// 1. Upload CSV and Store Data
export const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    
    const { semester } = req.body;
    const semNum = Number(semester);

    if (!semNum || !SEMESTER_MODELS[semNum]) {
      return res.status(400).json({ message: `Invalid or unsupported semester: ${semester}` });
    }

    // Select the correct Model based on the semester
    const TargetModel = SEMESTER_MODELS[semNum];

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    if (!data || data.length === 0) {
        return res.status(400).json({ message: "CSV file is empty." });
    }

    const masterOps = [];
    const semesterOps = [];

    data.forEach((s) => {
      // Flexible key matching
      const seatKey = Object.keys(s).find(k => k.trim() === "Seat No" || k.trim() === "Seat_No");
      const prnKey = Object.keys(s).find(k => k.trim() === "PRN");
      
      const rawSeat = seatKey ? s[seatKey] : "";
      const rawPRN = prnKey ? s[prnKey] : "";

      const cleanSeatNo = rawSeat.toString().replace(/[^0-9]/g, "");
      const cleanPRN = rawPRN.toString().replace(/[^0-9]/g, "");

      if (!cleanSeatNo) return; // Skip if no Seat No

      // Master Data Updates
      masterOps.push({
        updateOne: {
          filter: { prn: cleanPRN || `UNKNOWN_${cleanSeatNo}` }, // Fallback if PRN missing
          update: {
            $set: {
              name: s["Name"] || "Unknown",
              gender: s["Gender"] || "",
              motherName: s["Mother Name"] || "",
              status: s["Status"] || "Regular" 
            }
          },
          upsert: true,
        },
      });

      // Semester Specific Data Updates
      semesterOps.push({
        updateOne: {
          filter: { seatNo: cleanSeatNo },
          update: {
            $set: {
              prn: cleanPRN,
              name: s["Name"] || "Unknown",
              semester: semNum,
              results: {
                sgpi: s["SGPI"] || s["SGPA"] || "0",
                totalMarks: s["Total Marks"] || "0",
                finalResult: s["Result"] || s["Final Result"] || "N/A"
              },
              subjects: s // Stores the subject marks
            }
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    
    // Write to the specific Semester Table
    const result = await TargetModel.bulkWrite(semesterOps);

    res.status(200).json({ 
      success: true, 
      message: `Processed ${data.length} records for Semester ${semNum}.`,
      upserted: result.upsertedCount,
      modified: result.modifiedCount 
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2. Get Students (Dynamic Fetch)
export const getStudents = async (req, res) => {
  try {
    const { semester } = req.query;
    const semNum = Number(semester);
    
    if (!semNum || !SEMESTER_MODELS[semNum]) {
      return res.status(400).json({ message: "Invalid semester." });
    }

    const TargetModel = SEMESTER_MODELS[semNum];
    const students = await TargetModel.find({});
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


