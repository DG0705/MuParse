const Papa = require("papaparse");
const { spawn } = require("child_process");
const path = require("path");
const fs = require('fs');
const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");
const NepAcademicRecord = require("../models/NepAcademicRecord");

// --- NEP PROCESSOR ---
const uploadNepPdfData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload an NEP file." });

    const isCSV = req.file.originalname.toLowerCase().endsWith('.csv') || req.file.mimetype === 'text/csv' || req.file.mimetype === 'application/vnd.ms-excel';

    if (isCSV) {
      const csvString = req.file.buffer.toString();
      const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

      const nepAcademicOps = [];

      data.forEach((s) => {
        const seatNo = s["seat_no"] || s["Seat_No"] || s["Seat No"];
        if (!seatNo) return; 

        const subjects = {};
        const coreFields = ["seat_no", "seat no", "name", "gender", "total_marks", "result", "sgpi", "college_code", "college_name", "prn"];
        Object.keys(s).forEach((key) => {
          if (!coreFields.includes(key.toLowerCase().trim())) {
            subjects[key] = s[key];
          }
        });

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

    // --- FALLBACK TO PYTHON ---
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
      
      // 1. Extract using BOTH variations
      const extractedSGPI = s["SGPI"] || s["SGPA"] || "0";
      const extractedTotal = s["Grand_Total"] || s["Total Marks"] || "0";
      const extractedResult = s["Result"] || s["Final Result"] || "N/A";

      const flatSubjects = {};
      // 2. Exclude BOTH variations so they don't end up in the subjects list
      const excludedKeys = ["seat no", "seat_no", "prn", "name", "gender", "result", "final result", "sgpi", "sgpa", "grand_total", "total marks", "remark"];
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
            // 3. Save the properly extracted values
            $set: { 
              seatNo: cleanSeatNo, 
              sgpi: extractedSGPI, 
              totalMarks: extractedTotal, 
              finalResult: extractedResult, 
              subjects: flatSubjects 
            },
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
        seat_no: s["Seat No"] || s["Seat_No"], name: s["Name"], prn: s["PRN"], result: s["Result"] || s["Final Result"], sgpi: s["SGPI"] || s["SGPA"],
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

// --- MULTI-TABLE SEARCH & DROPPER ENGINE ---
const getStudentHistory = async (req, res) => {
  try {
    const query = req.params.prn;

    // 1. Search R-19 Data
    const r19Matches = await StudentMaster.find({
      $or: [
        { prn: new RegExp(`^${query}$`, "i") },
        { name: new RegExp(query, "i") }
      ]
    }).lean();

    // 2. Search NEP Data
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

    // 3. COMBINE & DEDUPLICATE
    const uniqueMatchesMap = new Map();

    r19Matches.forEach(s => {
      uniqueMatchesMap.set(s.prn, {
        name: s.name,
        prn: s.prn,
        category: s.status || "Regular",
        batch: "R-19 Scheme"
      });
    });

    nepMatches.forEach(s => {
      if (uniqueMatchesMap.has(s.seatNo)) {
        const existing = uniqueMatchesMap.get(s.seatNo);
        existing.batch = "NEP 2024 Scheme"; 
      } else {
        uniqueMatchesMap.set(s.seatNo, {
          name: s.name,
          prn: s.seatNo,
          category: "Regular",
          batch: "NEP 2024 Scheme"
        });
      }
    });

    const combinedList = Array.from(uniqueMatchesMap.values());

    if (combinedList.length === 0) return res.status(404).json({ message: "No student found with that Name, PRN, or Seat No." });

    if (combinedList.length > 1) {
      return res.json({ type: "multiple", count: combinedList.length, students: combinedList });
    }

    const student = combinedList[0];

    const r19Records = await AcademicRecord.find({ prn: student.prn }).lean();
    const nepRecords = await NepAcademicRecord.find({ seatNo: student.prn }).lean();

    const allRecords = [...r19Records, ...nepRecords].sort((a, b) => a.semester - b.semester);

    const academicHistory = {};
    
    // STRICT TRACKERS
    let eseFCount = 0;
    let otherFCount = 0;
    let activeKtsCount = 0; 

    allRecords.forEach(record => {
      const semKey = `Semester ${record.semester}`;
      if (!academicHistory[semKey]) academicHistory[semKey] = [];

      let hasKT = false;
      
      if (record.subjects) {
        Object.entries(record.subjects).forEach(([key, val]) => {
          const k = key.toLowerCase().trim();
          
          // STRICT RULE: ONLY check keys that are explicitly 'Grade' columns
          if (!k.includes('grade') && !k.endsWith('_gr')) return;
          
          // Ignore Total grades just in case
          if (k.includes('tot') || k.includes('result') || k.includes('status') || k.includes('sgp')) return;
          
          const valStr = String(val).trim().toUpperCase();
          const isFail = valStr === 'F' || valStr === 'ABS' || valStr === 'KT' || 
                         (valStr.includes('F') && valStr.length <= 6 && !valStr.includes('FEM'));

          if (isFail) {
              hasKT = true;
              activeKtsCount++;
              
              if (k.includes('ese') || k.includes('th') || k.includes('theory')) {
                  eseFCount++;
              } else if (k.includes('ia') || k.includes('tw') || k.includes('pr') || k.includes('or') || k.includes('pract') || k.includes('term') || k.includes('internal')) {
                  otherFCount++;
              } else {
                  eseFCount++; 
              }
          }
        });
      }
      
      const resUpper = String(record.finalResult).toUpperCase();
      if (resUpper === "F" || resUpper === "FAILED" || resUpper === "KT" || resUpper.includes("FAIL")) hasKT = true;

      academicHistory[semKey].push({
        seatNo: record.seatNo,
        sgpi: record.sgpi || "0",
        totalMarks: record.totalMarks || "0",
        result: record.finalResult || "N/A",
        hasKT: hasKT,
        subjects: record.subjects || {}
      });
    });

    const totalSystemFails = eseFCount + otherFCount;

    // --- STRICT DYNAMIC DROPPER LOGIC ---
    let finalCategory = "Regular"; 
    
    if (student.batch === "R-19 Scheme" || !student.batch?.includes("NEP")) {
        
        // 1. If no active KTs, always Regular
        if (activeKtsCount === 0) {
            finalCategory = "Regular";
        } else {
            // 2. Exact Dropper Rules
            if (eseFCount >= 5) {
                finalCategory = "Dropper";
            } else if (totalSystemFails >= 10) {
                finalCategory = "Dropper";
            } else {
                finalCategory = "Regular"; 
            }
        }
    }

    res.json({
      type: "single",
      profile: {
        name: student.name,
        prn: student.prn,
        category: finalCategory, 
        batch: student.batch
      },
      summary: { totalSemestersAppeared: allRecords.length, ktCount: activeKtsCount },
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

    if (!sourcePrn || !targetPrn) {
      return res.status(400).json({ error: "Missing source or target PRN." });
    }

    // 1. Move R-19 Academic Records Safely
    const sourceR19Records = await AcademicRecord.find({ prn: sourcePrn });
    for (const record of sourceR19Records) {
        const existingTargetSem = await AcademicRecord.findOne({ 
            prn: targetPrn, 
            semester: record.semester 
        });
        
        if (existingTargetSem) {
            await AcademicRecord.deleteOne({ _id: record._id });
        } else {
            await AcademicRecord.updateOne({ _id: record._id }, { $set: { prn: targetPrn } });
        }
    }

    // 2. Move NEP Academic Records Safely
    const sourceNepRecords = await NepAcademicRecord.find({ seatNo: sourcePrn });
    for (const record of sourceNepRecords) {
        const existingTargetSem = await NepAcademicRecord.findOne({ 
            seatNo: targetPrn, 
            semester: record.semester 
        });
        
        if (existingTargetSem) {
            await NepAcademicRecord.deleteOne({ _id: record._id });
        } else {
            await NepAcademicRecord.updateOne({ _id: record._id }, { $set: { seatNo: targetPrn } });
        }
    }

    // 3. Handle Master Profile Identity
    const existingTarget = await StudentMaster.findOne({ prn: targetPrn });
    if (existingTarget) {
        await StudentMaster.deleteOne({ prn: sourcePrn });
    } else {
        await StudentMaster.updateOne({ prn: sourcePrn }, { $set: { prn: targetPrn } });
    }

    res.json({ success: true, message: "Profiles merged successfully!" });
  } catch (error) { 
    console.error("Merge error:", error);
    res.status(500).json({ error: error.message || "Database Merge Error" }); 
  }
};



// --- R-19 ATKT SMART PROCESSOR ---
const uploadAtktCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    const semNum = Number(req.body.semester);
    if (!semNum) return res.status(400).json({ message: "Semester number is required." });

    const academicOps = [];

    data.forEach((s) => {
      const seatKey = Object.keys(s).find((k) => k.trim() === "Seat No" || k.trim() === "Seat_No");
      const cleanSeatNo = (seatKey ? s[seatKey] : "").toString().replace(/[^0-9]/g, "");
      const rawPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");
      
      if (!rawPRN) return; 

      const extractedSGPI = s["SGPI"] || s["SGPA"] || "0";
      const extractedTotal = s["Grand_Total"] || s["Total Marks"] || "0";
      const extractedResult = s["Result"] || s["Final Result"] || "N/A";

      const flatSubjects = {};
      const excludedKeys = ["seat no", "seat_no", "prn", "name", "gender", "result", "final result", "sgpi", "sgpa", "grand_total", "total marks", "remark"];
      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) flatSubjects[key] = s[key];
      });

      const updateFields = {
        sgpi: extractedSGPI, 
        totalMarks: extractedTotal,
        finalResult: extractedResult,
        seatNo: cleanSeatNo 
      };

      Object.entries(flatSubjects).forEach(([key, val]) => {
         if (val && val.toString().trim() !== "") {
             updateFields[`subjects.${key}`] = val;
         }
      });

      academicOps.push({
        updateOne: {
          filter: { prn: rawPRN, semester: semNum },
          update: { $set: updateFields },
          upsert: true 
        },
      });
    });

    if (academicOps.length > 0) {
        const dbResult = await AcademicRecord.bulkWrite(academicOps);
        res.status(200).json({ 
          success: true,
          message: `ATKT Processed! Smart Updated ${dbResult.modifiedCount} records & Inserted ${dbResult.upsertedCount}.`,
          students: data.map((s) => ({
            seat_no: s["Seat No"] || s["Seat_No"], name: s["Name"], prn: s["PRN"], result: s["Result"] || s["Final Result"], sgpi: s["SGPI"] || s["SGPA"],
          }))
        });
    } else {
        res.status(400).json({ error: "No valid ATKT records with PRNs found." });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
};


module.exports = { 
    uploadCsvData, 
    uploadNepPdfData,
    uploadAtktCsvData, 
    getStudents, 
    getStudentHistory,
    getStudentsByBatch,
    mergeStudents
};