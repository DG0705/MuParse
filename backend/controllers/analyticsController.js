const AcademicRecord = require("../models/AcademicRecord");
const StudentMaster = require("../models/StudentMaster");

// --- THE DYNAMIC SEMESTER DICTIONARY ---
const semesterSubjectMap = {
  1: {
    paper1code: "Engineering Mathematics - I",
    paper2code: "Engineering Mathematics - I (TW)",
    paper3code: "Engineering Physics - I",
    paper4code: "Engineering Physics - I (TW)",
    paper5code: "Engineering Chemistry - I",
    paper6code: "Engineering Chemistry - I (TW)",
    paper7code: "Engineering Mechanics",
    paper8code: "Engineering Mechanics (TW/OR)",
    paper9code: "Basic Electrical Engineering",
    paper10code: "Basic Electrical Engineering (TW/OR)",
    paper11code: "Basic Workshop Practice - I",
  },
  2: {
    paper1code: "Engineering Mathematics - II",
    paper2code: "Engineering Mathematics - II (TW)",
    paper3code: "Engineering Physics - II",
    paper4code: "Engineering Physics - II (TW)",
    paper5code: "Engineering Chemistry - II",
    paper6code: "Engineering Chemistry - II (TW)",
    paper7code: "Engineering Graphics",
    paper8code: "Engineering Graphics (TW/Orl)",
    paper9code: "C Programming",
    paper10code: "C Programming (TW/Orl)",
    paper11code: "Professional Comm. & Ethics - I",
    paper12code: "Professional Comm. & Ethics - I (TW)",
    paper13code: "Basic Workshop Practice - II",
  },
  3: {
    paper1code: "Engineering Math - III",
    paper2code: "Data Structures And Analysis",
    paper3code: "Database Management Systems",
    paper4code: "Professional Communication",
    paper5code: "Paradigms And Computer programming fundamentals",
    paper6code: "SQL Lab",
    paper7code: "Computer Programming Paradigms Lab",
    paper8code: "Java Lab",
    paper9code: "Mini Project using Java",
  },
  4: {
    paper1code: "Engineering Mathematics - IV",
    paper2code: "Computer Network Design",
    paper3code: "Operating System",
    paper4code: "Automata Theory",
    paper5code: "Computer Org & Architecture",
    paper6code: "Network Lab",
    paper7code: "Unix Lab",
    paper8code: "Microprocessor Lab",
    paper9code: "Python Lab (SBL)",
    paper10code: "Mini Project-1 B",
  },
  5: {
    paper1code: "Internet Programming",
    paper2code: "Computer Network Security",
    paper3code: "Entrepreneurship & E-business",
    paper4code: "Software Engineering",
    paper5code: "Advanced Data Structures (ADSA)",
    paper6code: "IP Lab",
    paper7code: "Security Lab",
    paper8code: "DevOPS Lab",
    paper9code: "Advance DevOPS Lab",
    paper10code: "PCE-II",
    paper11code: "Mini Project-2A",
  },
  6: {
    paper1code: "Data Mining & Business Intelligence",
    paper2code: "Web X.0",
    paper3code: "Wireless Technology",
    paper4code: "AI and DS-1",
    paper5code: "Professional Elective - II",
    paper6code: "BI Lab",
    paper7code: "Web Lab",
    paper8code: "Sensor Lab",
    paper9code: "MAD and PWA Lab",
    paper10code: "DS using Python Lab (SBL)",
    paper11code: "Mini Project-2B",
  },
  7: {
    paper1code: "AI and Data Science - II",
    paper2code: "Internet of Everything",
    paper3code: "Professional Elective - III",
    paper4code: "Institute Level Elective - I",
    paper5code: "Professional Elective - IV",
    paper6code: "Data Science Lab",
    paper7code: "IOE Lab",
    paper8code: "Secure App Dev Lab",
    paper9code: "Open Source Project Lab",
    paper10code: "Major Project - I",
  },
  8: {
    paper1code: "Blockchain and DLT",
    paper2code: "Professional Elective - V",
    paper3code: "Institute Level Elective - II",
    paper4code: "Blockchain Lab",
    paper5code: "Cloud Computing Lab",
    paper6code: "Major Project - II",
  },
};


// --- BATCH WISE ANALYSIS CONTROLLER ---
exports.getSemesterAnalysisBatchWise = async (req, res) => {
  try {
    const semester = req.query.semester;
    const batchYear = req.query.batchYear;

    if (!semester) {
        return res.status(400).json({ success: false, message: "Semester is required" });
    }

    // 1. Fetch from StudentMaster to isolate batch
    let masterQuery = {};
    if (batchYear && batchYear !== "All Batches" && batchYear !== "") {
        // Matches either explicit batch like "2021-2025" OR a PRN prefix like "2021..."
        masterQuery = {
            $or: [
                { batch: { $regex: batchYear, $options: "i" } },
                { prn: { $regex: `^${batchYear}` } }
            ]
        };
    }

    let allowedPrns = null;
    if (batchYear && batchYear !== "All Batches" && batchYear !== "") {
        const batchStudents = await StudentMaster.find(masterQuery).select("prn");
        allowedPrns = batchStudents.map(s => s.prn);

        if (allowedPrns.length === 0) {
            return res.status(200).json([]); // Return empty for the frontend if no match
        }
    }

    // 2. Query AcademicRecord specifically for this batch
    let recordQuery = { semester: Number(semester) };
    if (allowedPrns) {
        recordQuery.prn = { $in: allowedPrns };
    }

    const records = await AcademicRecord.find(recordQuery).populate("prn", "name gender batch category");

    // 3. Format the data precisely as the frontend React components expect it
    const formattedData = records.map(record => {
        const studentDetails = record.prn || {}; 
        return {
            seatNo: record.seatNo,
            name: studentDetails.name || "Unknown",
            gender: studentDetails.gender || "Unknown",
            prn: studentDetails.prn || record.prn,
            batch: studentDetails.batch || "Unknown",
            finalResult: record.finalResult,
            sgpi: record.sgpi,
            subjects: record.subjects || {},
            // Wrap to maintain compatibility with existing frontend maps
            results: {
               finalResult: record.finalResult,
               sgpi: record.sgpi
            }
        };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Batch Analysis Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.getGoldenStudents = async (req, res) => {
  try {
    const goldenStudents = await AcademicRecord.aggregate([
      // 1. Filter: Exclude Semester 7 explicitly
      { $match: { semester: { $ne: 7 } } },
      {
        $group: {
          _id: "$prn",
          // Count available semesters (Target is 7: Sems 1, 2, 3, 4, 5, 6, 8)
          semCount: { $sum: 1 },
          // Flag student if ANY of their records fail the 'First-Attempt Clear' criteria
          hasInvalidRecord: {
            $max: {
              $or: [
                { $eq: ["$isKT", true] },
                // ALLOW both "Successful" and "P" as passing results
                { $not: { $in: ["$finalResult", ["Successful", "P"]] } },
                // DISQUALIFY if SGPI is zero, N/A, or missing
                { $in: ["$sgpi", ["0", "0.0", "0.00", "N/A", "-", null]] },
              ],
            },
          },
          // Pivot SGPIs into a dictionary for easier frontend access
          results: {
            $push: {
              k: { $concat: ["sem", { $toString: "$semester" }, "SGPI"] },
              v: {
                $convert: {
                  input: "$sgpi",
                  to: "double",
                  onError: 0.0,
                  onNull: 0.0,
                },
              },
            },
          },
        },
      },
      // 2. THE STRICT FILTER:
      // - Student must have exactly 7 semesters (1-6 and 8)
      // - Student must have ZERO invalid records (no failures, no KTs)
      {
        $match: {
          semCount: 7,
          hasInvalidRecord: false,
        },
      },
      // 3. Join with StudentMaster to retrieve Name and Batch
      {
        $lookup: {
          from: "studentmasters",
          localField: "_id",
          foreignField: "prn",
          as: "details",
        },
      },
      { $unwind: "$details" },
      {
        $project: {
          prn: "$_id",
          name: "$details.name",
          semesterData: { $arrayToObject: "$results" },
        },
      },
      { $sort: { "semesterData.sem8SGPI": -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: goldenStudents.length,
      data: goldenStudents,
    });
  } catch (error) {
    console.error("Strict Golden Filter Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGoldenStudents1 = async (req, res) => {
  try {
    const goldenStudents = await AcademicRecord.aggregate([
      // 1. Exclude Semester 7 as per database constraints
      { $match: { semester: { $ne: 7 } } },
      {
        $group: {
          _id: "$prn",
          semCount: { $sum: 1 },
          // Identify the first semester on record for this student
          firstSem: { $min: "$semester" },
          // Disqualify if any record has isKT: true, non-passing status, or 0.0 SGPI
          hasInvalidRecord: {
            $max: {
              $or: [
                { $eq: ["$isKT", true] },
                { $not: { $in: ["$finalResult", ["Successful", "P"]] } },
                { $in: ["$sgpi", ["0", "0.0", "0.00", "N/A", "-", null]] },
              ],
            },
          },
          results: {
            $push: {
              k: { $concat: ["sem", { $toString: "$semester" }, "SGPI"] },
              v: {
                $convert: {
                  input: "$sgpi",
                  to: "double",
                  onError: 0.0,
                  onNull: 0.0,
                },
              },
            },
          },
        },
      },
      // 2. THE STRICT DUAL-PATH FILTER:
      // Path A (Regular): Started at Sem 1 and has exactly 7 records (1,2,3,4,5,6,8)
      // Path B (DSE): Started at Sem 3 and has exactly 5 records (3,4,5,6,8)
      {
        $match: {
          hasInvalidRecord: false,
          $or: [
            { firstSem: 1, semCount: 7 }, // Regular students
            { firstSem: 3, semCount: 5 }, // DSE students
          ],
        },
      },
      {
        $lookup: {
          from: "studentmasters",
          localField: "_id",
          foreignField: "prn",
          as: "details",
        },
      },
      { $unwind: "$details" },
      {
        $project: {
          prn: "$_id",
          name: "$details.name",
          studentType: {
            $cond: [{ $eq: ["$firstSem", 3] }, "DSE", "Regular"],
          },
          semesterData: { $arrayToObject: "$results" },
        },
      },
      { $sort: { "semesterData.sem8SGPI": -1 } },
    ]);

    res
      .status(200)
      .json({
        success: true,
        count: goldenStudents.length,
        data: goldenStudents,
      });
  } catch (error) {
    console.error("Golden Student Aggregation Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};