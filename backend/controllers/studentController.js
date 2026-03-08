const Papa = require("papaparse");
const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");

// Import the isolated processors
const { extractSem1 } = require("../utils/isolated/sem1Processor");
const { extractSem2 } = require("../utils/isolated/sem2Processor");

/**
 * IMPROVED FUZZY MATCHING LOGIC
 * Requirement: If at least 2 words match, consider it the same student.
 * Helps link Semester 3-6 records (which lack PRNs) to Master records.
 */
const getWords = (str) => {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Keep alphanumeric
    .split(/\s+/)
    .filter((word) => word.length > 2); // Ignore short initials to prevent false positives
};

const isFuzzyMatch = (name1, name2) => {
  const words1 = getWords(name1);
  const words2 = getWords(name2);
  
  if (words1.length === 0 || words2.length === 0) return false;

  // Count common words between the two names
  const matches = words1.filter(word => words2.includes(word));
  
  // Logic: Link PRN if 2 or more words match
  return matches.length >= 2;
};

// --- 1. Upload CSV ---
const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });

    const semNum = Number(req.body.semester);
    if (!semNum) return res.status(400).json({ message: "Semester number is required." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    if (!data || data.length === 0) return res.status(400).json({ message: "CSV file is empty." });

    const existingStudents = await StudentMaster.find({}, "prn name motherName");

    const masterOps = [];
    const academicOps = [];

    data.forEach((s) => {
      const seatKey = Object.keys(s).find((k) => k.trim() === "Seat No" || k.trim() === "Seat_No");
      const prnKey = Object.keys(s).find((k) => k.trim() === "PRN");

      const cleanSeatNo = (seatKey ? s[seatKey] : "").toString().replace(/[^0-9]/g, "");
      let rawPRN = (prnKey ? s[prnKey] : "").toString().replace(/[^0-9]/g, "");
      const csvName = s["Name"] || "Unknown";

      if (!cleanSeatNo) return;

      // FUZZY MATCHING FOR MISSING PRN (2+ words match)
      if (!rawPRN && csvName !== "Unknown") {
        const match = existingStudents.find((student) => {
          return isFuzzyMatch(csvName, student.name) || 
                 isFuzzyMatch(csvName, `${student.name || ""} ${student.motherName || ""}`);
        });
        if (match) rawPRN = match.prn;
      }

      const finalPRN = rawPRN || `TEMP_${cleanSeatNo}`;
      const batchYear = rawPRN ? rawPRN.substring(0, 4) : "Unknown";

      const finalResultStr = s["Result"] || s["Final Result"] || "N/A";
      const isFail = finalResultStr.toLowerCase().includes("fail") || finalResultStr.toLowerCase().includes("kt");

      const flatSubjects = {};
      const excludedKeys = ["seat no", "seat_no", "prn", "name", "mother name", "mother_name", "gender", "status", "result", "final result", "sgpi", "sgpa", "total marks"];
      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) {
          flatSubjects[key] = s[key];
        }
      });

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: {
            $set: { status: s["Status"] || "Regular" },
            $setOnInsert: { name: csvName, motherName: s["Mother Name"] || "", batch: batchYear, gender: s["Gender"] || "" },
          },
          upsert: true,
        },
      });

      academicOps.push({
        updateOne: {
          filter: { prn: finalPRN, semester: semNum },
          update: {
            $set: { seatNo: cleanSeatNo, sgpi: s["SGPI"] || s["SGPA"] || "0", totalMarks: s["Total Marks"] || "0", finalResult: finalResultStr, isKT: isFail, subjects: flatSubjects },
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    let result = { upsertedCount: 0, modifiedCount: 0 };
    if (academicOps.length > 0) result = await AcademicRecord.bulkWrite(academicOps);

    res.status(200).json({
      success: true,
      message: `Processed ${data.length} records. Fuzzy matching (2+ words) applied.`,
      academicRecordsUpdated: result.upsertedCount + result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 2. Upload PDF ---
const uploadPdfData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a PDF file." });

    const semNum = Number(req.body.semester);
    if (!semNum || (semNum !== 1 && semNum !== 2)) return res.status(400).json({ message: "Sem 1/2 PDF supported." });

    let extractedData = [];
    if (semNum === 1) extractedData = await extractSem1(req.file.buffer);
    if (semNum === 2) extractedData = await extractSem2(req.file.buffer);

    const existingStudents = await StudentMaster.find({}, "prn name motherName");

    const masterOps = [];
    const academicOps = [];

    extractedData.forEach((s) => {
      const { seatNo, name, motherName, prn } = s.studentInfo;
      let rawPRN = prn ? prn.replace(/[^0-9]/g, "") : "";

      if (!seatNo) return;

      // FUZZY MATCHING (2+ words match)
      if (!rawPRN && name) {
        const match = existingStudents.find((st) => {
          return isFuzzyMatch(name, st.name) || 
                 isFuzzyMatch(name, `${st.name || ""} ${st.motherName || ""}`);
        });
        if (match) rawPRN = match.prn;
      }

      const finalPRN = rawPRN || `TEMP_${seatNo}`;
      const summaryData = s.summary || s.academicSummary || {};
      const finalResultStr = summaryData.resultStatus || summaryData.status || "N/A";
      const isFail = finalResultStr.toLowerCase().includes("fail") || finalResultStr.toLowerCase().includes("kt");

      let flatSubjects = {};
      if (s.subjects) {
        Object.entries(s.subjects).forEach(([key, val]) => {
          if (typeof val === 'object' && val !== null && val.code) {
             const totalMark = Array.isArray(val.marks) && val.marks.length > 0 ? val.marks[val.marks.length - 1] : "0";
             flatSubjects[`${val.code}_Marks`] = String(totalMark);
             flatSubjects[`${val.code}_GR`] = String(val.gr || val.grade || "N/A");
          } else {
             flatSubjects[key] = String(val);
          }
        });
      }

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: {
            $set: { batch: finalPRN.startsWith("TEMP") ? "Unknown" : finalPRN.substring(0, 4) },
            $setOnInsert: { name: name, motherName: motherName },
          },
          upsert: true,
        },
      });

      academicOps.push({
        updateOne: {
          filter: { prn: finalPRN, semester: semNum },
          update: {
            $set: { seatNo: seatNo, sgpi: summaryData.sgpa || "0", totalMarks: summaryData.totalCredits || "0", finalResult: finalResultStr, isKT: isFail, subjects: flatSubjects },
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);

    res.status(200).json({ success: true, message: `PDF Processed for Semester ${semNum} with Fuzzy matching.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 3. Get Student History ---
const getStudentHistory = async (req, res) => {
  try {
    const { prn } = req.params;
    const isNumeric = /^\d+$/.test(prn);
    
    let students = [];
    if (isNumeric) {
        students = await StudentMaster.find({ prn });
    } else {
        const regex = new RegExp(prn, 'i');
        students = await StudentMaster.find({ name: { $regex: regex } });
    }

    if (students.length === 0) return res.status(404).json({ message: "Student not found" });

    if (students.length > 1) {
       return res.status(200).json({
          type: "multiple",
          count: students.length,
          students: students.map(s => ({ name: s.name, prn: s.prn, category: s.status || "Regular", batch: s.batch }))
       });
    }

    const student = students[0];
    const records = await AcademicRecord.find({ prn: student.prn }).sort({ semester: 1 });

    const formattedData = {
      profile: { name: student.name, prn: student.prn, category: student.status || "Regular" },
      summary: { totalSemestersAppeared: records.length, ktCount: 0 },
      academicHistory: {}
    };

    let exactKtCount = 0;
    records.forEach(record => {
      const subs = record.subjects || {};
      let theoryFailCount = 0;
      let totalFailCount = 0;

      Object.entries(subs).forEach(([key, value]) => {
        const k = key.trim().toLowerCase();
        const val = String(value).trim().toUpperCase();

        if (k.includes('tot') || k.includes('result') || k.includes('status')) return; 

        if (val === 'F') {
          totalFailCount++;
          const isComponent = k.includes('_pr') || k.includes('_or') || k.includes('_tw');
          if (!isComponent) theoryFailCount++;
        }
      });

      let calculatedStatus = theoryFailCount >= 5 || totalFailCount >= 10 ? "Dropper" : totalFailCount > 0 ? "KT" : "Pass";

      formattedData.academicHistory[`Semester ${record.semester}`] = [{
        seatNo: record.seatNo,
        sgpi: record.sgpi,
        totalMarks: record.totalMarks,
        result: calculatedStatus,
        hasKT: totalFailCount > 0,
        subjects: subs
      }];
      exactKtCount += totalFailCount;
    });
  
    formattedData.summary.ktCount = exactKtCount;
    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- 4. Merge Students ---
const mergeStudents = async (req, res) => {
  try {
    const { sourcePrn, targetPrn } = req.body;

    if (!sourcePrn || !targetPrn) {
      return res.status(400).json({ message: "Both source (TEMP) and target (REAL) PRNs are required." });
    }

    // Move all academic records to the real PRN
    await AcademicRecord.updateMany(
      { prn: sourcePrn },
      { $set: { prn: targetPrn } }
    );

    // Delete the temporary student profile
    await StudentMaster.deleteOne({ prn: sourcePrn });

    res.status(200).json({ 
      success: true, 
      message: `Successfully merged data from ${sourcePrn} into ${targetPrn}` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 5. Helpers ---
const getStudents = async (req, res) => {
  try {
    const students = await StudentMaster.find({}).limit(100);
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentsByBatch = async (req, res) => {
  try {
    const { batch } = req.params;
    const students = await StudentMaster.find({ batch });
    res.status(200).json({ batch, count: students.length, students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadMasterData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a Master CSV file." });
    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    const ops = data.map((row) => {
      const prnKey = Object.keys(row).find(k => k.trim().toUpperCase() === "PRN");
      const prn = prnKey ? row[prnKey].toString().replace(/[^0-9]/g, "") : null;
      if (!prn) return null; 

      return {
        updateOne: {
          filter: { prn },
          update: {
            $set: { 
              name: row["Name"] || "", 
              motherName: row["Mother Name"] || row["Mother_Name"] || "", 
              batch: row["Batch"] || prn.substring(0, 4), 
              gender: row["Gender"] || "", 
              status: row["Status"] || "Regular" 
            }
          },
          upsert: true,
        },
      };
    }).filter(Boolean);

    if (ops.length > 0) await StudentMaster.bulkWrite(ops);
    res.status(200).json({ success: true, message: `Processed ${ops.length} master profiles.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
    uploadCsvData, 
    uploadPdfData, 
    getStudents, 
    getStudentHistory, 
    getStudentsByBatch, 
    uploadMasterData,
    mergeStudents 
};