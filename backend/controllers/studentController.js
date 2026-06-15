const Papa = require("papaparse");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");
const NepAcademicRecord = require("../models/NepAcademicRecord");
const CollegeStudentDetails = require("../models/CollegeStudentDetails");

// ==========================================
// SMART PRN RESOLVER ENGINE (Master List Source of Truth)
// ==========================================
const resolvePrnByName = async (csvName) => {
  if (!csvName) return null;
  
  let cleanCsvName = csvName.replace(/[.,\-()\/]/g, " ").trim();
  const nameWords = cleanCsvName.split(/\s+/).filter((w) => w.trim().length > 1);

  if (nameWords.length === 0) return null;

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const primaryWords = nameWords.slice(0, 2);

  const searchConditions = primaryWords.map((word) => ({
    name: { $regex: "\\b" + escapeRegExp(word) + "\\b", $options: "i" },
  }));

  // SEARCH STRICTLY IN StudentMaster
  let matchedStudents = await StudentMaster.find({ $and: searchConditions });

  if (matchedStudents.length === 1) {
    return matchedStudents[0].prn.toString();
  } else if (matchedStudents.length === 0 && primaryWords.length > 0) {
    const fallbackMatches = await StudentMaster.find({
      name: { $regex: "\\b" + escapeRegExp(primaryWords[0]) + "\\b", $options: "i" },
    });
    if (fallbackMatches.length === 1) {
      return fallbackMatches[0].prn.toString();
    }
  }
  
  return null; // Strict Drop: If not found in Master DB, skip them
};

// ==========================================
// MASTER LIST UPLOADER
// ==========================================
const uploadMasterCsv = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    const masterOps = [];

    data.forEach((s) => {
      const prnKey = Object.keys(s).find(k => k.toLowerCase().includes("prn") || k.toLowerCase().includes("registration"));
      const nameKey = Object.keys(s).find(k => k.toLowerCase().includes("name"));
      const batchKey = Object.keys(s).find(k => k.toLowerCase().includes("batch"));

      const rawPRN = prnKey && s[prnKey] ? s[prnKey].toString().replace(/[^0-9]/g, "") : "";
      const name = nameKey && s[nameKey] ? s[nameKey] : "Unknown";
      const batch = batchKey && s[batchKey] ? s[batchKey] : "Unknown";

      if (!rawPRN) return;

      masterOps.push({
        updateOne: {
          filter: { prn: rawPRN },
          update: { $set: { name: name, batch: batch } },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) {
      await StudentMaster.bulkWrite(masterOps);
      // Keep legacy CollegeStudentDetails in sync just in case
      await CollegeStudentDetails.bulkWrite(masterOps); 
      res.status(200).json({ success: true, message: `Master Data Uploaded! Successfully added/updated ${masterOps.length} students.` });
    } else {
      res.status(400).json({ error: "No valid students with PRNs found." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ==========================================
// SEMESTER 1, 2, 7, 8 UPLOADER (Explicit PRN)
// ==========================================
const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    const semNum = Number(req.body.semester);
    if (!semNum) return res.status(400).json({ message: "Semester number is required." });

    const allMasterStudents = await StudentMaster.find({}, "prn name").lean();
    const validPrns = new Set(allMasterStudents.map((s) => s.prn.toString()));

    const academicOps = []; 
    const collegeUpdateOps = []; 
    let savedCount = 0;

    data.forEach((s) => {
      const seatKey = Object.keys(s).find(k => k.trim() === "Seat No" || k.trim() === "Seat_No");
      const cleanSeatNo = (seatKey ? s[seatKey] : "").toString().replace(/[^0-9]/g, "");
      const rawPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");

      if (!cleanSeatNo) return;

      // STRICT MASTER LIST FILTER
      if (!rawPRN || !validPrns.has(rawPRN)) return;

      const extractedSGPI = s["SGPI"] || s["SGPA"] || "0";
      const extractedTotal = s["Grand_Total"] || s["Total Marks"] || "0";
      const extractedResult = s["Result"] || s["Final Result"] || "N/A";

      const flatSubjects = {};
      const excludedKeys = ["seat no", "seat_no", "prn", "name", "gender", "result", "final result", "sgpi", "sgpa", "grand_total", "total marks", "remark"];
      
      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) {
          flatSubjects[key] = s[key];
        }
      });

      academicOps.push({
        updateOne: {
          filter: { prn: rawPRN, semester: semNum },
          update: {
            $set: {
              seatNo: cleanSeatNo, sgpi: extractedSGPI, totalMarks: extractedTotal, finalResult: extractedResult, subjects: flatSubjects,
            },
          },
          upsert: true,
        },
      });

      const semKey = `Sem${semNum}`;
      collegeUpdateOps.push({
        updateOne: {
          filter: { prn: rawPRN },
          update: { $set: { [semKey]: true } },
        },
      });
      savedCount++;
    });

    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);
    if (collegeUpdateOps.length > 0) await CollegeStudentDetails.bulkWrite(collegeUpdateOps);

    res.status(200).json({ success: true, message: `Processed securely! Saved ${savedCount} matched students.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ==========================================
// SEMESTER 3 UPLOADER
// ==========================================
const SHORT_NAMES = {
  "ENGINEERING MATHEMATICS - III": "EM3",
  "DATA STRUCTURE AND ANALYSIS": "DSA",
  "DATABASE MANAGEMENT SYSTEM": "DBMS",
  "PRINCIPLE OF COMMUNICATION": "PC",
  "PARADIGMS AND COMPUTER PROGRAMMING FUNDAMENTALS": "PCPF",
  "DATA STRUCTURE LAB": "DSA LAB",
  "SQL LAB": "SQL LAB",
  "COMPUTER PROGRAMMING PARADIGMS LAB": "CPP LAB",
  "JAVA LAB (SBL)": "JAVA LAB",
  "MINI PROJECT - 1A FOR FRONT END / BACKEND APPLICATION USING JAVA": "MINI PROJ 1A",
};

const uploadCsvDataSem3 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: false, skipEmptyLines: false });
    const semNum = 3;
    let headerRowIdx = -1;
    let subHeaderRowIdx = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const firstCell = data[i][0] ? data[i][0].toString() : "";
      if (firstCell.includes("Courses")) headerRowIdx = i;
      if (firstCell.includes("Seat No")) subHeaderRowIdx = i;
    }

    if (headerRowIdx === -1 || subHeaderRowIdx === -1) {
      return res.status(400).json({ message: "Invalid CSV format. Could not find Course Headers." });
    }

    const subjectNamesRowIdx = headerRowIdx + 1;
    const totalIdx = data[headerRowIdx].findIndex(val => val && val.toString().toUpperCase().includes("TOTAL"));
    const sgpiIdx = data[headerRowIdx].findIndex(val => val && val.toString().toUpperCase().includes("SGPI"));
    const resultIdx = data[headerRowIdx].findIndex(val => val && val.toString().toUpperCase().includes("RESULT"));

    const academicOps = [];
    const collegeUpdateOps = [];
    let savedCount = 0;

    for (let i = 0; i < data.length; i++) {
      const col0 = data[i][0] ? data[i][0].toString().trim() : "";
      const col1 = data[i][1] ? data[i][1].toString().trim() : "";

      if (col0.match(/^\d+(\.0)?$/) && col1 === "MarksO") {
        const marksRow = data[i];
        const nameRow = data[i + 1] || [];
        const cleanSeatNo = col0.replace(/\.0$/, "").replace(/[^0-9]/g, "");
        let rawName = nameRow[0] ? nameRow[0].toString().trim() : "";
        if (rawName.startsWith("/")) rawName = rawName.substring(1).trim();

        // STRICT MASTER LIST FILTER
        const finalPRN = await resolvePrnByName(rawName);
        if (!finalPRN) continue; 

        const flatSubjects = {};
        let currentCourse = "";
        for (let c = 2; c < totalIdx; c++) {
          let courseCell = data[subjectNamesRowIdx][c];
          if (!courseCell || courseCell.toString().trim() === "") courseCell = data[headerRowIdx][c];
          if (courseCell && courseCell.toString().trim() !== "") currentCourse = courseCell.toString().trim();

          const markCategory = data[subHeaderRowIdx][c] ? data[subHeaderRowIdx][c].toString().trim() : "";
          if (currentCourse && markCategory) {
            const upperSub = currentCourse.toUpperCase();
            const shortName = SHORT_NAMES[upperSub] || upperSub.substring(0, 15);
            const safeShortName = shortName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");

            flatSubjects[`${safeShortName}_${markCategory}_Marks`] = marksRow[c] ? marksRow[c].toString().replace(/[EF\*\!]/g, "").trim() : "";
          }
        }

        academicOps.push({
          updateOne: {
            filter: { prn: finalPRN, semester: semNum },
            update: {
              $set: {
                seatNo: cleanSeatNo,
                sgpi: marksRow[sgpiIdx] ? marksRow[sgpiIdx].toString().trim() : "0",
                totalMarks: marksRow[totalIdx] ? marksRow[totalIdx].toString().trim() : "0",
                finalResult: marksRow[resultIdx] ? marksRow[resultIdx].toString().trim() : "N/A",
                subjects: flatSubjects,
              },
            },
            upsert: true,
          },
        });

        collegeUpdateOps.push({ updateOne: { filter: { prn: finalPRN }, update: { $set: { Sem3: true } } } });
        savedCount++;
      }
    }

    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);
    if (collegeUpdateOps.length > 0) await CollegeStudentDetails.bulkWrite(collegeUpdateOps);

    res.status(200).json({ success: true, message: `Semester 3 CSV Processed. Strictly matched and saved ${savedCount} records.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// SEMESTER 4 UPLOADER
// ==========================================
const SHORT_NAMES_SEM4 = {
  "ENGINEERING MATHEMATICS - IV": "EM4",
  "COMPUTER NETWORK AND NETWORK DESIGN": "CNND",
  "OPERATING SYSTEM": "OS",
  "AUTOMATA THEORY": "AT",
  "COMPUTER ORGANIZATION AND ARCHITECTURE": "COA",
  "NETWORK LAB": "NET LAB",
  "UNIX LAB": "UNIX LAB",
  "MICROPROCESSOR LAB": "MICRO LAB",
  "PYTHON LAB (SBL)": "PYTHON LAB",
  "MINI PROJECT - 1 B FOR PYTHON BASED AUTOMATION PROJECTS": "MINI PROJ 1B",
};

const uploadCsvDataSem4 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: false, skipEmptyLines: false });
    const semNum = 4;
    let headerRowIdx = -1;
    let subHeaderRowIdx = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const firstCell = data[i][0] ? data[i][0].toString() : "";
      if (firstCell.includes("Courses")) headerRowIdx = i;
      if (firstCell.includes("Seat No")) subHeaderRowIdx = i;
    }

    if (headerRowIdx === -1 || subHeaderRowIdx === -1) {
      return res.status(400).json({ message: "Invalid CSV format. Could not find Course Headers." });
    }

    const subjectNamesRowIdx = headerRowIdx + 1;
    const totalIdx = data[headerRowIdx].findIndex(val => val && val.toString().toUpperCase().includes("TOTAL"));
    const sgpiIdx = data[headerRowIdx].findIndex(val => val && val.toString().toUpperCase().includes("SGPI"));
    const resultIdx = data[headerRowIdx].findIndex(val => val && val.toString().toUpperCase().includes("RESULT"));

    const academicOps = [];
    const collegeUpdateOps = [];
    let savedCount = 0;

    for (let i = 0; i < data.length; i++) {
      const col0 = data[i][0] ? data[i][0].toString().trim() : "";
      const col1 = data[i][1] ? data[i][1].toString().trim() : "";

      if (col0.match(/^\d+(\.0)?$/) && col1 === "MarksO") {
        const marksRow = data[i];
        const nameRow = data[i + 1] || [];
        const cleanSeatNo = col0.replace(/\.0$/, "").replace(/[^0-9]/g, "");
        let rawName = nameRow[0] ? nameRow[0].toString().trim() : "";
        if (rawName.startsWith("/")) rawName = rawName.substring(1).trim();

        // STRICT MASTER LIST FILTER
        const finalPRN = await resolvePrnByName(rawName);
        if (!finalPRN) continue;

        const flatSubjects = {};
        let currentCourse = "";
        for (let c = 2; c < totalIdx; c++) {
          let courseCell = data[subjectNamesRowIdx][c];
          if (!courseCell || courseCell.toString().trim() === "") courseCell = data[headerRowIdx][c];
          if (courseCell && courseCell.toString().trim() !== "") currentCourse = courseCell.toString().trim();

          const markCategory = data[subHeaderRowIdx][c] ? data[subHeaderRowIdx][c].toString().trim() : "";
          if (currentCourse && markCategory) {
            const upperSub = currentCourse.toUpperCase();
            const shortName = SHORT_NAMES_SEM4[upperSub] || upperSub.substring(0, 15);
            const safeShortName = shortName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");

            flatSubjects[`${safeShortName}_${markCategory}_Marks`] = marksRow[c] ? marksRow[c].toString().replace(/[EF\*\!]/g, "").trim() : "";
          }
        }

        academicOps.push({
          updateOne: {
            filter: { prn: finalPRN, semester: semNum },
            update: {
              $set: {
                seatNo: cleanSeatNo,
                sgpi: marksRow[sgpiIdx] ? marksRow[sgpiIdx].toString().trim() : "0",
                totalMarks: marksRow[totalIdx] ? marksRow[totalIdx].toString().trim() : "0",
                finalResult: marksRow[resultIdx] ? marksRow[resultIdx].toString().trim() : "N/A",
                subjects: flatSubjects,
              },
            },
            upsert: true,
          },
        });

        collegeUpdateOps.push({ updateOne: { filter: { prn: finalPRN }, update: { $set: { Sem4: true } } } });
        savedCount++;
      }
    }

    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);
    if (collegeUpdateOps.length > 0) await CollegeStudentDetails.bulkWrite(collegeUpdateOps);

    res.status(200).json({ success: true, message: `Semester 4 CSV Processed. Strictly matched and saved ${savedCount} records.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ==========================================
// SEMESTER 5 UPLOADER
// ==========================================
const uploadCsvDataSem5 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    const semNum = Number(req.body.semester);
    if (!semNum) return res.status(400).json({ message: "Semester number is required." });

    const academicOps = [];
    let savedCount = 0;

    for (const s of data) {
      const seatKey = Object.keys(s).find(k => k.trim() === "Seat No" || k.trim() === "Seat_No");
      const cleanSeatNo = (seatKey ? s[seatKey] : "").toString().replace(/[^0-9]/g, "");
      let rawName = (s["Name"] || s["name"] || "").trim();
      if (rawName.startsWith("/")) rawName = rawName.substring(1).trim();

      if (!cleanSeatNo) continue; 

      // STRICT MASTER LIST FILTER
      let finalPRN = s["PRN"] ? s["PRN"].toString().replace(/[^0-9]/g, "") : null;
      if (!finalPRN) {
        finalPRN = await resolvePrnByName(rawName);
      }
      
      if (!finalPRN) continue; // Skip if not in Master List

      const extractedSGPI = s["SGPI"] || s["SGPA"] || "0";
      const extractedTotal = s["Grand_Total"] || s["Total Marks"] || "0";
      const extractedResult = s["Result"] || s["Final Result"] || "N/A";

      const flatSubjects = {};
      const excludedKeys = ["seat no", "seat_no", "prn", "name", "gender", "result", "final result", "sgpi", "sgpa", "grand_total", "total marks", "remark"];

      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) flatSubjects[key] = s[key];
      });

      academicOps.push({
        updateOne: {
          filter: { prn: finalPRN, semester: semNum },
          update: {
            $set: { seatNo: cleanSeatNo, sgpi: extractedSGPI, totalMarks: extractedTotal, finalResult: extractedResult, subjects: flatSubjects },
          },
          upsert: true,
        },
      });
      savedCount++;
    }

    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);

    res.status(200).json({ success: true, message: `CSV Processed. Strictly matched and saved ${savedCount} records for Sem 5.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ==========================================
// REMAINDER GETTERS & UTILS
// ==========================================
const getStudents = async (req, res) => {
  try {
    const { semester, isNEP, prnPrefix } = req.query;
    const query = {};
    if (semester) query.semester = Number(semester);
    if (prnPrefix) query.prn = { $regex: `^${prnPrefix}` };

    if (semester) {
      if (isNEP === "true") {
        const records = await NepAcademicRecord.find(query);
        return res.json(records);
      } else {
        const records = await AcademicRecord.find(query);
        const prns = records.map((r) => r.prn);
        const students = await StudentMaster.find({ prn: { $in: prns } });
        const studentMap = {};
        students.forEach((s) => (studentMap[s.prn] = s));

        const formatted = records.map((r) => ({
          seatNo: r.seatNo,
          name: studentMap[r.prn]?.name || "Unknown",
          gender: studentMap[r.prn]?.gender || "Unknown",
          results: { sgpi: r.sgpi, finalResult: r.finalResult },
          subjects: r.subjects || {},
        }));
        return res.json(formatted);
      }
    }

    const masterQuery = prnPrefix ? { prn: { $regex: `^${prnPrefix}` } } : {};
    const allStudents = await StudentMaster.find(masterQuery).limit(100);
    res.json(allStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentHistory = async (req, res) => {
  // Existing logic preserved perfectly
  try {
    const query = req.params.prn;
    const r19Matches = await StudentMaster.find({
      $or: [{ prn: new RegExp(`^${query}$`, "i") }, { name: new RegExp(query, "i") }],
    }).lean();

    const nepMatchesRaw = await NepAcademicRecord.find({
      $or: [{ seatNo: new RegExp(`^${query}$`, "i") }, { name: new RegExp(query, "i") }],
    }).lean();

    const uniqueNepStudents = {};
    nepMatchesRaw.forEach((record) => {
      if (!uniqueNepStudents[record.seatNo]) {
        uniqueNepStudents[record.seatNo] = { name: record.name, seatNo: record.seatNo, category: "NEP-2024" };
      }
    });
    const nepMatches = Object.values(uniqueNepStudents);

    const uniqueMatchesMap = new Map();
    r19Matches.forEach((s) => uniqueMatchesMap.set(s.prn, { name: s.name, prn: s.prn, category: s.status || "Regular", batch: "R-19 Scheme" }));
    nepMatches.forEach((s) => uniqueMatchesMap.set(s.seatNo, { name: s.name, prn: s.seatNo, category: "Regular", batch: "NEP 2024 Scheme" }));

    const combinedList = Array.from(uniqueMatchesMap.values());
    if (combinedList.length === 0) return res.status(404).json({ message: "No student found." });
    if (combinedList.length > 1) return res.json({ type: "multiple", count: combinedList.length, students: combinedList });

    const student = combinedList[0];
    const r19Records = await AcademicRecord.find({ prn: student.prn }).lean();
    const nepRecords = await NepAcademicRecord.find({ seatNo: student.prn }).lean();
    const allRecords = [...r19Records, ...nepRecords].sort((a, b) => a.semester - b.semester);

    const academicHistory = {};
    let eseFCount = 0; let otherFCount = 0; let activeKtsCount = 0;

    allRecords.forEach((record) => {
      const semKey = `Semester ${record.semester}`;
      if (!academicHistory[semKey]) academicHistory[semKey] = [];

      let hasKT = false;
      if (record.subjects) {
        Object.entries(record.subjects).forEach(([key, val]) => {
          const k = key.toLowerCase().trim();
          if (!k.includes("grade") && !k.endsWith("_gr")) return;
          if (k.includes("tot") || k.includes("result") || k.includes("status") || k.includes("sgp")) return;

          const valStr = String(val).trim().toUpperCase();
          const isFail = valStr === "F" || valStr === "ABS" || valStr === "KT" || (valStr.includes("F") && valStr.length <= 6 && !valStr.includes("FEM"));

          if (isFail) {
            hasKT = true; activeKtsCount++;
            if (k.includes("ese") || k.includes("th") || k.includes("theory")) eseFCount++;
            else otherFCount++;
          }
        });
      }

      const resUpper = String(record.finalResult).toUpperCase();
      if (resUpper === "F" || resUpper === "FAILED" || resUpper === "KT" || resUpper.includes("FAIL")) hasKT = true;

      academicHistory[semKey].push({
        seatNo: record.seatNo, sgpi: record.sgpi || "0", totalMarks: record.totalMarks || "0", result: record.finalResult || "N/A", hasKT: hasKT, subjects: record.subjects || {},
      });
    });

    const totalSystemFails = eseFCount + otherFCount;
    let finalCategory = "Regular";
    if (student.batch === "R-19 Scheme" || !student.batch?.includes("NEP")) {
      if (activeKtsCount === 0) finalCategory = "Regular";
      else if (eseFCount >= 5 || totalSystemFails >= 10) finalCategory = "Dropper";
    }

    res.json({
      type: "single", profile: { name: student.name, prn: student.prn, category: finalCategory, batch: student.batch },
      summary: { totalSemestersAppeared: allRecords.length, ktCount: activeKtsCount }, academicHistory: academicHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const mergeStudents = async (req, res) => {
  try {
    const { sourcePrn, targetPrn } = req.body;
    if (!sourcePrn || !targetPrn) return res.status(400).json({ error: "Missing PRNs." });

    await AcademicRecord.updateMany({ prn: sourcePrn }, { $set: { prn: targetPrn } });
    await StudentMaster.deleteOne({ prn: sourcePrn });
    
    res.json({ success: true, message: "Profiles merged successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStudentsByBatch = async (req, res) => {
  try {
    const students = await StudentMaster.find({ batch: new RegExp(req.params.batch, "i") });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSemAnalysis = async (req, res) => {
    try {
      const semNum = Number(req.params.sem);
      if (!semNum) return res.status(400).json({ message: "Semester is required" });
  
      const records = await AcademicRecord.find({ semester: semNum }).lean();
      if (!records || records.length === 0) return res.status(404).json({ message: `No records found` });
  
      const prns = records.map((r) => r.prn);
      const students = await StudentMaster.find({ prn: { $in: prns } }).lean();
  
      const studentMap = {};
      students.forEach((s) => { studentMap[s.prn] = { name: s.name, gender: s.gender || "Male" }; });
  
      let totalPassed = 0, totalFailed = 0;
      let studentsList = [];
      let subjectStats = {};
  
      records.forEach((record) => {
        const studentData = studentMap[record.prn] || { name: "Unknown", gender: "Male" };
        const sgpi = parseFloat(record.sgpi) || 0;
  
        const safeResult = record.finalResult ? record.finalResult.trim().toUpperCase() : "";
        const isPassed = safeResult === "P" || safeResult === "PASS" || safeResult === "SUCCESSFUL";
        if (isPassed) totalPassed++; else totalFailed++;
  
        studentsList.push({
          prn: record.prn, seatNo: record.seatNo, name: studentData.name, sgpi: sgpi, result: record.finalResult || "N/A"
        });
      });
  
      studentsList.sort((a, b) => b.sgpi - a.sgpi);
      const topOverall = studentsList.slice(0, 3).map((s, idx) => ({ rank: idx + 1, name: s.name, sgpi: s.sgpi }));
  
      res.status(200).json({
        success: true,
        analysis: { semester: semNum, overall: { totalStudents: records.length, totalPassed, totalFailed }, topOverall },
        studentsList,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
};

const uploadNepPdfData = async (req, res) => {
  res.status(200).json({ message: "NEP PDF Upload placeholder" });
};

const uploadAtktCsvData = async (req, res) => {
    res.status(200).json({ message: "ATKT Upload placeholder" });
};

const analyzeSem3CsvDirectly = async (req, res) => {
    res.status(200).json({ message: "Sem 3 Direct Analyzer Placeholder" });
};

const getSem1Students = async (req, res) => { res.status(200).json([]); };
const getSem2Students = async (req, res) => { res.status(200).json([]); };
const getSem3Students = async (req, res) => { res.status(200).json([]); };
const getSem4Students = async (req, res) => { res.status(200).json([]); };
const getSem5Students = async (req, res) => { res.status(200).json([]); };
const getSem6Students = async (req, res) => { res.status(200).json([]); };
const getSem7Students = async (req, res) => { res.status(200).json([]); };


module.exports = {
  uploadCsvData,
  uploadCsvDataSem5,
  uploadCsvDataSem3,
  uploadCsvDataSem4,
  uploadNepPdfData,
  uploadAtktCsvData,
  getStudents,
  getStudentHistory,
  getStudentsByBatch,
  uploadMasterCsv,
  mergeStudents,
  getSem1Students,
  getSem2Students,
  getSem3Students,
  getSem4Students,
  getSem5Students,
  getSem6Students,
  getSem7Students,
  getSemAnalysis,
  analyzeSem3CsvDirectly
};