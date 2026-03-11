const Papa = require("papaparse");
const { spawn } = require("child_process");
const path = require("path");
const fs = require('fs');
const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");
const NepAcademicRecord = require("../models/NepAcademicRecord");

// --- NEP PROCESSOR (Handles BOTH direct CSVs and PDFs) ---
const uploadNepPdfData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload an NEP file." });

    // Detect if the user uploaded the CSV directly
    const isCSV = req.file.originalname.toLowerCase().endsWith('.csv') || req.file.mimetype === 'text/csv' || req.file.mimetype === 'application/vnd.ms-excel';

    if (isCSV) {
      const csvString = req.file.buffer.toString();
      const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

      const nepAcademicOps = [];

      data.forEach((s) => {
        const seatNo = s["seat_no"] || s["Seat_No"] || s["Seat No"];
        if (!seatNo) return; // Skip empty rows

        const subjects = {};
        // Map all dynamic sub_ columns to the subjects Map
        const coreFields = ["seat_no", "seat no", "name", "gender", "total_marks", "result", "sgpi", "college_code", "college_name", "prn"];
        Object.keys(s).forEach((key) => {
          if (!coreFields.includes(key.toLowerCase().trim())) {
            subjects[key] = s[key];
          }
        });

        // Insert directly into NepAcademicRecord (No StudentMaster/PRN needed)
        nepAcademicOps.push({
          updateOne: {
            filter: { seatNo: seatNo.toString().trim(), semester: req.body.semester || 1 },
            update: {
              $set: { 
                name: s["name"] || s["Name"] || "Unknown",
                gender: s["gender"] || s["Gender"] || "Unknown",
                collegeCode: s["college_code"] || "",
                collegeName: s["college_name"] || "",
                sgpi: s["sgpi"] || s["SGPI"] || "0", 
                totalMarks: s["total_marks"] || s["Total Marks"] || "0", 
                finalResult: s["result"] || s["Result"] || "N/A", 
                subjects: subjects 
              },
            },
            upsert: true,
          },
        });
      });

      if (nepAcademicOps.length > 0) await NepAcademicRecord.bulkWrite(nepAcademicOps);

      return res.json({ success: true, message: `NEP CSV Processed. Saved to Dedicated NEP Database.`, students: data });
    }

    // --- FALLBACK TO PYTHON IF A PDF IS UPLOADED ---
    const tempDir = path.join(__dirname, "../../nep_analysis/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `upload_${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const pythonScript = path.join(__dirname, "../../nep_analysis/parser_bridge.py");
    
    if (!fs.existsSync(pythonScript)) {
      return res.status(500).json({ error: `Cannot find Python script at: ${pythonScript}` });
    }

    const pythonProcess = spawn("python", [pythonScript, tempFilePath]);

    let resultData = "";
    let pythonErrorText = "";

    pythonProcess.stdout.on("data", (data) => { resultData += data.toString(); });
    pythonProcess.stderr.on("data", (data) => { pythonErrorText += data.toString(); });

    pythonProcess.on("close", async (code) => {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (code !== 0) return res.status(500).json({ error: `Python crashed: ${pythonErrorText.substring(0, 150)}...` });

        let students;
        try {
          students = JSON.parse(resultData);
        } catch (jsonErr) {
          return res.status(500).json({ error: `Python output was not valid JSON.` });
        }

        const nepAcademicOps = []; 

        for (const data of students) {
          nepAcademicOps.push({
            updateOne: {
              filter: { seatNo: data.seat_no, semester: req.body.semester || 1 },
              update: {
                $set: { 
                  name: data.name || "Unknown",
                  gender: data.gender || "Unknown",
                  collegeCode: data.college_code || "",
                  collegeName: data.college_name || "",
                  sgpi: data.sgpi, 
                  totalMarks: data.total_marks, 
                  finalResult: data.result, 
                  subjects: data.subjects || {}
                },
              },
              upsert: true,
            },
          });
        }

        if (nepAcademicOps.length > 0) await NepAcademicRecord.bulkWrite(nepAcademicOps);

        res.json({ success: true, message: `NEP PDF Processed & Saved to Dedicated NEP Table.`, students });
      } catch (dbError) {
        res.status(500).json({ error: `Database error: ${dbError.message}` });
      }
    });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

// --- R-19 CSV PROCESSOR ---
const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    const semNum = Number(req.body.semester);
    if (!semNum) return res.status(400).json({ message: "Semester number is required." });

    const masterOps = [];
    const academicOps = [];

    data.forEach((s) => {
      const seatKey = Object.keys(s).find((k) => k.trim() === "Seat No" || k.trim() === "Seat_No");
      const cleanSeatNo = (seatKey ? s[seatKey] : "").toString().replace(/[^0-9]/g, "");
      const rawPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");
      if (!cleanSeatNo) return;

      const finalPRN = rawPRN || `TEMP_${cleanSeatNo}`;
      
      const flatSubjects = {};
      const excludedKeys = ["seat no", "seat_no", "prn", "name", "gender", "result", "sgpi", "grand_total", "remark"];
      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) flatSubjects[key] = s[key];
      });

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: { $set: { gender: s["Gender"] || "" }, $setOnInsert: { name: s["Name"] || "Unknown" } },
          upsert: true,
        },
      });

      academicOps.push({
        updateOne: {
          filter: { prn: finalPRN, semester: semNum },
          update: {
            $set: { seatNo: cleanSeatNo, sgpi: s["SGPI"] || "0", finalResult: s["Result"] || "N/A", subjects: flatSubjects },
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);

    res.status(200).json({ 
      success: true,
      message: "CSV Processed and saved to R-19 Database",
      students: data.map((s) => ({
        seat_no: s["Seat No"] || s["Seat_No"], name: s["Name"], prn: s["PRN"], result: s["Result"], sgpi: s["SGPI"],
      }))
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- DATA RETRIEVAL FOR ANALYSIS TABS ---
const getStudents = async (req, res) => {
  try {
    const { semester, isNEP } = req.query;

    if (semester) {
      if (isNEP === 'true') {
        const records = await NepAcademicRecord.find({ semester: Number(semester) });
        const formatted = records.map(r => ({
          seatNo: r.seatNo,
          name: r.name,
          gender: r.gender,
          results: { sgpi: r.sgpi, finalResult: r.finalResult },
          subjects: r.subjects || {}
        }));
        return res.json(formatted);
      } else {
        const records = await AcademicRecord.find({ semester: Number(semester) });
        const prns = records.map(r => r.prn);
        const students = await StudentMaster.find({ prn: { $in: prns } });
        
        const studentMap = {};
        students.forEach(s => studentMap[s.prn] = s);

        const formatted = records.map(r => {
          const studentDetails = studentMap[r.prn] || {};
          return {
            seatNo: r.seatNo,
            name: studentDetails.name || "Unknown",
            gender: studentDetails.gender || "Unknown",
            results: { sgpi: r.sgpi, finalResult: r.finalResult },
            subjects: r.subjects || {}
          };
        });
        return res.json(formatted);
      }
    }

    const allStudents = await StudentMaster.find({}).limit(100);
    res.json(allStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- MULTI-TABLE SEARCH SYSTEM (R-19 & NEP) ---
const getStudentHistory = async (req, res) => {
  try {
    const query = req.params.prn;

    const r19Matches = await StudentMaster.find({
      $or: [
        { prn: new RegExp(`^${query}$`, "i") },
        { name: new RegExp(query, "i") }
      ]
    }).lean();

    const nepMatchesRaw = await NepAcademicRecord.find({
      $or: [
        { seatNo: new RegExp(`^${query}$`, "i") },
        { name: new RegExp(query, "i") }
      ]
    }).lean();

    const uniqueNepStudents = {};
    nepMatchesRaw.forEach(record => {
      if (!uniqueNepStudents[record.seatNo]) {
        uniqueNepStudents[record.seatNo] = { name: record.name, seatNo: record.seatNo, category: "NEP-2024" };
      }
    });
    const nepMatches = Object.values(uniqueNepStudents);

    const totalMatches = r19Matches.length + nepMatches.length;

    if (totalMatches === 0) return res.status(404).json({ message: "No student found with that Name, PRN, or Seat No." });

    if (totalMatches > 1) {
      const combinedList = [
        ...r19Matches.map(s => ({ name: s.name, prn: s.prn, category: s.status || "Regular", batch: s.batch || "R-19" })),
        ...nepMatches.map(s => ({ name: s.name, prn: s.seatNo, category: "Regular", batch: "NEP-2024" }))
      ];
      return res.json({ type: "multiple", count: combinedList.length, students: combinedList });
    }

    let profile = {};
    let allRecords = [];

    if (r19Matches.length === 1) {
      const student = r19Matches[0];
      profile = { name: student.name, prn: student.prn, category: student.status || "R-19" };
      allRecords = await AcademicRecord.find({ prn: student.prn }).lean();
    } else {
      const student = nepMatches[0];
      profile = { name: student.name, prn: student.seatNo, category: "NEP-2024" };
      allRecords = await NepAcademicRecord.find({ seatNo: student.seatNo }).lean();
    }

    allRecords.sort((a, b) => a.semester - b.semester);

    const academicHistory = {};
    let totalKts = 0;

    allRecords.forEach(record => {
      const semKey = `Semester ${record.semester}`;
      if (!academicHistory[semKey]) academicHistory[semKey] = [];

      let hasKT = false;
      if (record.subjects) {
        Object.values(record.subjects).forEach(val => {
          const mark = String(val).trim().toUpperCase();
          if (mark === "F" || mark.includes("KT") || mark === "ABS") {
            hasKT = true;
            totalKts++;
          }
        });
      }
      
      if (record.finalResult === "F" || record.finalResult === "FAILED" || record.finalResult === "KT") hasKT = true;

      academicHistory[semKey].push({
        seatNo: record.seatNo,
        sgpi: record.sgpi || "0",
        totalMarks: record.totalMarks || "0",
        result: record.finalResult || "N/A",
        hasKT: hasKT,
        subjects: record.subjects || {}
      });
    });

    res.json({
      type: "single",
      profile: profile,
      summary: { totalSemestersAppeared: allRecords.length, ktCount: totalKts },
      academicHistory: academicHistory
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentsByBatch = async (req, res) => {
  try {
    const students = await StudentMaster.find({ batch: new RegExp(req.params.batch, "i") });
    if (students.length === 0) return res.status(404).json({ message: "No students found for this batch" });
    res.status(200).json(students);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const mergeStudents = async (req, res) => {
  try {
    const { sourcePrn, targetPrn } = req.body;
    await AcademicRecord.updateMany({ prn: sourcePrn }, { $set: { prn: targetPrn } });
    await StudentMaster.deleteOne({ prn: sourcePrn });
    res.json({ success: true, message: "Profiles merged successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { 
    uploadCsvData, 
    uploadNepPdfData,
    getStudents, 
    getStudentHistory,
    getStudentsByBatch,
    mergeStudents
};