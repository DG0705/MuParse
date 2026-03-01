const Papa = require("papaparse");
const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");

// If you use these later, uncomment:
// const { extractSem1Data, extractSem2Data } = require("../utils/pdfExtractors");

// --- 1. Upload CSV & Automatically Create Profiles ---
const uploadCsvData = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Upload a CSV file." });

    const semNum = Number(req.body.semester);
    if (!semNum)
      return res.status(400).json({ message: "Semester number is required." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "CSV file is empty." });
    }

    const existingStudents = await StudentMaster.find(
      {},
      "prn name motherName",
    );
    const normalize = (str) =>
      (str || "").replace(/[^a-zA-Z]/g, "").toLowerCase();

    const masterOps = [];
    const academicOps = [];

    data.forEach((s) => {
      const seatKey = Object.keys(s).find(
        (k) => k.trim() === "Seat No" || k.trim() === "Seat_No",
      );
      const prnKey = Object.keys(s).find((k) => k.trim() === "PRN");

      const cleanSeatNo = (seatKey ? s[seatKey] : "")
        .toString()
        .replace(/[^0-9]/g, "");

      let rawPRN = (prnKey ? s[prnKey] : "").toString().replace(/[^0-9]/g, "");

      const csvName = s["Name"] || "Unknown";

      if (!cleanSeatNo) return;

      if (!rawPRN && csvName !== "Unknown") {
        const normCsvName = normalize(csvName);
        const match = existingStudents.find((student) => {
          const normMasterName = normalize(student.name);
          const normMotherName = normalize(student.motherName);
          return (
            (normMotherName &&
              normCsvName === normMasterName + normMotherName) ||
            normCsvName === normMasterName
          );
        });
        if (match) rawPRN = match.prn;
      }

      const finalPRN = rawPRN || `TEMP_${cleanSeatNo}`;
      const batchYear = rawPRN ? rawPRN.substring(0, 4) : "Unknown";

      const finalResultStr = s["Result"] || s["Final Result"] || "N/A";
      const isFail =
        finalResultStr.toLowerCase().includes("fail") ||
        finalResultStr.toLowerCase().includes("kt") ||
        finalResultStr.toLowerCase().includes("unsuccessful");

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: {
            $set: { status: s["Status"] || "Regular" },
            $setOnInsert: {
              name: csvName,
              motherName: s["Mother Name"] || "",
              batch: batchYear,
              gender: s["Gender"] || "",
            },
          },
          upsert: true,
        },
      });

      academicOps.push({
        updateOne: {
          filter: { prn: finalPRN, semester: semNum },
          update: {
            $set: {
              seatNo: cleanSeatNo,
              sgpi: s["SGPI"] || s["SGPA"] || "0",
              totalMarks: s["Total Marks"] || "0",
              finalResult: finalResultStr,
              isKT: isFail,
              subjects: s,
            },
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);

    let result = { upsertedCount: 0, modifiedCount: 0 };
    if (academicOps.length > 0) {
      result = await AcademicRecord.bulkWrite(academicOps);
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed ${data.length} records for Semester ${semNum}.`,
      studentMastersUpdated: masterOps.length,
      academicRecordsUpdated: result.upsertedCount + result.modifiedCount,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- 2. Upload PDF & Automatically Create Profiles ---
const uploadPdfData = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Upload a PDF file." });

    const semNum = Number(req.body.semester);
    if (!semNum || (semNum !== 1 && semNum !== 2)) {
      return res.status(400).json({
        message: "Currently only Sem 1 and 2 PDFs are supported directly.",
      });
    }

    let extractedData = [];

    if (semNum === 1) extractedData = await extractSem1Data(req.file.buffer);
    if (semNum === 2) extractedData = await extractSem2Data(req.file.buffer);

    if (!extractedData || extractedData.length === 0) {
      return res
        .status(400)
        .json({ message: "Failed to extract data from PDF." });
    }

    const existingStudents = await StudentMaster.find(
      {},
      "prn name motherName",
    );
    const normalize = (str) =>
      (str || "").replace(/[^a-zA-Z]/g, "").toLowerCase();

    const masterOps = [];
    const academicOps = [];

    extractedData.forEach((s) => {
      const { seatNo, name, motherName, prn } = s.studentInfo;
      let rawPRN = prn ? prn.replace(/[^0-9]/g, "") : "";

      if (!seatNo) return;

      if (!rawPRN && name) {
        const normName = normalize(name);
        const match = existingStudents.find((st) => {
          const normMName = normalize(st.name);
          const normMoName = normalize(st.motherName);
          if (normMoName && normName === normMName + normMoName) return true;
          if (normName === normMName) return true;
          return false;
        });
        if (match) rawPRN = match.prn;
      }

      const finalPRN = rawPRN || `TEMP_${seatNo}`;
      const batchYear = rawPRN ? rawPRN.substring(0, 4) : "Unknown";

      const finalResultStr = s.summary.resultStatus || "N/A";
      const isFail =
        finalResultStr.toLowerCase().includes("fail") ||
        finalResultStr.toLowerCase().includes("unsuccessful");

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: {
            $set: { batch: batchYear },
            $setOnInsert: {
              name: name,
              motherName: motherName,
            },
          },
          upsert: true,
        },
      });

      academicOps.push({
        updateOne: {
          filter: { prn: finalPRN, semester: semNum },
          update: {
            $set: {
              seatNo: seatNo,
              sgpi: s.summary.sgpa || "0",
              totalMarks: s.summary.totalCredits || "0",
              finalResult: finalResultStr,
              isKT: isFail,
              subjects: s.subjects,
            },
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);

    let result = { upsertedCount: 0, modifiedCount: 0 };
    if (academicOps.length > 0) {
      result = await AcademicRecord.bulkWrite(academicOps);
    }

    res.status(200).json({
      success: true,
      message: `Successfully parsed and saved ${extractedData.length} records from PDF for Semester ${semNum}.`,
    });
  } catch (error) {
    console.error("PDF Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- 3. Get Students ---
const getStudents = async (req, res) => {
  try {
    const { semester } = req.query;

    if (semester) {
      const semNum = Number(semester);
      const records = await AcademicRecord.find({ semester: semNum });
      return res.status(200).json(records);
    }

    const students = await StudentMaster.find({}).limit(100);
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- 4. Get Student History ---
const getStudentHistory = async (req, res) => {
  try {
    const { prn } = req.params;

    const student = await StudentMaster.findOne({ prn });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const records = await AcademicRecord.find({ prn }).sort({ semester: 1 });

    res.status(200).json({ student, records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- 5. Get Students By Batch ---
const getStudentsByBatch = async (req, res) => {
  try {
    const { batch } = req.params;

    const students = await StudentMaster.find({ batch });

    res.status(200).json({
      batch: batch,
      count: students.length,
      students: students,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadCsvData,
  uploadPdfData,
  getStudents,
  getStudentHistory,
  getStudentsByBatch,
};
