const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");
const { extractSem1 } = require("../utils/isolated/sem1Processor");
const { extractSem2 } = require("../utils/isolated/sem2Processor");
const CollegeStudentDetails = require("../models/CollegeStudentDetails");

const handleIsolatedExtraction = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File required" });
    }

    const { semester } = req.body;

    // ================================
    // Fetch all valid PRNs
    // ================================
    const collegeStudents = await CollegeStudentDetails.find({}, "prn").lean();

    const validPrns = new Set(
      collegeStudents
        .map((student) => student.prn?.toString().trim())
        .filter(Boolean),
    );

    // ================================
    // Extract PDF
    // ================================
    let extractedData;

    if (semester === "1") {
      extractedData = await extractSem1(req.file.buffer);
    } else if (semester === "2") {
      extractedData = await extractSem2(req.file.buffer);
    } else {
      return res.status(400).json({
        error: "Invalid semester selected",
      });
    }

    const report = {
      saved: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const semKey = `Sem${semester}`;

    // ================================
    // Save only students present in CollegeStudentDetails
    // ================================
    for (const item of extractedData) {
      try {
        const prn = item.studentMaster.prn?.toString().trim();

        // Skip students not present in CollegeStudentDetails
        if (!validPrns.has(prn)) {
          report.skipped++;
          continue;
        }

        // 1. Update StudentMaster
        await StudentMaster.findOneAndUpdate(
          { prn },
          {
            $set: item.studentMaster,
          },
          {
            upsert: true,
            new: true,
          },
        );

        // 2. Update AcademicRecord
        await AcademicRecord.findOneAndUpdate(
          {
            prn,
            semester: Number(semester),
          },
          {
            $set: {
              seatNo: item.academicRecord.seatNo,
              sgpi: item.academicRecord.sgpi,
              totalMarks: item.academicRecord.totalMarks,
              finalResult: item.academicRecord.finalResult,
              isKT: item.academicRecord.isKT,
              subjects: item.academicRecord.subjects,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
          },
        );

        // 3. Update CollegeStudentDetails semester status
        await CollegeStudentDetails.findOneAndUpdate(
          { prn },
          {
            $set: {
              [semKey]: true,
            },
          },
        );

        report.saved++;
      } catch (dbError) {
        report.failed++;
        report.errors.push(`PRN ${item.studentMaster.prn}: ${dbError.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      data: extractedData,
      message: `Processed ${extractedData.length} records. Saved: ${report.saved}, Skipped: ${report.skipped}, Failed: ${report.failed}`,
      saveReport: report,
    });
  } catch (error) {
    console.error("Extraction/Save Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = { handleIsolatedExtraction };
