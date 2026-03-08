const StudentMaster = require("../models/StudentMaster");
const AcademicRecord = require("../models/AcademicRecord");
const { extractSem1 } = require("../utils/isolated/sem1Processor");
const { extractSem2 } = require("../utils/isolated/sem2Processor");

const handleIsolatedExtraction = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File required" });
    const { semester } = req.body;

    // Use the appropriate processor based on semester
    let extractedData;
    if (semester === "1") {
      extractedData = await extractSem1(req.file.buffer);
    } else if (semester === "2") {
      extractedData = await extractSem2(req.file.buffer);
    } else {
      return res.status(400).json({ error: "Invalid semester selected" });
    }

    const report = { saved: 0, failed: 0, errors: [] };

    // Common sequential save loop for both semesters
    for (const item of extractedData) {
      try {
        const prn = item.studentMaster.prn;

        // 1. Sync Student Identity
        await StudentMaster.findOneAndUpdate(
          { prn: prn },
          { $set: item.studentMaster },
          { upsert: true, new: true },
        );

        // 2. Sync Academic Record
        await AcademicRecord.findOneAndUpdate(
          {
            prn: prn,
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
          { upsert: true, new: true, runValidators: true },
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
      message: `Processed ${extractedData.length} records. Saved: ${report.saved}, Failed: ${report.failed}`,
      saveReport: report,
    });
  } catch (error) {
    console.error("Extraction/Save Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { handleIsolatedExtraction };
