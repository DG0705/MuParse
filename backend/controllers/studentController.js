// import Papa from 'papaparse';

// // Import All Semester Models
// import StudentMaster from '../models/StudentMaster.js';
// import Semester1 from '../models/Semester1.js';
// import Semester2 from '../models/Semester2.js';
// import Semester3 from '../models/Semester3.js';
// import Semester4 from '../models/Semester4.js'; //
// import Semester5 from '../models/Semester5.js'; //
// import Semester6 from '../models/Semester6.js'; //
// import Semester7 from '../models/Semester7.js';
// import Semester8 from '../models/Semester8.js'; //

// // Map semester numbers to their Models
// const SEMESTER_MODELS = {
//   1: Semester1,
//   2: Semester2,
//   3: Semester3,
//   4: Semester4,
//   5: Semester5,
//   6: Semester6,
//   7: Semester7,
//   8: Semester8
// };

// // 1. Upload CSV and Store Data
// export const uploadCsvData = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    
//     const { semester } = req.body;
//     const semNum = Number(semester);

//     if (!semNum || !SEMESTER_MODELS[semNum]) {
//       return res.status(400).json({ message: `Invalid or unsupported semester: ${semester}` });
//     }

//     // Select the correct Model based on the semester
//     const TargetModel = SEMESTER_MODELS[semNum];

//     const csvString = req.file.buffer.toString();
//     const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

//     if (!data || data.length === 0) {
//         return res.status(400).json({ message: "CSV file is empty." });
//     }

//     const masterOps = [];
//     const semesterOps = [];

//     data.forEach((s) => {
//       // Flexible key matching
//       const seatKey = Object.keys(s).find(k => k.trim() === "Seat No" || k.trim() === "Seat_No");
//       const prnKey = Object.keys(s).find(k => k.trim() === "PRN");
      
//       const rawSeat = seatKey ? s[seatKey] : "";
//       const rawPRN = prnKey ? s[prnKey] : "";

//       const cleanSeatNo = rawSeat.toString().replace(/[^0-9]/g, "");
//       const cleanPRN = rawPRN.toString().replace(/[^0-9]/g, "");

//       if (!cleanSeatNo) return; // Skip if no Seat No

//       // Master Data Updates
//       masterOps.push({
//         updateOne: {
//           filter: { prn: cleanPRN || `UNKNOWN_${cleanSeatNo}` }, // Fallback if PRN missing
//           update: {
//             $set: {
//               name: s["Name"] || "Unknown",
//               gender: s["Gender"] || "",
//               motherName: s["Mother Name"] || "",
//               status: s["Status"] || "Regular" 
//             }
//           },
//           upsert: true,
//         },
//       });

//       // Semester Specific Data Updates
//       semesterOps.push({
//         updateOne: {
//           filter: { seatNo: cleanSeatNo },
//           update: {
//             $set: {
//               prn: cleanPRN,
//               name: s["Name"] || "Unknown",
//               semester: semNum,
//               results: {
//                 sgpi: s["SGPI"] || s["SGPA"] || "0",
//                 totalMarks: s["Total Marks"] || "0",
//                 finalResult: s["Result"] || s["Final Result"] || "N/A"
//               },
//               subjects: s // Stores the subject marks
//             }
//           },
//           upsert: true,
//         },
//       });
//     });

//     if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    
//     // Write to the specific Semester Table
//     const result = await TargetModel.bulkWrite(semesterOps);

//     res.status(200).json({ 
//       success: true, 
//       message: `Processed ${data.length} records for Semester ${semNum}.`,
//       upserted: result.upsertedCount,
//       modified: result.modifiedCount 
//     });
//   } catch (error) {
//     console.error("Upload Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// // 2. Get Students (Dynamic Fetch)
// export const getStudents = async (req, res) => {
//   try {
//     const { semester } = req.query;
//     const semNum = Number(semester);
    
//     if (!semNum || !SEMESTER_MODELS[semNum]) {
//       return res.status(400).json({ message: "Invalid semester." });
//     }

//     const TargetModel = SEMESTER_MODELS[semNum];
//     const students = await TargetModel.find({});
//     res.status(200).json(students);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// }





// // backend/controllers/studentController.js

// export const getStudentHistory = async (req, res) => {
//   try {
//     const { prn: query } = req.params; 

//     if (!query) {
//       return res.status(400).json({ message: "Search query is required" });
//     }

//     // 1. Try to find EXACT match by PRN
//     let studentProfile = await StudentMaster.findOne({ prn: query });
//     let isMultiple = false;
//     let multipleMatches = [];

//     // 2. If no PRN match, search by NAME
//     if (!studentProfile) {
//       // Find ALL students matching the name (Case Insensitive)
//       const students = await StudentMaster.find({
//         name: { $regex: query, $options: "i" } 
//       });

//       if (students.length === 0) {
//         return res.status(404).json({ message: "No student found" });
//       }

//       if (students.length === 1) {
//         // Only one Aditya found, proceed as usual
//         studentProfile = students[0];
//       } else {
//         // Multiple Adityas found! Return the list
//         return res.status(200).json({
//           type: "multiple", // Flag to tell frontend to show a list
//           count: students.length,
//           students: students.map(s => ({
//             name: s.name,
//             prn: s.prn,
//             category: s.category
//           }))
//         });
//       }
//     }

//     // 3. If we are here, we have a SINGLE student (either from PRN or unique Name)
//     // Fetch their full academic history...
//     const targetPrn = studentProfile.prn; 
//     const history = {};
//     let ktCount = 0;
    
//     for (const [semNum, Model] of Object.entries(SEMESTER_MODELS)) {
//       const records = await Model.find({ prn: targetPrn });

//       if (records.length > 0) {
//         history[`Semester ${semNum}`] = records.map(record => {
//           const isFail = record.results.finalResult.toLowerCase().includes('fail') || 
//                          record.results.finalResult.toLowerCase().includes('kt') ||
//                          record.results.finalResult.toLowerCase().includes('unsuccessful');
          
//           if (isFail) ktCount++;

//           return {
//             seatNo: record.seatNo,
//             sgpi: record.results.sgpi,
//             totalMarks: record.results.totalMarks,
//             result: record.results.finalResult,
//             hasKT: isFail,
//             subjects: record.subjects
//           };
//         });
//       }
//     }

//     // Return Single Student Data
//     res.status(200).json({
//       type: "single",
//       profile: {
//         name: studentProfile.name,
//         prn: studentProfile.prn,
//         category: studentProfile.category
//       },
//       academicHistory: history,
//       summary: {
//         totalSemestersAppeared: Object.keys(history).length,
//         activeKTs: ktCount > 0 ? "Yes" : "No",
//         ktCount: ktCount
//       }
//     });

//   } catch (error) {
//     console.error("Fetch History Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };







import Papa from 'papaparse';

// Import All Semester Models
import StudentMaster from '../models/StudentMaster.js';
import Semester1 from '../models/Semester1.js';
import Semester2 from '../models/Semester2.js';
import Semester3 from '../models/Semester3.js';
import Semester4 from '../models/Semester4.js';
import Semester5 from '../models/Semester5.js';
import Semester6 from '../models/Semester6.js';
import Semester7 from '../models/Semester7.js';
import Semester8 from '../models/Semester8.js';

// Map semester numbers to their Models
const SEMESTER_MODELS = {
  1: Semester1,
  2: Semester2,
  3: Semester3,
  4: Semester4,
  5: Semester5,
  6: Semester6,
  7: Semester7,
  8: Semester8
};

// 1. Upload CSV and Store Data
export const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    
    const { semester } = req.body;
    const semNum = Number(semester);

    if (!semNum || !SEMESTER_MODELS[semNum]) {
      return res.status(400).json({ message: `Invalid or unsupported semester: ${semester}` });
    }

    const TargetModel = SEMESTER_MODELS[semNum];
    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    if (!data || data.length === 0) {
        return res.status(400).json({ message: "CSV file is empty." });
    }

    const masterOps = [];
    const semesterOps = [];

    data.forEach((s) => {
      // Flexible key matching
      const seatKey = Object.keys(s).find(k => k.trim() === "Seat No" || k.trim() === "Seat_No");
      const prnKey = Object.keys(s).find(k => k.trim() === "PRN");
      
      const rawSeat = seatKey ? s[seatKey] : "";
      const rawPRN = prnKey ? s[prnKey] : "";

      const cleanSeatNo = rawSeat.toString().replace(/[^0-9]/g, "");
      const cleanPRN = rawPRN.toString().replace(/[^0-9]/g, "");

      if (!cleanSeatNo) return; 

      // Extract the first 4 digits for Batch
      const batchYear = cleanPRN ? cleanPRN.substring(0, 4) : null;

      // Master Data Updates
      masterOps.push({
        updateOne: {
          filter: { prn: cleanPRN || `UNKNOWN_${cleanSeatNo}` },
          update: {
            $set: {
              name: s["Name"] || "Unknown",
              batch: batchYear, // Added batch column storage
              gender: s["Gender"] || "",
              motherName: s["Mother Name"] || "",
              status: s["Status"] || "Regular" 
            }
          },
          upsert: true,
        },
      });

      // Semester Specific Data Updates
      semesterOps.push({
        updateOne: {
          filter: { seatNo: cleanSeatNo },
          update: {
            $set: {
              prn: cleanPRN,
              name: s["Name"] || "Unknown",
              semester: semNum,
              results: {
                sgpi: s["SGPI"] || s["SGPA"] || "0",
                totalMarks: s["Total Marks"] || "0",
                finalResult: s["Result"] || s["Final Result"] || "N/A"
              },
              subjects: s 
            }
          },
          upsert: true,
        },
      });
    });

    if (masterOps.length > 0) await StudentMaster.bulkWrite(masterOps);
    const result = await TargetModel.bulkWrite(semesterOps);

    res.status(200).json({ 
      success: true, 
      message: `Processed ${data.length} records for Semester ${semNum}.`,
      upserted: result.upsertedCount,
      modified: result.modifiedCount 
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2. Get Students (List for specific semester)
export const getStudents = async (req, res) => {
  try {
    const { semester } = req.query;
    const semNum = Number(semester);
    
    if (!semNum || !SEMESTER_MODELS[semNum]) {
      return res.status(400).json({ message: "Invalid semester." });
    }

    const TargetModel = SEMESTER_MODELS[semNum];
    const students = await TargetModel.find({});
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Get Full Student History by PRN or Name
export const getStudentHistory = async (req, res) => {
  try {
    const { prn: query } = req.params; 

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Try to find EXACT match by PRN
    let studentProfile = await StudentMaster.findOne({ prn: query });

    // If no PRN match, search by NAME
    if (!studentProfile) {
      const students = await StudentMaster.find({
        name: { $regex: query, $options: "i" } 
      });

      if (students.length === 0) {
        return res.status(404).json({ message: "No student found" });
      }

      if (students.length === 1) {
        studentProfile = students[0];
      } else {
        // Return multiple matches for selection on Frontend
        return res.status(200).json({
          type: "multiple",
          count: students.length,
          students: students.map(s => ({
            name: s.name,
            prn: s.prn,
            category: s.category
          }))
        });
      }
    }

    // Use the verified PRN to get marks across all 8 semesters
    const targetPrn = studentProfile.prn; 
    const history = {};
    let ktCount = 0;
    
    for (const [semNum, Model] of Object.entries(SEMESTER_MODELS)) {
      const records = await Model.find({ prn: targetPrn });

      if (records.length > 0) {
        history[`Semester ${semNum}`] = records.map(record => {
          const isFail = record.results.finalResult.toLowerCase().includes('fail') || 
                         record.results.finalResult.toLowerCase().includes('kt') ||
                         record.results.finalResult.toLowerCase().includes('unsuccessful');
          
          if (isFail) ktCount++;

          return {
            seatNo: record.seatNo,
            sgpi: record.results.sgpi,
            totalMarks: record.results.totalMarks,
            result: record.results.finalResult,
            hasKT: isFail,
            subjects: record.subjects
          };
        });
      }
    }

    res.status(200).json({
      type: "single",
      profile: {
        name: studentProfile.name,
        prn: studentProfile.prn,
        category: studentProfile.category
      },
      academicHistory: history,
      summary: {
        totalSemestersAppeared: Object.keys(history).length,
        activeKTs: ktCount > 0 ? "Yes" : "No",
        ktCount: ktCount
      }
    });

  } catch (error) {
    console.error("Fetch History Error:", error);
    res.status(500).json({ message: error.message });
  }
};






// Add this to backend/controllers/studentController.js

// 4. Get All Students by Batch
export const getStudentsByBatch = async (req, res) => {
  try {
    const { batch } = req.params;

    if (!batch) {
      return res.status(400).json({ message: "Batch year is required" });
    }

    // Find all students matching the 4-digit batch (e.g., "2023")
    const students = await StudentMaster.find({ batch: batch }).sort({ name: 1 });

    if (students.length === 0) {
      return res.status(404).json({ message: `No students found for batch ${batch}` });
    }

    res.status(200).json({
      count: students.length,
      batch: batch,
      students: students.map(s => ({
        name: s.name,
        prn: s.prn,
        batch: s.batch,
        category: s.category
      }))
    });
  } catch (error) {
    console.error("Batch Search Error:", error);
    res.status(500).json({ message: error.message });
  }
};