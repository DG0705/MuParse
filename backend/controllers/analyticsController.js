// const AcademicRecord = require('../models/AcademicRecord');

const AcademicRecord = require("../models/AcademicRecord");

// // --- THE DYNAMIC SEMESTER DICTIONARY ---
// // You can expand this for all 8 semesters based on your college's syllabus!
// const semesterSubjectMap = {
//    "1": {
//         "paper1code": "Engineering Mathematics - I",
//         "paper2code": "Engineering Mathematics - I (TW)",
//         "paper3code": "Engineering Physics - I",
//         "paper4code": "Engineering Physics - I (TW)",
//         "paper5code": "Engineering Chemistry - I",
//         "paper6code": "Engineering Chemistry - I (TW)",
//         "paper7code": "Engineering Mechanics",
//         "paper8code": "Engineering Mechanics (TW/OR)",
//         "paper9code": "Basic Electrical Engineering",
//         "paper10code": "Basic Electrical Engineering (TW/OR)",
//         "paper11code": "Basic Workshop Practice - I"
//     },
//     "2": {
//         "paper1code": "Engineering Mathematics - II",
//         "paper2code": "Engineering Mathematics - II (TW)",
//         "paper3code": "Engineering Physics - II",
//         "paper4code": "Engineering Physics - II (TW)",
//         "paper5code": "Engineering Chemistry - II",
//         "paper6code": "Engineering Chemistry - II (TW)",
//         "paper7code": "Engineering Graphics",
//         "paper8code": "Engineering Graphics (TW/Orl)",
//         "paper9code": "C Programming",
//         "paper10code": "C Programming (TW/Orl)",
//         "paper11code": "Professional Comm. & Ethics - I",
//         "paper12code": "Professional Comm. & Ethics - I (TW)",
//         "paper13code": "Basic Workshop Practice - II"
//     },
//     "3": {
//         "paper1code": "Engineering Math - III",
//         "paper2code": "Data Structures And Analysis",
//         "paper3code": "Database Management Systems",
//         "paper3code": "Database Management Systems",
//         "paper4code": "Professional Communication",
//         "paper5code": "Paradigms And Computer programming fundamentals",
//         "paper6code": "SQL Lab",
//         "paper7code": "Computer Programming Paradigms Lab",
//         "paper8code": "Java Lab",
//         "paper9code": "Mini Project using Java",
//         // add sem 3 subjects...
//     },
//     "4": {
//         "paper1code": "Engineering Mathematics - IV",
//         "paper2code": "Computer Network Design",
//         "paper3code": "Operating System",
//         "paper4code": "Automata Theory",
//         "paper5code": "Computer Org & Architecture",
//         "paper6code": "Network Lab",
//         "paper7code": "Unix Lab",
//         "paper8code": "Microprocessor Lab",
//         "paper9code": "Python Lab (SBL)",
//         "paper10code": "Mini Project-1 B"
//     },

//     "5": {
//         "paper1code": "Internet Programming",
//         "paper2code": "Computer Network Security",
//         "paper3code": "Entrepreneurship & E-business",
//         "paper4code": "Software Engineering",
//         "paper5code": "Advanced Data Structures (ADSA)", // This is the elective!
//         "paper6code": "IP Lab",
//         "paper7code": "Security Lab",
//         "paper8code": "DevOPS Lab",
//         "paper9code": "Advance DevOPS Lab",
//         "paper10code": "PCE-II",
//         "paper11code": "Mini Project-2A"
//     },
//    "6": {
//         "paper1code": "Data Mining & Business Intelligence",
//         "paper2code": "Web X.0",
//         "paper3code": "Wireless Technology",
//         "paper4code": "AI and DS-1",
//         "paper5code": "Professional Elective - II", // <-- This safely covers BOTH Green IT and EHF!
//         "paper6code": "BI Lab",
//         "paper7code": "Web Lab",
//         "paper8code": "Sensor Lab",
//         "paper9code": "MAD and PWA Lab",
//         "paper10code": "DS using Python Lab (SBL)",
//         "paper11code": "Mini Project-2B"
//     },
//     "7": {
//         "paper1code": "AI and Data Science - II",
//         "paper2code": "Internet of Everything",
//         "paper3code": "Professional Elective - III", // Groups Infrastructure Security, Software Testing, etc.
//         "paper4code": "Institute Level Elective - I", // Groups MIS, Operation Research, Cyber Security, etc.
//         "paper5code": "Professional Elective - IV", // Groups Info Retrieval System, AR/VR, etc.
//         "paper6code": "Data Science Lab",
//         "paper7code": "IOE Lab",
//         "paper8code": "Secure App Dev Lab",
//         "paper9code": "Open Source Project Lab",
//         "paper10code": "Major Project - I"
//     },
//     "8": {
//         "paper1code": "Blockchain and DLT",
//         "paper2code": "Professional Elective - V", // Groups Big Data Analytics, ERP, etc.
//         "paper3code": "Institute Level Elective - II", // Groups Project Management, etc.
//         "paper4code": "Blockchain Lab",
//         "paper5code": "Cloud Computing Lab",
//         "paper6code": "Major Project - II"
//     }

//     // Add "4", "5", "6", "7", "8" as needed...
// };

// exports.getBatchAnalytics = async (req, res) => {
//     try {
//         // 1. Grab the requested semester from the URL (e.g., ?semester=6)
//         const requestedSemester = req.query.semester;

//         let records = await AcademicRecord.find({});

//         if (!records || records.length === 0) {
//             return res.status(404).json({ success: false, message: "No records found." });
//         }

//         // 2. THE FILTER LOGIC: If they picked a specific semester, filter the database!
//         if (requestedSemester && requestedSemester !== 'All') {
//             records = records.filter(record => {
//                 let semString = record.semester ? String(record.semester).replace(/\D/g, '') : "Unknown";
//                 return semString === requestedSemester;
//             });
//         }
//         let totalStudents = new Set();
//         let personas = { "Consistent Performer": 0, "Mid-Tier / Struggling": 0, "Critical Attention Needed": 0 };
//         let subjectFailures = {};
//         let atRiskStudentsList = [];

//         records.forEach(record => {
//             totalStudents.add(record.prn);
//             let sgpi = parseFloat(record.sgpi) || 0;

//             // Extract the semester from the DB record (Convert to string to match our dictionary keys)
//             let semString = record.semester ? record.semester.toString().replace(/\D/g, '') : "Unknown";

//             // Group by AI Personas
//             if (sgpi >= 7.0) {
//                 personas["Consistent Performer"]++;
//             } else if (sgpi >= 4.0 && sgpi < 7.0) {
//                 personas["Mid-Tier / Struggling"]++;
//             } else {
//                 personas["Critical Attention Needed"]++;
//                 atRiskStudentsList.push({ prn: record.prn, sgpi: sgpi, status: "High KT Risk" });
//             }

//             // Track Subject Bottlenecks
//             if (record.subjects) {
//                 record.subjects.forEach((marks, subjectCode) => {
//                     const markStr = marks.toString().toUpperCase();
//                     if (markStr.includes('F') || markStr === '0' || markStr.includes('AB')) {

//                         // NEW LOGIC: Check the semester map first!
//                         let readableName = subjectCode; // Default to paper2code if not found

//                         if (semesterSubjectMap[semString] && semesterSubjectMap[semString][subjectCode]) {
//                             readableName = semesterSubjectMap[semString][subjectCode];
//                         }

//                         // To avoid overlapping names from different semesters, optionally add the sem to the name:
//                         // readableName = `${readableName} (Sem ${semString})`;

//                         subjectFailures[readableName] = (subjectFailures[readableName] || 0) + 1;
//                     }
//                 });
//             }
//         });

//         const personaChartData = Object.keys(personas).map(key => ({
//             name: key, value: personas[key],
//             fill: key === "Consistent Performer" ? "#10b981" : key === "Mid-Tier / Struggling" ? "#f59e0b" : "#ef4444"
//         }));

//         const bottleneckChartData = Object.keys(subjectFailures)
//             .map(key => ({ subject: key, KTs: subjectFailures[key] }))
//             .sort((a, b) => b.KTs - a.KTs)
//             .slice(0, 20); // Only show the Top 20 worst subjects

//         res.status(200).json({
//             success: true,
//             data: {
//                 totalStudents: totalStudents.size,
//                 personaDistribution: personaChartData,
//                 bottlenecks: bottleneckChartData,
//                 atRiskExport: atRiskStudentsList
//             }
//         });

//     } catch (error) {
//         console.error("Analytics Error:", error.message);
//         res.status(500).json({ success: false, message: "Failed to generate analytics." });
//     }
// };

// const AcademicRecord = require("../models/AcademicRecord");

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

exports.getBatchAnalytics = async (req, res) => {
  try {
    const requestedSemester = req.query.semester;

    let records = await AcademicRecord.find({});

    if (!records || records.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No records found." });
    }

    // --- SAFE FILTER LOGIC ---
    if (requestedSemester && requestedSemester !== "All") {
      records = records.filter((record) => {
        let semString = record.semester
          ? String(record.semester).replace(/\D/g, "")
          : "Unknown";
        return semString === String(requestedSemester); // Forces safe string comparison!
      });
    }

    // If filtering results in 0 students (e.g. no Sem 8 data uploaded yet), don't crash!
    if (records.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalStudents: 0,
          personaDistribution: [],
          bottlenecks: [],
          atRiskExport: [],
        },
      });
    }

    // ... (Keep the filter logic above exactly as it is) ...

    let totalStudents = new Set();
    let personas = {
      "Consistent Performer": 0,
      "Mid-Tier / Struggling": 0,
      "Critical Attention Needed": 0,
    };
    let subjectFailures = {};

    // NEW: We will temporarily store each student's total SGPI here to average it later
    let studentAverages = {};

    // 1. FIRST PASS: Collect the data and find subject bottlenecks
    records.forEach((record) => {
      try {
        totalStudents.add(record.prn);
        let prn = record.prn;
        let sgpi = parseFloat(record.sgpi) || 0;
        let semString = record.semester
          ? String(record.semester).replace(/\D/g, "")
          : "Unknown";

        // Add this semester's SGPI to the student's total pool
        if (!studentAverages[prn]) {
          studentAverages[prn] = { totalSgpi: 0, count: 0 };
        }
        studentAverages[prn].totalSgpi += sgpi;
        studentAverages[prn].count += 1;

        // Track Subject Bottlenecks Safely
        if (record.subjects) {
          record.subjects.forEach((marks, subjectCode) => {
            const markStr = marks ? String(marks).toUpperCase().trim() : "";

            // --- APPLY THE STRICT REGEX HERE TOO ---
            if (/^\d*F$|^AB$|^ABSENT$/i.test(markStr)) {
              let readableName = subjectCode;
              if (
                semesterSubjectMap[semString] &&
                semesterSubjectMap[semString][subjectCode]
              ) {
                readableName = semesterSubjectMap[semString][subjectCode];
              }

              subjectFailures[readableName] =
                (subjectFailures[readableName] || 0) + 1;
            }
          });
        }
      } catch (innerError) {
        console.warn(`Skipped broken record for PRN: ${record.prn}`);
      }
    });

    // 2. SECOND PASS: Calculate Personas based on AVERAGE SGPI per student
    let atRiskStudentsList = [];

    for (const prn in studentAverages) {
      let stats = studentAverages[prn];
      let avgSgpi = stats.totalSgpi / stats.count; // This is where the 0s drag the average down!

      if (avgSgpi >= 7.0) {
        personas["Consistent Performer"]++;
      } else if (avgSgpi >= 4.0 && avgSgpi < 7.0) {
        personas["Mid-Tier / Struggling"]++;
      } else {
        personas["Critical Attention Needed"]++;
        // Save their average SGPI to 2 decimal places for the Excel export
        atRiskStudentsList.push({
          prn: prn,
          sgpi: avgSgpi.toFixed(2),
          status: "High KT Risk",
        });
      }
    }

    const personaChartData = Object.keys(personas).map((key) => ({
      name: key,
      value: personas[key],
      fill:
        key === "Consistent Performer"
          ? "#10b981"
          : key === "Mid-Tier / Struggling"
            ? "#f59e0b"
            : "#ef4444",
    }));

    const bottleneckChartData = Object.keys(subjectFailures)
      .map((key) => ({ subject: key, KTs: subjectFailures[key] }))
      .sort((a, b) => b.KTs - a.KTs)
      .slice(0, 20);

    // ... (Keep the res.status(200) below exactly as it is) ...
    res.status(200).json({
      success: true,
      data: {
        totalStudents: totalStudents.size,
        personaDistribution: personaChartData,
        bottlenecks: bottleneckChartData,
        atRiskExport: atRiskStudentsList,
      },
    });
  } catch (error) {
    console.error("CRITICAL Analytics Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate analytics." });
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
