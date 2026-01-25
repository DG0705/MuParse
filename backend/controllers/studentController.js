// --- CORRECT IMPORTS ---
import Semester1 from '../models/Semester1.js';
import Semester2 from '../models/Semester2.js';
import Semester3 from '../models/Semester3.js';
import Semester4 from '../models/Semester4.js';
import Semester5 from '../models/Semester5.js';
import Semester6 from '../models/Semester6.js';
import Semester7 from '../models/Semester7.js'; // Points to the new file
import Semester8 from '../models/Semester8.js'; // Points to the new file
import StudentMaster from '../models/StudentMaster.js';
import Papa from 'papaparse';

// Helper function to dynamically pick the right model
const getModelForSemester = (sem) => {
  switch (Number(sem)) {
    case 1: return Semester1;
    case 2: return Semester2;
    case 3: return Semester3;
    case 4: return Semester4;
    case 5: return Semester5;
    case 6: return Semester6;
    case 7: return Semester7;
    case 8: return Semester8;
    default: return null;
  }
};

// ... (Rest of your uploadCsvData and other functions remain the same)
export const uploadCsvData = async (req, res) => {
    // ... use getModelForSemester(req.body.semester) here ...
    // ... copy the logic from my previous response ...
    try {
        if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
        
        const { semester } = req.body;
        const CurrentModel = getModelForSemester(semester);
    
        if (!CurrentModel) {
          return res.status(400).json({ message: `Invalid or unsupported semester: ${semester}` });
        }
    
        const csvString = req.file.buffer.toString();
        const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });
    
        const bulkOps = data.map((s) => {
          const cleanSeatNo = (s["Seat No"] || "").toString().replace(/[^0-9]/g, "");
          if (!cleanSeatNo) return null;
    
          const sgpiValue = s["SGPI"] || s["SGPA"] || "0"; 
    
          return {
            updateOne: {
              filter: { seatNo: cleanSeatNo },
              update: {
                $set: {
                  name: s["Name"] || "Unknown",
                  semester: Number(semester),
                  results: {
                    sgpi: sgpiValue,
                    totalMarks: s["Total Marks"] || "0",
                    finalResult: s["Final Result"] || "N/A"
                  },
                  subjects: s 
                }
              },
              upsert: true,
            },
          };
        }).filter(op => op !== null);
    
        const result = await CurrentModel.bulkWrite(bulkOps);
        res.status(200).json({ success: true, message: "Uploaded successfully", result });
        
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
      }
};

export const getStudents = async (req, res) => {
    try {
      const { semester } = req.query;
      const CurrentModel = getModelForSemester(semester);
      
      if (!CurrentModel) return res.status(400).json({ message: "Semester is required" });
  
      const students = await CurrentModel.find({ semester: Number(semester) });
      res.status(200).json(students);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  export const getStudentAnalysis = async (req, res) => {
    try {
      const { semester } = req.query;
      const CurrentModel = getModelForSemester(semester);
  
      if (!CurrentModel) return res.status(400).json({ message: "Semester is required" });
  
      const students = await CurrentModel.find({ semester: Number(semester) }).lean();
      
      // ... (Paste the rest of your analysis logic here, it works the same) ...
      // For brevity, I am not repeating the full analysis logic, but ensure you 
      // paste the logic from the previous turn here.
      
      if (!students.length) {
        return res.status(200).json({ message: "No data found for this semester." });
      }
  
      // --- Helper to parse numbers ---
      const parseNum = (n) => {
        const parsed = parseFloat(n);
        return isNaN(parsed) ? 0 : parsed;
      };
  
      // --- Aggregation Variables ---
      let totalSGPI = 0;
      let sgpiCount = 0;
      const resultDistribution = {};
      const subjectStats = {}; 
  
      // Fields to exclude from "Subject" analysis
      const excludeKeys = new Set([
        "Seat No", "Name", "PRN", "Result", "Final Result", 
        "SGPI", "SGPA", "Total Marks", "Grand_Total", 
        "semester", "results", "_id", "createdAt", "updatedAt", "__v", "subjects",
        "studentId"
      ]);
  
      students.forEach(student => {
        // 1. Pass/Fail Distribution
        const resStatus = student.results.finalResult || "Unknown";
        const cleanStatus = resStatus.includes("Successful") || resStatus === "P" ? "Passed" : "Failed/KT";
        resultDistribution[cleanStatus] = (resultDistribution[cleanStatus] || 0) + 1;
  
        // 2. Average SGPI
        const sgpi = parseNum(student.results.sgpi);
        if (sgpi > 0) {
          totalSGPI += sgpi;
          sgpiCount++;
        }
  
        // 3. Subject Stats
        if (student.subjects) {
          Object.entries(student.subjects).forEach(([key, val]) => {
            if (!excludeKeys.has(key) && !key.includes("Grade") && !key.includes("GP") && !key.includes("C*G")) {
               const marks = parseNum(val);
               if (!subjectStats[key]) subjectStats[key] = { total: 0, count: 0, max: 0 };
               
               if (marks > 0) {
                 subjectStats[key].total += marks;
                 subjectStats[key].count += 1;
                 if (marks > subjectStats[key].max) subjectStats[key].max = marks;
               }
            }
          });
        }
      });
  
      const averageSGPI = sgpiCount > 0 ? (totalSGPI / sgpiCount).toFixed(2) : 0;
  
      // 4. Top 5 Toppers
      const toppers = students
        .map(s => ({
          name: s.name,
          seatNo: s.seatNo,
          sgpi: parseNum(s.results.sgpi),
          total: s.results.totalMarks
        }))
        .sort((a, b) => b.sgpi - a.sgpi)
        .slice(0, 5);
  
      // 5. Subject Analysis
      const subjectAnalysis = Object.entries(subjectStats).map(([subject, data]) => ({
        subject,
        average: data.count > 0 ? (data.total / data.count).toFixed(2) : 0,
        max: data.max
      }));
  
      res.json({
        overview: {
          totalStudents: students.length,
          averageSGPI,
          resultDistribution
        },
        toppers,
        subjectAnalysis
      });
  
    } catch (error) {
      console.error("Analysis Error:", error);
      res.status(500).json({ message: error.message });
    }
  };