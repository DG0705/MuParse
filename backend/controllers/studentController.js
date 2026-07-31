const Papa = require("papaparse");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");
const NepAcademicRecord = require("../models/NepAcademicRecord");

const uploadNepPdfData = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Upload an NEP file." });

    const isCSV =
      req.file.originalname.toLowerCase().endsWith(".csv") ||
      req.file.mimetype === "text/csv" ||
      req.file.mimetype === "application/vnd.ms-excel";

    if (isCSV) {
      const csvString = req.file.buffer.toString();
      const { data } = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
      });

      const nepAcademicOps = [];

      data.forEach((s) => {
        const seatNo = s["seat_no"] || s["Seat_No"] || s["Seat No"];
        if (!seatNo) return;

        const subjects = {};
        const coreFields = [
          "seat_no",
          "seat no",
          "name",
          "gender",
          "total_marks",
          "result",
          "sgpi",
          "college_code",
          "college_name",
          "prn",
        ];
        Object.keys(s).forEach((key) => {
          if (!coreFields.includes(key.toLowerCase().trim())) {
            subjects[key] = s[key];
          }
        });

        nepAcademicOps.push({
          updateOne: {
            filter: {
              seatNo: seatNo.toString().trim(),
              semester: req.body.semester || 1,
            },
            update: {
              $set: {
                name: s["name"] || s["Name"] || "Unknown",
                gender: s["gender"] || s["Gender"] || "Unknown",
                collegeCode: s["college_code"] || "",
                collegeName: s["college_name"] || "",
                sgpi: s["sgpi"] || s["SGPI"] || "0",
                totalMarks: s["total_marks"] || s["Total Marks"] || "0",
                finalResult: s["result"] || s["Result"] || "N/A",
                subjects: subjects,
              },
            },
            upsert: true,
          },
        });
      });

      if (nepAcademicOps.length > 0)
        await NepAcademicRecord.bulkWrite(nepAcademicOps);
      return res.json({
        success: true,
        message: `NEP CSV Processed. Saved to Dedicated NEP Database.`,
        students: data,
      });
    }

    // --- FALLBACK TO PYTHON ---
    const tempDir = path.join(__dirname, "../../nep_analysis/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `upload_${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const pythonScript = path.join(
      __dirname,
      "../../nep_analysis/parser_bridge.py",
    );

    if (!fs.existsSync(pythonScript)) {
      return res
        .status(500)
        .json({ error: `Cannot find Python script at: ${pythonScript}` });
    }

    const pythonProcess = spawn("python", [pythonScript, tempFilePath]);

    let resultData = "";
    let pythonErrorText = "";

    pythonProcess.stdout.on("data", (data) => {
      resultData += data.toString();
    });
    pythonProcess.stderr.on("data", (data) => {
      pythonErrorText += data.toString();
    });

    pythonProcess.on("close", async (code) => {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (code !== 0)
          return res.status(500).json({
            error: `Python crashed: ${pythonErrorText.substring(0, 150)}...`,
          });

        let students;
        try {
          students = JSON.parse(resultData);
        } catch (jsonErr) {
          return res
            .status(500)
            .json({ error: `Python output was not valid JSON.` });
        }

        const nepAcademicOps = [];

        for (const data of students) {
          nepAcademicOps.push({
            updateOne: {
              filter: {
                seatNo: data.seat_no,
                semester: req.body.semester || 1,
              },
              update: {
                $set: {
                  name: data.name || "Unknown",
                  gender: data.gender || "Unknown",
                  collegeCode: data.college_code || "",
                  collegeName: data.college_name || "",
                  sgpi: data.sgpi,
                  totalMarks: data.total_marks,
                  finalResult: data.result,
                  subjects: data.subjects || {},
                },
              },
              upsert: true,
            },
          });
        }

        if (nepAcademicOps.length > 0)
          await NepAcademicRecord.bulkWrite(nepAcademicOps);
        res.json({
          success: true,
          message: `NEP PDF Processed & Saved to Dedicated NEP Table.`,
          students,
        });
      } catch (dbError) {
        res.status(500).json({ error: `Database error: ${dbError.message}` });
      }
    });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

const CollegeStudentDetails = require("../models/CollegeStudentDetails"); // FIX: Imported missing baseline model

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
  "MINI PROJECT - 1A FOR FRONT END / BACKEND APPLICATION USING JAVA":
    "MINI PROJ 1A",
};

const uploadCsvDataSem3 = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload a CSV file." });
    }

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, {
      header: false,
      skipEmptyLines: false,
    });

    const semNum = 3;
    const formattedData = [];
    let headerRowIdx = -1;
    let subHeaderRowIdx = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const firstCell = data[i][0] ? data[i][0].toString() : "";
      if (firstCell.includes("Courses")) headerRowIdx = i;
      if (firstCell.includes("Seat No")) subHeaderRowIdx = i;
    }

    if (headerRowIdx === -1 || subHeaderRowIdx === -1) {
      console.log(
        "❌ CRITICAL: PapaParse could not find Course Headers in the pasted CSV!",
      );
      return res.status(400).json({
        message:
          "Invalid CSV format. Could not find Course Headers ('Courses ?' line missing).",
      });
    }

    const subjectNamesRowIdx = headerRowIdx + 1;
    const totalIdx = data[headerRowIdx].findIndex(
      (val) => val && val.toString().toUpperCase().includes("TOTAL"),
    );
    const sgpiIdx = data[headerRowIdx].findIndex(
      (val) => val && val.toString().toUpperCase().includes("SGPI"),
    );
    const resultIdx = data[headerRowIdx].findIndex(
      (val) => val && val.toString().toUpperCase().includes("RESULT"),
    );

    for (let i = 0; i < data.length; i++) {
      const col0 = data[i][0] ? data[i][0].toString().trim() : "";
      const col1 = data[i][1] ? data[i][1].toString().trim() : "";

      if (col0.match(/^\d+(\.0)?$/) && col1 === "MarksO") {
        const marksRow = data[i];
        const nameRow = data[i + 1] || [];

        const cleanSeatNo = col0.replace(/\.0$/, "").replace(/[^0-9]/g, "");

        // --- CRITICAL SAFEGUARD: Force SGPI and Totals into strict safe numbers ---
        const rawSgpi = marksRow[sgpiIdx]
          ? marksRow[sgpiIdx].toString().replace(/[^0-9.]/g, "")
          : "0";
        const rawTotal = marksRow[totalIdx]
          ? marksRow[totalIdx].toString().replace(/[^0-9]/g, "")
          : "0";

        const safeSgpi = Number(rawSgpi) || 0;
        const safeTotal = Number(rawTotal) || 0;

        const studentObj = {
          "Seat No": cleanSeatNo,
          Name: nameRow[0] ? nameRow[0].toString().trim() : "",
          "Total Marks": safeTotal,
          SGPI: safeSgpi,
          Result: marksRow[resultIdx]
            ? marksRow[resultIdx].toString().trim()
            : "N/A",
        };

        let currentCourse = "";
        for (let c = 2; c < totalIdx; c++) {
          let courseCell = data[subjectNamesRowIdx][c];
          if (!courseCell || courseCell.toString().trim() === "") {
            courseCell = data[headerRowIdx][c];
          }
          if (courseCell && courseCell.toString().trim() !== "") {
            currentCourse = courseCell.toString().trim();
          }

          const markCategory = data[subHeaderRowIdx][c]
            ? data[subHeaderRowIdx][c].toString().trim()
            : "";

          if (currentCourse && markCategory) {
            const upperSub = currentCourse.toUpperCase();
            const shortName =
              SHORT_NAMES[upperSub] || upperSub.substring(0, 15);
            const safeShortName = shortName
              .replace(/[^a-zA-Z0-9]/g, "_")
              .replace(/_+/g, "_");

            const markHead = `${safeShortName}_${markCategory}_Marks`;
            const gradeHead = `${safeShortName}_${markCategory}_Grade`;

            const markValue = marksRow[c]
              ? marksRow[c]
                  .toString()
                  .replace(/[EF\*\!]/g, "")
                  .trim()
              : "";
            const gradeValue = nameRow[c] ? nameRow[c].toString().trim() : "";

            studentObj[markHead] = markValue;
            if (gradeValue) studentObj[gradeHead] = gradeValue;
          }
        }
        formattedData.push(studentObj);
      }
    }

    const baselineStudents = await CollegeStudentDetails.find(
      {},
      "prn name",
    ).lean();

    const claimedPRNs = new Set();
    const masterOps = [];
    const academicOps = [];
    const collegeUpdateOps = [];
    const verifiedSavedList = [];

    for (const s of formattedData) {
      const cleanSeatNo = s["Seat No"];
      if (!cleanSeatNo) continue;

      let rawName = (s["Name"] || "").trim();
      let extractedGender = "Male";
      if (rawName.startsWith("/")) {
        extractedGender = "Female";
        rawName = rawName.substring(1).trim();
      }

      let extractedMotherName = "Unknown";
      const nameParts = rawName.split(/\s+/);
      if (nameParts.length > 2) {
        extractedMotherName = nameParts[nameParts.length - 1];
      }

      let finalPRN = null;
      const cleanCsvNameLower = rawName
        .replace(/[.,\-()]/g, " ")
        .toLowerCase()
        .trim();
      const nameWords = cleanCsvNameLower
        .split(/\s+/)
        .filter((w) => w.length > 1);

      if (nameWords.length >= 2) {
        const w1 = nameWords[0];
        const w2 = nameWords[1];

        const matchedDbStudent = baselineStudents.find((dbStd) => {
          if (!dbStd.name) return false;
          const dbLower = dbStd.name.toLowerCase();
          return dbLower.includes(w1) && dbLower.includes(w2);
        });

        if (matchedDbStudent && matchedDbStudent.prn) {
          const cleanPossiblePrn = matchedDbStudent.prn
            .toString()
            .replace(/[^0-9]/g, "");
          if (!claimedPRNs.has(cleanPossiblePrn)) {
            finalPRN = cleanPossiblePrn;
          }
        }
      }

      if (!finalPRN) continue;

      claimedPRNs.add(finalPRN);
      s.finalPRN = finalPRN;

      const flatSubjects = {};
      const excludedKeys = [
        "seat no",
        "name",
        "result",
        "sgpi",
        "total marks",
        "finalprn",
      ];

      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) {
          // Shave off dirty text and strictly convert mark values to safe numbers
          const rawMark = s[key];
          const numMatch = rawMark
            ? rawMark.toString().match(/^(\d+(\.\d+)?)/)
            : null;
          flatSubjects[key] = numMatch ? Number(numMatch[0]) : rawMark;
        }
      });

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: {
            $set: { gender: extractedGender },
            $setOnInsert: {
              name: rawName || "Unknown",
              motherName: extractedMotherName,
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
              sgpi: s["SGPI"],
              totalMarks: s["Total Marks"],
              finalResult: s["Result"],
              subjects: flatSubjects,
            },
          },
          upsert: true,
        },
      });

      collegeUpdateOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: { $set: { Sem3: true } },
        },
      });

      verifiedSavedList.push({
        seat_no: cleanSeatNo,
        name: rawName,
        prn: finalPRN,
        result: s["Result"],
        sgpi: s["SGPI"],
      });
    }

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);
    if (collegeUpdateOps.length > 0)
      await CollegeStudentDetails.bulkWrite(collegeUpdateOps);

    res.status(200).json({
      success: true,
      message: `Semester 3 Gazette Processed! Matched and updated ${academicOps.length} enrolled students.`,
      students: verifiedSavedList,
    });
  } catch (error) {
    console.error("\n❌ FATAL MONGOOSE ERROR IN SEM 3 UPLOAD:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- Semester 4 Dynamic Dictionary Mapping ---
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
    if (!req.file) {
      return res.status(400).json({ message: "Upload a CSV file." });
    }

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, {
      header: false,
      skipEmptyLines: false,
    });

    const semNum = 4;
    const formattedData = [];
    let headerRowIdx = -1;
    let subHeaderRowIdx = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const firstCell = data[i][0] ? data[i][0].toString() : "";
      if (firstCell.includes("Courses")) headerRowIdx = i;
      if (firstCell.includes("Seat No")) subHeaderRowIdx = i;
    }

    if (headerRowIdx === -1 || subHeaderRowIdx === -1) {
      return res.status(400).json({
        message:
          "Invalid CSV format. Could not find Course Headers ('Courses ?' line missing).",
      });
    }

    const subjectNamesRowIdx = headerRowIdx + 1;
    const totalIdx = data[headerRowIdx].findIndex(
      (val) => val && val.toString().toUpperCase().includes("TOTAL"),
    );
    const sgpiIdx = data[headerRowIdx].findIndex(
      (val) => val && val.toString().toUpperCase().includes("SGPI"),
    );
    const resultIdx = data[headerRowIdx].findIndex(
      (val) => val && val.toString().toUpperCase().includes("RESULT"),
    );

    for (let i = 0; i < data.length; i++) {
      const col0 = data[i][0] ? data[i][0].toString().trim() : "";
      const col1 = data[i][1] ? data[i][1].toString().trim() : "";

      if (col0.match(/^\d+(\.0)?$/) && col1 === "MarksO") {
        const marksRow = data[i];
        const nameRow = data[i + 1] || [];

        const cleanSeatNo = col0.replace(/\.0$/, "").replace(/[^0-9]/g, "");

        // --- Safe Number Scrubber for SGPI and Totals ---
        const rawSgpi = marksRow[sgpiIdx]
          ? marksRow[sgpiIdx].toString().replace(/[^0-9.]/g, "")
          : "0";
        const rawTotal = marksRow[totalIdx]
          ? marksRow[totalIdx].toString().replace(/[^0-9]/g, "")
          : "0";

        const safeSgpi = Number(rawSgpi) || 0;
        const safeTotal = Number(rawTotal) || 0;

        const studentObj = {
          "Seat No": cleanSeatNo,
          Name: nameRow[0] ? nameRow[0].toString().trim() : "",
          "Total Marks": safeTotal,
          SGPI: safeSgpi,
          Result: marksRow[resultIdx]
            ? marksRow[resultIdx].toString().trim()
            : "N/A",
        };

        let currentCourse = "";
        for (let c = 2; c < totalIdx; c++) {
          let courseCell = data[subjectNamesRowIdx][c];
          if (!courseCell || courseCell.toString().trim() === "") {
            courseCell = data[headerRowIdx][c];
          }
          if (courseCell && courseCell.toString().trim() !== "") {
            currentCourse = courseCell.toString().trim();
          }

          const markCategory = data[subHeaderRowIdx][c]
            ? data[subHeaderRowIdx][c].toString().trim()
            : "";

          if (currentCourse && markCategory) {
            const upperSub = currentCourse.toUpperCase();
            // Uses your Sem 4 specific dictionary mapping
            const shortName =
              SHORT_NAMES_SEM4[upperSub] || upperSub.substring(0, 15);
            const safeShortName = shortName
              .replace(/[^a-zA-Z0-9]/g, "_")
              .replace(/_+/g, "_");

            const markHead = `${safeShortName}_${markCategory}_Marks`;
            const gradeHead = `${safeShortName}_${markCategory}_Grade`;

            const markValue = marksRow[c]
              ? marksRow[c]
                  .toString()
                  .replace(/[EF\*\!]/g, "")
                  .trim()
              : "";
            const gradeValue = nameRow[c] ? nameRow[c].toString().trim() : "";

            studentObj[markHead] = markValue;
            if (gradeValue) studentObj[gradeHead] = gradeValue;
          }
        }
        formattedData.push(studentObj);
      }
    }

    // ==========================================================
    // 1. RAM CACHE: Fetch Baseline once into Node.js Memory
    // ==========================================================
    const baselineStudents = await CollegeStudentDetails.find(
      {},
      "prn name",
    ).lean();

    const claimedPRNs = new Set();
    const masterOps = [];
    const academicOps = [];
    const collegeUpdateOps = [];
    const verifiedSavedList = [];

    for (const s of formattedData) {
      const cleanSeatNo = s["Seat No"];
      if (!cleanSeatNo) continue;

      let rawName = (s["Name"] || "").trim();
      let extractedGender = "Male";
      if (rawName.startsWith("/")) {
        extractedGender = "Female";
        rawName = rawName.substring(1).trim();
      }

      let extractedMotherName = "Unknown";
      const nameParts = rawName.split(/\s+/);
      if (nameParts.length > 2) {
        extractedMotherName = nameParts[nameParts.length - 1];
      }

      // --- HIGH SPEED RAM NAME RESOLVER ---
      let finalPRN = null;
      const cleanCsvNameLower = rawName
        .replace(/[.,\-()]/g, " ")
        .toLowerCase()
        .trim();
      const nameWords = cleanCsvNameLower
        .split(/\s+/)
        .filter((w) => w.length > 1);

      if (nameWords.length >= 2) {
        const w1 = nameWords[0];
        const w2 = nameWords[1];

        const matchedDbStudent = baselineStudents.find((dbStd) => {
          if (!dbStd.name) return false;
          const dbLower = dbStd.name.toLowerCase();
          return dbLower.includes(w1) && dbLower.includes(w2);
        });

        if (matchedDbStudent && matchedDbStudent.prn) {
          const cleanPossiblePrn = matchedDbStudent.prn
            .toString()
            .replace(/[^0-9]/g, "");
          if (!claimedPRNs.has(cleanPossiblePrn)) {
            finalPRN = cleanPossiblePrn;
          }
        }
      }

      // ==========================================================
      // THE IRON GATE: If not inside CollegeStudentDetails, VAPORIZE.
      // ==========================================================
      if (!finalPRN) continue;

      claimedPRNs.add(finalPRN);
      s.finalPRN = finalPRN;

      const flatSubjects = {};
      const excludedKeys = [
        "seat no",
        "name",
        "result",
        "sgpi",
        "total marks",
        "finalprn",
      ];

      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) {
          // Strictly cast individual subject marks to pure Numbers
          const rawMark = s[key];
          const numMatch = rawMark
            ? rawMark.toString().match(/^(\d+(\.\d+)?)/)
            : null;
          flatSubjects[key] = numMatch ? Number(numMatch[0]) : rawMark;
        }
      });

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: {
            $set: { gender: extractedGender },
            $setOnInsert: {
              name: rawName || "Unknown",
              motherName: extractedMotherName,
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
              sgpi: s["SGPI"],
              totalMarks: s["Total Marks"],
              finalResult: s["Result"],
              subjects: flatSubjects,
            },
          },
          upsert: true,
        },
      });

      // Flips the specific Sem4 boolean flag inside Mongo
      collegeUpdateOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: { $set: { Sem4: true } },
        },
      });

      verifiedSavedList.push({
        seat_no: cleanSeatNo,
        name: rawName,
        prn: finalPRN,
        result: s["Result"],
        sgpi: s["SGPI"],
      });
    }

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);
    if (collegeUpdateOps.length > 0)
      await CollegeStudentDetails.bulkWrite(collegeUpdateOps);

    res.status(200).json({
      success: true,
      message: `Semester 4 Gazette Processed! Strictly matched and updated ${academicOps.length} enrolled students.`,
      students: verifiedSavedList,
    });
  } catch (error) {
    console.error("\n❌ FATAL MONGOOSE ERROR IN SEM 4 UPLOAD:", error);
    res.status(500).json({ error: error.message });
  }
};

// DON'T FORGET TO EXPORT uploadCsvDataSem4 at the bottom of studentController.js!

const uploadCsvDataSem5 = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload a CSV file." });
    }

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    const semNum = Number(req.body.semester) || 5;

    // ==========================================================
    // 1. RAM CACHE: Fetch Baseline once into Node.js Memory
    // ==========================================================
    const baselineStudents = await CollegeStudentDetails.find(
      {},
      "prn name",
    ).lean();

    const claimedPRNs = new Set();
    const masterOps = [];
    const academicOps = [];
    const collegeUpdateOps = [];
    const verifiedSavedList = [];

    for (const s of data) {
      const seatKey = Object.keys(s).find(
        (k) => k.trim() === "Seat No" || k.trim() === "Seat_No",
      );
      const cleanSeatNo = (seatKey ? s[seatKey] : "")
        .toString()
        .replace(/[^0-9]/g, "");
      const rawPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");

      if (!cleanSeatNo) continue;

      // --- Gender Extraction & Name Cleanup ---
      let rawName = (s["Name"] || s["name"] || "").trim();
      let extractedGender = s["Gender"] || "";

      if (rawName.startsWith("/")) {
        extractedGender = "Female";
        rawName = rawName.substring(1).trim();
      } else if (rawName.length > 0 && !extractedGender) {
        extractedGender = "Male";
      }
      s["Name"] = rawName;

      let extractedMotherName = "Unknown";
      const nameParts = rawName.split(/\s+/);
      if (nameParts.length > 2) {
        extractedMotherName = nameParts[nameParts.length - 1];
      }

      // --- HIGH SPEED RAM NAME RESOLVER ---
      let finalPRN = rawPRN;

      if (!finalPRN) {
        const cleanCsvNameLower = rawName
          .replace(/[.,\-()]/g, " ")
          .toLowerCase()
          .trim();
        const nameWords = cleanCsvNameLower
          .split(/\s+/)
          .filter((w) => w.length > 1);

        if (nameWords.length >= 2) {
          const w1 = nameWords[0];
          const w2 = nameWords[1];

          const matchedDbStudent = baselineStudents.find((dbStd) => {
            if (!dbStd.name) return false;
            const dbLower = dbStd.name.toLowerCase();
            return dbLower.includes(w1) && dbLower.includes(w2);
          });

          if (matchedDbStudent && matchedDbStudent.prn) {
            const cleanPossiblePrn = matchedDbStudent.prn
              .toString()
              .replace(/[^0-9]/g, "");
            if (!claimedPRNs.has(cleanPossiblePrn)) {
              finalPRN = cleanPossiblePrn;
            }
          }
        }
      }

      // ==========================================================
      // THE IRON GATE: If not inside CollegeStudentDetails, VAPORIZE.
      // ==========================================================
      if (!finalPRN) continue;

      claimedPRNs.add(finalPRN);
      s.finalPRN = finalPRN;

      // Safe Number Scrubber for SGPI and Totals
      const rawSgpi = (s["SGPI"] || s["SGPA"] || "0")
        .toString()
        .replace(/[^0-9.]/g, "");
      const rawTotal = (s["Grand_Total"] || s["Total Marks"] || "0")
        .toString()
        .replace(/[^0-9]/g, "");

      const safeSgpi = Number(rawSgpi) || 0;
      const safeTotal = Number(rawTotal) || 0;
      const extractedResult = s["Result"] || s["Final Result"] || "N/A";

      const flatSubjects = {};
      const excludedKeys = [
        "seat no",
        "seat_no",
        "prn",
        "name",
        "gender",
        "result",
        "final result",
        "sgpi",
        "sgpa",
        "grand_total",
        "total marks",
        "remark",
        "finalprn",
      ];

      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim())) {
          // Strictly cast individual subject marks to pure Numbers
          const rawMark = s[key];
          const numMatch = rawMark
            ? rawMark.toString().match(/^(\d+(\.\d+)?)/)
            : null;
          flatSubjects[key] = numMatch ? Number(numMatch[0]) : rawMark;
        }
      });

      masterOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: {
            $set: { gender: extractedGender },
            $setOnInsert: {
              name: rawName || "Unknown",
              motherName: extractedMotherName,
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
              sgpi: safeSgpi,
              totalMarks: safeTotal,
              finalResult: extractedResult,
              subjects: flatSubjects,
            },
          },
          upsert: true,
        },
      });

      // Target Sem5 specifically in the dashboard flags model
      collegeUpdateOps.push({
        updateOne: {
          filter: { prn: finalPRN },
          update: { $set: { Sem5: true } },
        },
      });

      verifiedSavedList.push({
        seat_no: cleanSeatNo,
        name: rawName,
        prn: finalPRN,
        result: extractedResult,
        sgpi: safeSgpi,
      });
    }

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);
    if (collegeUpdateOps.length > 0)
      await CollegeStudentDetails.bulkWrite(collegeUpdateOps);

    res.status(200).json({
      success: true,
      message: `Semester 5 Gazette Processed! Strictly matched and updated ${academicOps.length} enrolled students.`,
      students: verifiedSavedList,
    });
  } catch (error) {
    console.error("\n❌ FATAL MONGOOSE ERROR IN SEM 5 UPLOAD:", error);
    res.status(500).json({ error: error.message });
  }
};

const parseMuMark = (val) => {
  if (val === null || val === undefined) return null;
  const clean = val.toString().trim().toUpperCase();

  if (
    !clean ||
    clean === "-" ||
    clean === "--" ||
    clean === "NA" ||
    clean === "N/A"
  ) {
    return null;
  }

  if (["AB", "ABS", "ABSENT", "AA"].includes(clean)) return "AB";
  if (["EX", "EXEMPTED"].includes(clean)) return "EX";
  if (clean === "F") return "F";

  const numMatch = clean.match(/(\d+(\.\d+)?)/);
  if (numMatch) {
    return Number(numMatch[0]); // e.g. turns "45$" into the safe integer 45
  }

  return clean; // Fallback for grade letters like "A+" or "O"
};

const uploadCsvData = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    const semNum = Number(req.body.semester);
    if (!semNum)
      return res.status(400).json({ message: "Semester number is required." });

    // 1. Fetch Baseline & build a Name-to-PRN Bridge
    const collegeStudents = await CollegeStudentDetails.find(
      {},
      "prn name",
    ).lean();

    const validPrns = new Set();
    const nameToPrnMap = new Map(); // <--- THE BRIDGE

    collegeStudents.forEach((student) => {
      if (student.prn) {
        const cleanPrn = student.prn.toString().trim();
        validPrns.add(cleanPrn);
        if (student.name) {
          nameToPrnMap.set(student.name.toLowerCase().trim(), cleanPrn);
        }
      }
    });

    const academicOps = [];
    const collegeUpdateOps = [];
    const masterOps = [];
    const savedStudents = [];

    const excludedKeys = [
      "seat no",
      "seat_no",
      "prn",
      "name",
      "gender",
      "result",
      "final result",
      "sgpi",
      "sgpa",
      "grand_total",
      "total marks",
      "remark",
      "isnep",
      "is_nep",
      "nep",
      "batch",
      "isdiploma",
      "diploma",
    ];

    data.forEach((s) => {
      const seatKey = Object.keys(s).find(
        (k) => k.trim() === "Seat No" || k.trim() === "Seat_No",
      );
      const cleanSeatNo = (seatKey ? s[seatKey] : "")
        .toString()
        .replace(/[^0-9]/g, "");

      // FUZZY SEARCH FOR PRN (Catches "Permanent Registration Number (PRN)")
      const prnKey = Object.keys(s).find(
        (k) =>
          k.toLowerCase().includes("prn") ||
          k.toLowerCase().includes("registration"),
      );
      const rawPRN =
        prnKey && s[prnKey] ? s[prnKey].toString().replace(/[^0-9]/g, "") : "";

      const studentName = (s["Name"] || "").toLowerCase().trim();
      if (!cleanSeatNo) return;

      // ==========================================
      // STRICT DATABASE-ONLY GATEKEEPER
      // ==========================================
      let resolvedPRN = null;

      if (rawPRN && validPrns.has(rawPRN)) {
        resolvedPRN = rawPRN; // Option A: CSV gave PRN, and it exists in our DB
      } else if (studentName && nameToPrnMap.has(studentName)) {
        resolvedPRN = nameToPrnMap.get(studentName); // Option B: CSV missed PRN, but Name matches our DB
      }

      // If the student didn't satisfy Option A or B, vaporize the row instantly.
      if (!resolvedPRN) return;

      // 1. FUZZY SEARCH FOR SGPI
      const sgpiKey = Object.keys(s).find((k) => {
        const clean = k.toLowerCase().replace(/[^a-z]/g, "");
        return clean.includes("sgpi") || clean.includes("sgpa");
      });

      let extractedSGPI = 0;
      if (sgpiKey && s[sgpiKey]) {
        const sgpiMatch = s[sgpiKey].toString().match(/(\d+(\.\d+)?)/);
        if (sgpiMatch) extractedSGPI = Number(sgpiMatch[0]);
      }

      const extractedResult = s["Result"] || s["Final Result"] || "N/A";

      // 2. BUILD THE SUBJECTS OBJECT
      const flatSubjects = {};
      Object.keys(s).forEach((key) => {
        const normalizedKey = key.toLowerCase().trim();
        if (!excludedKeys.includes(normalizedKey)) {
          const cleanedMark = parseMuMark(s[key]);
          if (cleanedMark !== null) {
            flatSubjects[key.trim()] = cleanedMark;
          }
        }
      });

      // 3. FUZZY SEARCH FOR TOTAL MARKS
      const totalKey = Object.keys(s).find((k) => {
        const clean = k.toLowerCase().replace(/[^a-z]/g, "");
        return (
          clean === "grandtotal" ||
          clean === "totalmarks" ||
          clean === "total" ||
          clean === "grand"
        );
      });

      let extractedTotal = 0;
      if (totalKey && s[totalKey]) {
        const totalMatch = s[totalKey].toString().match(/(\d+)/);
        if (totalMatch) extractedTotal = Number(totalMatch[0]);
      }

      if (extractedTotal === 0) {
        extractedTotal = Object.values(flatSubjects).reduce((sum, mark) => {
          return typeof mark === "number" ? sum + mark : sum;
        }, 0);
      }

      // Controller 1: Save Marks
      academicOps.push({
        updateOne: {
          filter: { prn: resolvedPRN, semester: semNum },
          update: {
            $set: {
              seatNo: cleanSeatNo,
              sgpi: extractedSGPI,
              totalMarks: extractedTotal,
              finalResult: extractedResult,
              subjects: flatSubjects,
            },
          },
          upsert: true,
        },
      });

      // Controller 2: Update Sem Boolean (Guaranteed Hit!)
      // NOTE: Using standard camelCase "sem1", "sem2". Check your Mongoose schema!
      const semKey = `Sem${semNum}`;
      collegeUpdateOps.push({
        updateOne: {
          filter: { prn: resolvedPRN },
          update: {
            $set: {
              [semKey]: true,
            },
          },
        },
      });

      // Controller 3: Save Master Details
      masterOps.push({
        updateOne: {
          filter: { prn: resolvedPRN },
          update: {
            $set: { gender: s["Gender"] || "" },
            $setOnInsert: { name: s["Name"] || "Unknown" },
          },
          upsert: true,
        },
      });

      savedStudents.push({
        seat_no: cleanSeatNo,
        name: s["Name"],
        prn: resolvedPRN,
        result: extractedResult,
      });
    });

    if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);
    if (collegeUpdateOps.length > 0)
      await CollegeStudentDetails.bulkWrite(collegeUpdateOps);
    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);

    res.status(200).json({
      success: true,
      message: `Processed securely! Saved ${academicOps.length} matched students across all 3 databases.`,
      students: savedStudents,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const { semester, isNEP, prnPrefix } = req.query;

    // Create query object
    const query = {};
    if (semester) query.semester = Number(semester);
    if (prnPrefix) query.prn = { $regex: `^${prnPrefix}` };

    if (semester) {
      if (isNEP === "true") {
        const records = await NepAcademicRecord.find(query);
        const formatted = records.map((r) => ({
          seatNo: r.seatNo,
          name: r.name,
          gender: r.gender,
          results: { sgpi: r.sgpi, finalResult: r.finalResult },
          subjects: r.subjects || {},
        }));
        return res.json(formatted);
      } else {
        const records = await AcademicRecord.find(query);
        const prns = records.map((r) => r.prn);
        const students = await StudentMaster.find({ prn: { $in: prns } });

        const studentMap = {};
        students.forEach((s) => (studentMap[s.prn] = s));

        const formatted = records.map((r) => {
          const studentDetails = studentMap[r.prn] || {};
          return {
            seatNo: r.seatNo,
            name: studentDetails.name || "Unknown",
            gender: studentDetails.gender || "Unknown",
            results: { sgpi: r.sgpi, finalResult: r.finalResult },
            subjects: r.subjects || {},
          };
        });
        return res.json(formatted);
      }
    }

    // Default: find in StudentMaster using the PRN prefix if provided
    const masterQuery = prnPrefix ? { prn: { $regex: `^${prnPrefix}` } } : {};
    const allStudents = await StudentMaster.find(masterQuery).limit(100);
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
        { name: new RegExp(query, "i") },
      ],
    }).lean();

    // 2. Search NEP Data
    const nepMatchesRaw = await NepAcademicRecord.find({
      $or: [
        { seatNo: new RegExp(`^${query}$`, "i") },
        { name: new RegExp(query, "i") },
      ],
    }).lean();

    const uniqueNepStudents = {};
    nepMatchesRaw.forEach((record) => {
      if (!uniqueNepStudents[record.seatNo]) {
        uniqueNepStudents[record.seatNo] = {
          name: record.name,
          seatNo: record.seatNo,
          category: "NEP-2024",
        };
      }
    });
    const nepMatches = Object.values(uniqueNepStudents);

    // 3. COMBINE & DEDUPLICATE
    const uniqueMatchesMap = new Map();

    r19Matches.forEach((s) => {
      uniqueMatchesMap.set(s.prn, {
        name: s.name,
        prn: s.prn,
        category: s.status || "Regular",
        batch: "R-19 Scheme",
      });
    });

    nepMatches.forEach((s) => {
      if (uniqueMatchesMap.has(s.seatNo)) {
        const existing = uniqueMatchesMap.get(s.seatNo);
        existing.batch = "NEP 2024 Scheme";
      } else {
        uniqueMatchesMap.set(s.seatNo, {
          name: s.name,
          prn: s.seatNo,
          category: "Regular",
          batch: "NEP 2024 Scheme",
        });
      }
    });

    const combinedList = Array.from(uniqueMatchesMap.values());

    if (combinedList.length === 0)
      return res
        .status(404)
        .json({ message: "No student found with that Name, PRN, or Seat No." });

    if (combinedList.length > 1) {
      return res.json({
        type: "multiple",
        count: combinedList.length,
        students: combinedList,
      });
    }

    const student = combinedList[0];

    const r19Records = await AcademicRecord.find({ prn: student.prn }).lean();
    const nepRecords = await NepAcademicRecord.find({
      seatNo: student.prn,
    }).lean();

    const allRecords = [...r19Records, ...nepRecords].sort(
      (a, b) => a.semester - b.semester,
    );

    const academicHistory = {};

    // STRICT TRACKERS
    let eseFCount = 0;
    let otherFCount = 0;
    let activeKtsCount = 0;

    allRecords.forEach((record) => {
      const semKey = `Semester ${record.semester}`;
      if (!academicHistory[semKey]) academicHistory[semKey] = [];

      let hasKT = false;

      if (record.subjects) {
        Object.entries(record.subjects).forEach(([key, val]) => {
          const k = key.toLowerCase().trim();

          // STRICT RULE: ONLY check keys that are explicitly 'Grade' columns
          if (!k.includes("grade") && !k.endsWith("_gr")) return;

          // Ignore Total grades just in case
          if (
            k.includes("tot") ||
            k.includes("result") ||
            k.includes("status") ||
            k.includes("sgp")
          )
            return;

          const valStr = String(val).trim().toUpperCase();
          const isFail =
            valStr === "F" ||
            valStr === "ABS" ||
            valStr === "KT" ||
            (valStr.includes("F") &&
              valStr.length <= 6 &&
              !valStr.includes("FEM"));

          if (isFail) {
            hasKT = true;
            activeKtsCount++;

            if (k.includes("ese") || k.includes("th") || k.includes("theory")) {
              eseFCount++;
            } else if (
              k.includes("ia") ||
              k.includes("tw") ||
              k.includes("pr") ||
              k.includes("or") ||
              k.includes("pract") ||
              k.includes("term") ||
              k.includes("internal")
            ) {
              otherFCount++;
            } else {
              eseFCount++;
            }
          }
        });
      }

      const resUpper = String(record.finalResult).toUpperCase();
      if (
        resUpper === "F" ||
        resUpper === "FAILED" ||
        resUpper === "KT" ||
        resUpper.includes("FAIL")
      )
        hasKT = true;

      academicHistory[semKey].push({
        seatNo: record.seatNo,
        sgpi: record.sgpi || "0",
        totalMarks: record.totalMarks || "0",
        result: record.finalResult || "N/A",
        hasKT: hasKT,
        subjects: record.subjects || {},
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
        batch: student.batch,
      },
      summary: {
        totalSemestersAppeared: allRecords.length,
        ktCount: activeKtsCount,
      },
      academicHistory: academicHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentsByBatch = async (req, res) => {
  try {
    const students = await StudentMaster.find({
      batch: new RegExp(req.params.batch, "i"),
    });
    if (students.length === 0)
      return res
        .status(404)
        .json({ message: "No students found for this batch" });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
        semester: record.semester,
      });

      if (existingTargetSem) {
        await AcademicRecord.deleteOne({ _id: record._id });
      } else {
        await AcademicRecord.updateOne(
          { _id: record._id },
          { $set: { prn: targetPrn } },
        );
      }
    }

    // 2. Move NEP Academic Records Safely
    const sourceNepRecords = await NepAcademicRecord.find({
      seatNo: sourcePrn,
    });
    for (const record of sourceNepRecords) {
      const existingTargetSem = await NepAcademicRecord.findOne({
        seatNo: targetPrn,
        semester: record.semester,
      });

      if (existingTargetSem) {
        await NepAcademicRecord.deleteOne({ _id: record._id });
      } else {
        await NepAcademicRecord.updateOne(
          { _id: record._id },
          { $set: { seatNo: targetPrn } },
        );
      }
    }

    // 3. Handle Master Profile Identity
    const existingTarget = await StudentMaster.findOne({ prn: targetPrn });
    if (existingTarget) {
      await StudentMaster.deleteOne({ prn: sourcePrn });
    } else {
      await StudentMaster.updateOne(
        { prn: sourcePrn },
        { $set: { prn: targetPrn } },
      );
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
    if (!req.file)
      return res.status(400).json({ message: "Upload a CSV file." });
    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    const semNum = Number(req.body.semester);
    if (!semNum)
      return res.status(400).json({ message: "Semester number is required." });

    const academicOps = [];

    data.forEach((s) => {
      const seatKey = Object.keys(s).find(
        (k) => k.trim() === "Seat No" || k.trim() === "Seat_No",
      );
      const cleanSeatNo = (seatKey ? s[seatKey] : "")
        .toString()
        .replace(/[^0-9]/g, "");
      const rawPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");

      if (!rawPRN) return;

      const extractedSGPI = s["SGPI"] || s["SGPA"] || "0";
      const extractedTotal = s["Grand_Total"] || s["Total Marks"] || "0";
      const extractedResult = s["Result"] || s["Final Result"] || "N/A";

      const flatSubjects = {};
      const excludedKeys = [
        "seat no",
        "seat_no",
        "prn",
        "name",
        "gender",
        "result",
        "final result",
        "sgpi",
        "sgpa",
        "grand_total",
        "total marks",
        "remark",
      ];
      Object.keys(s).forEach((key) => {
        if (!excludedKeys.includes(key.toLowerCase().trim()))
          flatSubjects[key] = s[key];
      });

      const updateFields = {
        sgpi: extractedSGPI,
        totalMarks: extractedTotal,
        finalResult: extractedResult,
        seatNo: cleanSeatNo,
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
          upsert: true,
        },
      });
    });

    if (academicOps.length > 0) {
      const dbResult = await AcademicRecord.bulkWrite(academicOps);
      res.status(200).json({
        success: true,
        message: `ATKT Processed! Smart Updated ${dbResult.modifiedCount} records & Inserted ${dbResult.upsertedCount}.`,
        students: data.map((s) => ({
          seat_no: s["Seat No"] || s["Seat_No"],
          name: s["Name"],
          prn: s["PRN"],
          result: s["Result"] || s["Final Result"],
          sgpi: s["SGPI"] || s["SGPA"],
        })),
      });
    } else {
      res.status(400).json({ error: "No valid ATKT records with PRNs found." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSem1Students = async (req, res) => {
  try {
    const { prnPrefix } = req.query;
    const matchQuery = { semester: 1 };

    // Apply PRN prefix filter if provided
    if (prnPrefix) {
      matchQuery.prn = { $regex: `^${prnPrefix}` };
    }

    const records = await AcademicRecord.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "studentmasters",
          localField: "prn",
          foreignField: "prn",
          as: "studentInfo",
        },
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
    ]);

    const formattedData = records.map((record) => {
      const subjects = record.subjects || {};
      const findMarks = (code, name) => {
        if (subjects[name] !== undefined) return subjects[name];
        for (let i = 1; i <= 15; i++) {
          const pCode = subjects[`paper${i}code`];
          if (pCode && pCode.toString().replace(".0", "") === code) {
            return subjects[`paper${i}marks`];
          }
        }
        return "-";
      };

      return {
        "Seat No":
          record.seatNo || record.studentInfo?.seatNo || record.prn || "N/A",
        Name: record.studentInfo?.name || "Unknown",
        Gender: record.studentInfo?.gender || "Unknown",
        Result: record.finalResult || "N/A",
        SGPI: record.sgpi || "0",
        Eng_Maths_I_Marks: findMarks("58651", "Engineering Mathematics - I"),
        Eng_Physics_I_Marks: findMarks("58652", "Engineering Physics - I"),
        Eng_Chem_I_Marks: findMarks("58655", "Engineering Chemistry - I"),
        Eng_Mechanics_Marks: findMarks("58653", "Engineering Mechanics"),
        Basic_Elec_Eng_Marks: findMarks(
          "58654",
          "Basic Electrical Engineering",
        ),
        ...subjects,
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Sem 1 Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const getSem3Students = async (req, res) => {
  try {
    const { prnPrefix } = req.query;
    const matchQuery = { semester: 3 };

    // Apply PRN prefix filter if provided
    if (prnPrefix) {
      matchQuery.prn = { $regex: `^${prnPrefix}` };
    }

    const records = await AcademicRecord.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "studentmasters",
          localField: "prn",
          foreignField: "prn",
          as: "studentInfo",
        },
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
    ]);

    const formattedData = records.map((record) => {
      const subjects = record.subjects || {};
      const findMarks = (code, name) => {
        if (subjects[name] !== undefined) return subjects[name];
        for (let i = 1; i <= 15; i++) {
          const pCode = subjects[`paper${i}code`];
          if (pCode && pCode.toString().replace(".0", "") === code) {
            return subjects[`paper${i}marks`];
          }
        }
        return "-";
      };

      return {
        "Seat No":
          record.seatNo || record.studentInfo?.seatNo || record.prn || "N/A",
        Name: record.studentInfo?.name || "Unknown",
        Gender: record.studentInfo?.gender || "Unknown",
        Result: record.finalResult || "N/A",
        SGPI: record.sgpi || "0",
        Eng_Maths_I_Marks: findMarks("58651", "Engineering Mathematics - I"),
        Eng_Physics_I_Marks: findMarks("58652", "Engineering Physics - I"),
        Eng_Chem_I_Marks: findMarks("58655", "Engineering Chemistry - I"),
        Eng_Mechanics_Marks: findMarks("58653", "Engineering Mechanics"),
        Basic_Elec_Eng_Marks: findMarks(
          "58654",
          "Basic Electrical Engineering",
        ),
        ...subjects,
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Sem 1 Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSem2Students = async (req, res) => {
  try {
    const { prnPrefix } = req.query;
    const matchQuery = { semester: 2 };

    if (prnPrefix) {
      matchQuery.prn = { $regex: `^${prnPrefix}` };
    }

    const records = await AcademicRecord.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "studentmasters",
          localField: "prn",
          foreignField: "prn",
          as: "studentInfo",
        },
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
    ]);

    const formattedData = records.map((record) => {
      const subjects = record.subjects || {};
      const findMarks = (code, name) => {
        if (subjects[name] !== undefined) return subjects[name];
        for (let i = 1; i <= 15; i++) {
          const pCode = subjects[`paper${i}code`];
          if (pCode && pCode.toString().replace(".0", "") === code) {
            return subjects[`paper${i}marks`];
          }
        }
        return "-";
      };

      return {
        "Seat No":
          record.seatNo || record.studentInfo?.seatNo || record.prn || "N/A",
        Name: record.studentInfo?.name || "Unknown",
        Gender: record.studentInfo?.gender || "Unknown",
        Result: record.finalResult || "N/A",
        SGPI: record.sgpi || "0",
        "Eng_Maths-II_Marks": findMarks(
          "29711",
          "Engineering Mathematics - II",
        ),
        "Eng_Physics-II_Marks": findMarks("29712", "Engineering Physics - II"),
        "Eng_Chem-II_Marks": findMarks("29713", "Engineering Chemistry - II"),
        Eng_Graphics_Marks: findMarks("29714", "Engineering Graphics"),
        "C Prog_Marks": findMarks("29715", "C Programming"),
        ...subjects,
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Sem 2 Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SEMESTER 7 - Data Fetcher (Dynamic Map)
// ==========================================
const sem7Map = {
  "AI and Data Science - II": "AI_DS_II_Marks",
  "Internet of Everything": "IoE_Marks",
  "Data Science Lab": "Data_Science_Lab_Marks",
  "IOE Lab": "IOE_Lab_Marks",
  "Secure App Dev Lab": "Secure_App_Dev_Lab_Marks",
  "Open Source Project Lab": "Open_Source_Lab_Marks",
  "Major Project - I": "Major_Project_I_Marks",
};

const getSem7Students = async (req, res) => {
  try {
    const { prnPrefix } = req.query;
    const matchQuery = { semester: 7 };

    if (prnPrefix) {
      matchQuery.prn = { $regex: `^${prnPrefix}` };
    }

    const records = await AcademicRecord.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "studentmasters",
          localField: "prn",
          foreignField: "prn",
          as: "studentInfo",
        },
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
    ]);

    const formattedData = records.map((record) => {
      const subjects = record.subjects || {};
      let mappedSubjects = {};

      for (const [dbKey, marks] of Object.entries(subjects)) {
        if (sem7Map && sem7Map[dbKey]) {
          mappedSubjects[sem7Map[dbKey]] = marks;
        } else {
          if (
            !dbKey.includes("code") &&
            !dbKey.includes("marks") &&
            !dbKey.includes("cr")
          ) {
            const fallbackKey = dbKey.replace(/\s+/g, "_") + "_Marks";
            mappedSubjects[fallbackKey] = marks;
          }
        }
      }

      for (let i = 1; i <= 15; i++) {
        const pCode = subjects[`paper${i}code`];
        const pMarks = subjects[`paper${i}marks`];
        if (pCode && pMarks) {
          mappedSubjects[
            `SubjectCode_${pCode.toString().replace(".0", "")}_Marks`
          ] = pMarks;
        }
      }

      return {
        "Seat No":
          record.seatNo || record.studentInfo?.seatNo || record.prn || "N/A",
        Name: record.studentInfo?.name || "Unknown",
        Gender: record.studentInfo?.gender || "Unknown",
        Result: record.finalResult || "N/A",
        SGPI: record.sgpi || "0",
        ...mappedSubjects,
        ...subjects,
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Sem 7 Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SEMESTER 4, 5, 6 - Data Fetcher Placeholders
// ==========================================
const getSem4Students = async (req, res) => {
  try {
    res.status(200).json([]); // Placeholder - add real logic later
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSem5Students = async (req, res) => {
  try {
    res.status(200).json([]); // Placeholder - add real logic later
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSem6Students = async (req, res) => {
  try {
    res.status(200).json([]); // Placeholder - add real logic later
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadMasterCsv = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    const masterOps = [];

    data.forEach((s) => {
      const prnKey = Object.keys(s).find(
        (k) =>
          k.toLowerCase().includes("prn") ||
          k.toLowerCase().includes("registration"),
      );

      const nameKey = Object.keys(s).find((k) =>
        k.toLowerCase().includes("name"),
      );

      const batchKey = Object.keys(s).find((k) =>
        k.toLowerCase().includes("batch"),
      );

      const diplomaKey = Object.keys(s).find(
        (k) =>
          k.toLowerCase().includes("diploma") ||
          k.toLowerCase() === "isdiploma",
      );

      const rawPRN =
        prnKey && s[prnKey] ? s[prnKey].toString().replace(/[^0-9]/g, "") : "";
      const name = nameKey && s[nameKey] ? s[nameKey] : "Unknown";
      const batch =
        batchKey && s[batchKey] ? s[batchKey].toString().trim() : "";

      // Bulletproof Boolean parser (catches "true", "TRUE", "Yes", "yes", "1")
      let isDiploma = false;
      if (diplomaKey && s[diplomaKey]) {
        const cleanVal = s[diplomaKey].toString().trim().toLowerCase();
        isDiploma = ["true", "1", "yes", "y"].includes(cleanVal);
      }

      // If there is no PRN, skip the row
      if (!rawPRN) return;

      masterOps.push({
        updateOne: {
          filter: { prn: rawPRN },
          update: {
            $set: {
              name: name,
              batch: batch,
              isDiploma: isDiploma,
            },
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) {
      await CollegeStudentDetails.bulkWrite(masterOps);

      res.status(200).json({
        success: true,
        message: `Master Data Uploaded! Successfully added/updated ${masterOps.length} students in the database.`,
      });
    } else {
      res
        .status(400)
        .json({ error: "No valid students with PRNs found in the CSV." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSemAnalysis = async (req, res) => {
  try {
    const semNum = Number(req.params.sem);
    if (!semNum)
      return res.status(400).json({ message: "Semester is required" });

    // ==========================================
    // 1. AUTO-DISCOVER ALL BATCHES
    // ==========================================
    const rawBatches = await CollegeStudentDetails.distinct("batch");
    const availableBatches = rawBatches
      .filter((b) => b !== null && b !== undefined && b.trim() !== "")
      .sort(); // e.g. ["2023", "2024"]

    if (availableBatches.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No student batches found inside the College details database.",
        availableBatches: [],
      });
    }

    // 2. SMART DEFAULT: If no batch was passed in the URL, pick the most recent one!
    const targetBatch =
      req.query.batch || availableBatches[availableBatches.length - 1];

    // Find ONLY the students belonging to that specific batch
    const verifiedCollegeStudents = await CollegeStudentDetails.find(
      { batch: targetBatch.trim() },
      "prn batch",
    ).lean();

    const allowedPrns = verifiedCollegeStudents.map((s) => s.prn);

    if (allowedPrns.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No college students found enrolled inside Batch "${targetBatch}"`,
        availableBatches,
      });
    }

    // ==========================================
    // 3. FETCH STRICTLY MATCHED ACADEMIC RECORDS
    // ==========================================
    const records = await AcademicRecord.find({
      semester: semNum,
      prn: { $in: allowedPrns }, // Locked to the gatekeeper's list
    }).lean();

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No Semester ${semNum} mark records found for Batch "${targetBatch}"`,
        availableBatches,
      });
    }

    // Fetch student names and gender
    const prns = records.map((r) => r.prn);
    const students = await StudentMaster.find({ prn: { $in: prns } }).lean();

    const studentMap = {};
    students.forEach((s) => {
      studentMap[s.prn] = {
        name: s.name,
        gender: s.gender || "Male",
      };
    });

    let totalStudents = records.length;
    let totalPassed = 0;
    let totalFailed = 0;

    let malePassed = 0;
    let maleFailed = 0;
    let maleTotal = 0;

    let femalePassed = 0;
    let femaleFailed = 0;
    let femaleTotal = 0;

    let studentsList = [];
    let subjectStats = {};

    // DYNAMIC TARGET SUBJECTS
    let targetSubjects = [];
    if (semNum === 1) {
      targetSubjects = [
        "Eng_Maths_I_Marks",
        "Eng_Physics_I_Marks",
        "Eng_Chem_I_Marks",
        "Eng_Mechanics_Marks",
        "Basic_Elec_Eng_Marks",
      ];
    } else if (semNum === 2) {
      targetSubjects = [
        "Eng_Maths_II_Marks",
        "Eng_Physics_II_Marks",
        "Eng_Chem_II_Marks",
        "Eng_Graphics_Marks",
        "C_Prog_Marks",
      ];
    } else if (semNum === 3) {
      // ---> ADDED SEMESTER 3 THEORY SUBJECTS <---
      targetSubjects = [
        "EM3_TOT_Marks", // Engineering Mathematics III
        "DSA_TOT_Marks", // Data Structure and Analysis
        "DBMS_TOT_Marks", // Database Management System
        "PC_TOT_Marks", // Principle of Communication
        "PCPF_TOT_Marks", // Paradigms & Computer Programming Fundamentals
      ];
    } else if (semNum === 5) {
      targetSubjects = [
        "IP_TOT_Marks",
        "CNS_TOT_Marks",
        "EEB_TOT_Marks",
        "SE_TOT_Marks",
        "ADSA_TOT_Marks",
        "ADMT_TOT_Marks",
      ];
    } else if (semNum === 4) {
      targetSubjects = [
        "EM4_TOT_Marks",
        "CNND_TOT_Marks",
        "OS_TOT_Marks",
        "AT_TOT_Marks",
        "COA_TOT_Marks",
      ];
    } else if (semNum === 7) {
      targetSubjects = [
        "AI_DS_II_Marks",
        "IoE_Marks",
        "Mgmt_Info_Sys_Marks",
        "Infra_Security_Marks",
        "Info_Retrieval_Sys_Marks",
        "Cyber_Security_Laws_Marks",
        "Software_Testing_QA_Marks",
        "Blockchain_DLT_Marks",
        "Big_Data_Marks",
        "Knowledge_Mgmt_Marks",
        "ERP_Marks",
        "Project_Mgmt_Marks",
      ];
    }

    records.forEach((record) => {
      const studentData = studentMap[record.prn] || {
        name: "Unknown",
        gender: "Male",
      };
      const studentName = studentData.name;
      const isFemale =
        String(studentData.gender).trim().toLowerCase() === "female";

      const sgpi = parseFloat(record.sgpi) || 0;
      const safeResult = record.finalResult
        ? record.finalResult.trim().toUpperCase()
        : "";
      const isPassed =
        safeResult === "P" ||
        safeResult === "PASS" ||
        safeResult === "SUCCESSFUL";

      if (isPassed) {
        totalPassed++;
        if (isFemale) femalePassed++;
        else malePassed++;
      } else {
        totalFailed++;
        if (isFemale) femaleFailed++;
        else maleFailed++;
      }

      if (isFemale) femaleTotal++;
      else maleTotal++;

      studentsList.push({
        prn: record.prn,
        seatNo: record.seatNo,
        name: studentName,
        sgpi: sgpi,
        result: record.finalResult || "N/A",
        totalMarks: record.totalMarks || 0,
      });

      if (record.subjects) {
        Object.entries(record.subjects).forEach(([subKey, markValue]) => {
          if (!targetSubjects.includes(subKey)) return;
          let mark = NaN;

          if (typeof markValue === "object" && markValue !== null) {
            mark = parseFloat(markValue.totalMarks || markValue.marks || 0);
          } else {
            const match = String(markValue).match(/(\d+(\.\d+)?)/);
            if (match) mark = parseFloat(match[0]);
          }

          if (!subjectStats[subKey]) {
            subjectStats[subKey] = {
              subjectName: subKey,
              allScorers: [],
              appeared: 0,
              passed: 0,
              marks40to50: 0,
              marks51to59: 0,
              marks60Plus: 0,
            };
          }

          subjectStats[subKey].appeared++;
          if (!isNaN(mark) && mark >= 40) subjectStats[subKey].passed++;

          if (!isNaN(mark)) {
            if (mark >= 40 && mark <= 50) subjectStats[subKey].marks40to50++;
            else if (mark > 50 && mark < 60) subjectStats[subKey].marks51to59++;
            else if (mark >= 60) subjectStats[subKey].marks60Plus++;

            subjectStats[subKey].allScorers.push({
              name: studentName,
              marks: mark,
            });
          }
        });
      }
    });

    studentsList.sort((a, b) => b.sgpi - a.sgpi);

    let currentRank = 1;
    studentsList.forEach((student, index) => {
      if (index > 0 && student.sgpi < studentsList[index - 1].sgpi) {
        currentRank = index + 1;
      }
      student.overallRank = currentRank;
    });

    // Upgraded to Top 10 with safe math ranks
    const topOverall = studentsList.slice(0, 3).map((s) => ({
      rank: s.overallRank,
      name: s.name,
      sgpi: s.sgpi,
    }));

    const subjectAnalysis = Object.values(subjectStats).map((stat) => {
      const sortedScorers = stat.allScorers.sort((a, b) => b.marks - a.marks);
      return {
        subject: stat.subjectName,
        topScorers: sortedScorers.slice(0, 3),
        appeared: stat.appeared,
        passed: stat.passed,
        marks40to50: stat.marks40to50,
        marks51to59: stat.marks51to59,
        marks60Plus: stat.marks60Plus,
        passPercentage:
          stat.appeared > 0
            ? ((stat.passed / stat.appeared) * 100).toFixed(2)
            : 0,
      };
    });

    const passPercentage =
      totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      availableBatches, // <--- Delivered directly to React
      selectedBatch: targetBatch,
      analysis: {
        semester: semNum,
        overall: {
          totalStudents,
          totalPassed,
          totalFailed,
          passPercentage,
          gender: {
            male: { passed: malePassed, failed: maleFailed, total: maleTotal },
            female: {
              passed: femalePassed,
              failed: femaleFailed,
              total: femaleTotal,
            },
          },
        },
        topOverall,
        subjectAnalysis,
      },
      studentsList,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add this to your controllers file
// const Papa = require("papaparse");

const analyzeSem3CsvDirectly = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Upload a CSV file." });

    const csvString = req.file.buffer.toString();

    // Parse as 2D Array
    const { data } = Papa.parse(csvString, {
      header: false,
      skipEmptyLines: true,
    });

    const minRow = data[4] || []; // Row 4 has the passing minimums

    // Initialize Stats
    let totalStudents = 0,
      totalPassed = 0,
      totalFailed = 0;
    let malePassed = 0,
      maleFailed = 0,
      maleTotal = 0;
    let femalePassed = 0,
      femaleFailed = 0,
      femaleTotal = 0;
    let studentsList = [];

    // Subject Mapping for Sem 3 (Theory + IA columns)
    const subjectMappings = {
      AMT_Marks: { th: 2, ia: 3 },
      ADSA_Marks: { th: 5, ia: 6 },
      DBMS_Marks: { th: 7, ia: 8 },
      AT_Marks: { th: 9, ia: 10 },
      OE_Marks: { th: 11, ia: 12 },
    };

    let subjectStats = {};
    Object.keys(subjectMappings).forEach((key) => {
      subjectStats[key] = {
        subjectName: key,
        allScorers: [],
        appeared: 0,
        passed: 0,
        marks40to50: 0,
        marks51to59: 0,
        marks60Plus: 0,
      };
    });

    const getMark = (val) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));

    // Loop through students starting at Row 5
    for (let i = 5; i < data.length; i++) {
      const row = data[i];
      const seatNo = (row[0] || "").toString().trim();
      if (!seatNo) continue;

      let rawName = (row[1] || "").toString().trim();
      let prn = `TEMP_${seatNo}`;

      // Extract PRN and Name (MU03411... \n [Name])
      if (rawName.includes("\n")) {
        const parts = rawName.split("\n");
        prn = parts[0].replace(/[^0-9A-Za-z]/g, "");
        rawName = parts[1].replace("[", "").replace("]", "").trim();
      }

      // Check Female prefix '/'
      let isFemale = false;
      if (rawName.startsWith("/")) {
        isFemale = true;
        rawName = rawName.substring(1).trim();
      }

      totalStudents++;
      if (isFemale) femaleTotal++;
      else maleTotal++;

      // Overall Pass/Fail Logic (Must pass minimum in every column)
      let isPassed = true;
      for (let c = 2; c <= 20; c++) {
        const minMark = getMark(minRow[c]);
        const studentMark = getMark(row[c]);
        if (minMark > 0 && studentMark < minMark) {
          isPassed = false;
          break;
        }
      }

      if (isPassed) {
        totalPassed++;
        if (isFemale) femalePassed++;
        else malePassed++;
      } else {
        totalFailed++;
        if (isFemale) femaleFailed++;
        else maleFailed++;
      }

      const totalMarks = getMark(row[21]);

      studentsList.push({
        seatNo,
        prn,
        name: rawName || "Unknown",
        result: isPassed ? "P" : "F",
        sgpi: totalMarks, // Using 'sgpi' key for Total Marks to easily reuse frontend sorting
      });

      // Process Individual Subjects
      Object.entries(subjectMappings).forEach(([subKey, cols]) => {
        const thMark = getMark(row[cols.th]);
        const iaMark = getMark(row[cols.ia]);
        const totalSubMark = thMark + iaMark;

        subjectStats[subKey].appeared++;
        if (totalSubMark >= 40) subjectStats[subKey].passed++;

        // Bucket Logic
        if (totalSubMark >= 40 && totalSubMark <= 50)
          subjectStats[subKey].marks40to50++;
        else if (totalSubMark > 50 && totalSubMark <= 59)
          subjectStats[subKey].marks51to59++;
        else if (totalSubMark >= 60) subjectStats[subKey].marks60Plus++;

        subjectStats[subKey].allScorers.push({
          name: rawName,
          marks: totalSubMark,
        });
      });
    }

    // Sort Students by Total Marks
    studentsList.sort((a, b) => b.sgpi - a.sgpi);
    let currentRank = 1;
    studentsList.forEach((student, index) => {
      if (index > 0 && student.sgpi < studentsList[index - 1].sgpi)
        currentRank = index + 1;
      student.overallRank = currentRank;
    });

    const topOverall = studentsList.slice(0, 3).map((s) => ({
      rank: s.overallRank,
      name: s.name,
      sgpi: s.sgpi,
    }));

    // Sort Top Subjects
    const subjectAnalysis = Object.values(subjectStats).map((stat) => {
      const sortedScorers = stat.allScorers.sort((a, b) => b.marks - a.marks);
      return {
        subject: stat.subjectName,
        topScorers: sortedScorers.slice(0, 3),
        appeared: stat.appeared,
        passed: stat.passed,
        marks40to50: stat.marks40to50,
        marks51to59: stat.marks51to59,
        marks60Plus: stat.marks60Plus,
        passPercentage:
          stat.appeared > 0
            ? ((stat.passed / stat.appeared) * 100).toFixed(2)
            : 0,
      };
    });

    res.status(200).json({
      success: true,
      analysis: {
        semester: 3,
        overall: {
          totalStudents,
          totalPassed,
          totalFailed,
          passPercentage:
            totalStudents > 0
              ? ((totalPassed / totalStudents) * 100).toFixed(2)
              : 0,
          gender: {
            male: { passed: malePassed, failed: maleFailed, total: maleTotal },
            female: {
              passed: femalePassed,
              failed: femaleFailed,
              total: femaleTotal,
            },
          },
        },
        topOverall,
        subjectAnalysis,
      },
      studentsList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// const uploadCsvDataSem3 = async (req, res) => {
//   try {
//     if (!req.file)
//       return res.status(400).json({ message: "Upload a CSV file." });

//     const csvString = req.file.buffer.toString();
//     const { data } = Papa.parse(csvString, {
//       header: true,
//       skipEmptyLines: true,
//     });

//     const semNum = Number(req.body.semester) || 3;
//     const masterOps = [];
//     const academicOps = [];

//     for (const s of data) {
//       const seatKey = Object.keys(s).find(
//         (k) => k.trim() === "Seat No" || k.trim() === "Seat_No",
//       );
//       const cleanSeatNo = (seatKey ? s[seatKey] : "")
//         .toString()
//         .replace(/[^0-9]/g, "");
//       let rawPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");

//       if (!cleanSeatNo) continue;

//       // --- PRN LOOKUP LOGIC ---
//       let finalPRN = rawPRN;
//       if (!finalPRN) {
//         let csvName = s["Name"] || s["name"];
//         if (csvName) {
//           csvName = csvName.replace(/[\/.,\-()]/g, " ");
//           const nameWords = csvName
//             .split(/\s+/)
//             .filter((w) => w.trim().length > 1);

//           if (nameWords.length > 0) {
//             const escapeRegExp = (string) =>
//               string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//             const primaryWords = nameWords.slice(0, 2);
//             const searchConditions = primaryWords.map((word) => ({
//               name: {
//                 $regex: "\\b" + escapeRegExp(word) + "\\b",
//                 $options: "i",
//               },
//             }));

//             let matchedStudents = await CollegeStudentDetail.find({
//               $and: searchConditions,
//             });

//             if (matchedStudents.length === 1) {
//               finalPRN = matchedStudents[0].prn
//                 .toString()
//                 .replace(/[^0-9]/g, "");
//             } else if (
//               matchedStudents.length === 0 &&
//               primaryWords.length > 0
//             ) {
//               const fallbackMatches = await CollegeStudentDetail.find({
//                 name: {
//                   $regex: "\\b" + escapeRegExp(primaryWords[0]) + "\\b",
//                   $options: "i",
//                 },
//               });
//               if (fallbackMatches.length === 1) {
//                 finalPRN = fallbackMatches[0].prn
//                   .toString()
//                   .replace(/[^0-9]/g, "");
//               }
//             }
//           }
//         }
//       }
//       finalPRN = finalPRN || `TEMP_${cleanSeatNo}`;
//       // ------------------------

//       const extractedSGPI = s["SGPI"] || s["SGPA"] || "0";
//       const extractedTotal = s["Grand_Total"] || s["Total Marks"] || "0";
//       const extractedResult = s["Result"] || s["Final Result"] || "N/A";
//       const flatSubjects = {};
//       const excludedKeys = [
//         "seat no",
//         "seat_no",
//         "prn",
//         "name",
//         "gender",
//         "result",
//         "final result",
//         "sgpi",
//         "sgpa",
//         "grand_total",
//         "total marks",
//         "remark",
//       ];

//       Object.keys(s).forEach((key) => {
//         if (!excludedKeys.includes(key.toLowerCase().trim())) {
//           flatSubjects[key] = s[key];
//         }
//       });

//       masterOps.push({
//         updateOne: {
//           filter: { prn: finalPRN },
//           update: {
//             $set: { gender: s["Gender"] || "" },
//             $setOnInsert: { name: s["Name"] || "Unknown" },
//           },
//           upsert: true,
//         },
//       });

//       academicOps.push({
//         updateOne: {
//           filter: { prn: finalPRN, semester: semNum },
//           update: {
//             $set: {
//               seatNo: cleanSeatNo,
//               sgpi: extractedSGPI,
//               totalMarks: extractedTotal,
//               finalResult: extractedResult,
//               subjects: flatSubjects,
//             },
//           },
//           upsert: true,
//         },
//       });
//     }

//     if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
//     if (academicOps.length > 0) await AcademicRecord.bulkWrite(academicOps);

//     res
//       .status(200)
//       .json({ success: true, message: `CSV Processed for Semester ${semNum}` });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// const getSem7Analysis = async (req, res) => {
//   try {
//     const semNum = Number(req.params.sem);
//     if (!semNum)
//       return res.status(400).json({ message: "Semester is required" });

//     const records = await AcademicRecord.find({ semester: semNum }).lean();

//     if (!records || records.length === 0) {
//       return res
//         .status(404)
//         .json({ message: `No records found for Semester ${semNum}` });
//     }

//     // Fetch student names
//     const prns = records.map((r) => r.prn);
//     const students = await StudentMaster.find({ prn: { $in: prns } }).lean();
//     const studentMap = {};
//     students.forEach((s) => {
//       studentMap[s.prn] = s.name;
//     });

//     let totalStudents = records.length;
//     let totalPassed = 0;
//     let totalFailed = 0;

//     let studentsList = [];
//     let subjectStats = {};

//     records.forEach((record) => {
//       const studentName = studentMap[record.prn] || "Unknown";
//       const sgpi = parseFloat(record.sgpi) || 0;

//       const isPassed =
//         record.finalResult && record.finalResult.trim().toUpperCase() === "P";
//       if (isPassed) totalPassed++;
//       else totalFailed++;

//       studentsList.push({
//         prn: record.prn,
//         seatNo: record.seatNo,
//         name: studentName,
//         sgpi: sgpi,
//         result: record.finalResult || "N/A",
//         totalMarks: record.totalMarks || 0,
//       });

//       // Process Subject-wise marks (NO FILTER - GRAB EVERYTHING)
//       if (record.subjects) {
//         Object.entries(record.subjects).forEach(([subKey, markValue]) => {
//           let mark = NaN;

//           if (typeof markValue === "object" && markValue !== null) {
//             mark = parseFloat(markValue.totalMarks || markValue.marks || 0);
//           } else {
//             const match = String(markValue).match(/(\d+(\.\d+)?)/);
//             if (match) {
//               mark = parseFloat(match[0]);
//             }
//           }

//           // If there is no number found, skip this column entirely
//           if (isNaN(mark)) return;

//           if (!subjectStats[subKey]) {
//             subjectStats[subKey] = {
//               subjectName: subKey,
//               allScorers: [],
//               appeared: 0,
//               passed: 0,
//             };
//           }

//           subjectStats[subKey].appeared++;

//           if (mark >= 40) {
//             subjectStats[subKey].passed++;
//           }

//           subjectStats[subKey].allScorers.push({
//             name: studentName,
//             marks: mark,
//           });
//         });
//       }
//     });

//     // Sort overall students
//     studentsList.sort((a, b) => b.sgpi - a.sgpi);
//     const topOverall = studentsList.slice(0, 3).map((s, index) => ({
//       rank: index + 1,
//       name: s.name,
//       sgpi: s.sgpi,
//     }));

//     // Sort subject marks and extract Top 3 per subject
//     const subjectAnalysis = Object.values(subjectStats).map((stat) => {
//       const sortedScorers = stat.allScorers.sort((a, b) => b.marks - a.marks);
//       const top3Scorers = sortedScorers.slice(0, 3);

//       return {
//         subject: stat.subjectName,
//         topScorers: top3Scorers,
//         passPercentage:
//           stat.appeared > 0
//             ? ((stat.passed / stat.appeared) * 100).toFixed(2)
//             : 0,
//       };
//     });

//     const passPercentage =
//       totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(2) : 0;

//     res.status(200).json({
//       success: true,
//       analysis: {
//         semester: semNum,
//         overall: { totalStudents, totalPassed, totalFailed, passPercentage },
//         topOverall,
//         subjectAnalysis,
//       },
//       studentsList,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

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
  getSem4Students, // Safely exported
  getSem5Students, // Safely exported
  getSem6Students, // Safely exported
  getSem7Students,
  getSemAnalysis,
  analyzeSem3CsvDirectly,
  // getSem7Analysis,
};
