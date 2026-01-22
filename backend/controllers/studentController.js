import Student from '../models/student.js';
import Papa from 'papaparse';

// 1. Upload CSV and Store Data
export const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    
    // Ensure semester is passed from frontend
    const { semester } = req.body;
    if (!semester) return res.status(400).json({ message: "Provide a semester number." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    if (!data || data.length === 0) {
        return res.status(400).json({ message: "CSV file is empty or invalid." });
    }

    // Bulk Write for efficiency
    const bulkOps = data.map((s) => {
      // Extract SeatNo and PRN safely
      const cleanSeatNo = (s["Seat No"] || s["Seat_No"] || "").toString().replace(/[^0-9]/g, "");
      const cleanPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");

      if (!cleanSeatNo) return null; // Skip invalid rows

      // Normalize common fields
      const finalResult = s["Result"] || s["Final Result"] || "N/A";
      const sgpiValue = s["SGPI"] || s["SGPA"] || "0";
      const totalMarks = s["Total Marks"] || s["Total_Marks"] || s["Grand_Total"] || "0";

      return {
        updateOne: {
          filter: { seatNo: cleanSeatNo, semester: Number(semester) },
          update: {
            $set: {
              name: s["Name"] || "Unknown",
              prn: cleanPRN,
              semester: Number(semester),
              results: {
                sgpi: sgpiValue,
                totalMarks: totalMarks,
                finalResult: finalResult
              },
              // Store all CSV columns (subjects) for analysis
              subjects: s 
            }
          },
          upsert: true,
        },
      };
    }).filter(op => op !== null);

    const result = await Student.bulkWrite(bulkOps);
    res.status(200).json({ 
      success: true, 
      message: `Processed ${data.length} records.`,
      upserted: result.upsertedCount,
      modified: result.modifiedCount 
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2. Get Raw Students List
export const getStudents = async (req, res) => {
  try {
    const { semester } = req.query;
    const query = semester ? { semester: Number(semester) } : {};
    const students = await Student.find(query);
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. New: Get Analysis (Stats, Toppers, Charts)
export const getStudentAnalysis = async (req, res) => {
  try {
    const { semester } = req.query;
    if (!semester) return res.status(400).json({ message: "Semester is required for analysis." });

    // Fetch as plain JS objects for performance
    const students = await Student.find({ semester: Number(semester) }).lean();

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
      "semester", "results", "_id", "createdAt", "updatedAt", "__v", "subjects"
    ]);

    students.forEach(student => {
      // 1. Pass/Fail Distribution
      const resStatus = student.results.finalResult || "Unknown";
      // Simple normalization (e.g. "Successful" -> "Passed")
      const cleanStatus = resStatus.includes("Successful") || resStatus === "P" ? "Passed" : "Failed/KT";
      resultDistribution[cleanStatus] = (resultDistribution[cleanStatus] || 0) + 1;

      // 2. Average SGPI
      const sgpi = parseNum(student.results.sgpi);
      if (sgpi > 0) {
        totalSGPI += sgpi;
        sgpiCount++;
      }

      // 3. Subject Stats (Dynamic)
      if (student.subjects) {
        Object.entries(student.subjects).forEach(([key, val]) => {
          // Identify subject columns: exclude standard keys and internal grades
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

    // 4. Calculate Top 5 Toppers
    const toppers = students
      .map(s => ({
        name: s.name,
        seatNo: s.seatNo,
        sgpi: parseNum(s.results.sgpi),
        total: s.results.totalMarks
      }))
      .sort((a, b) => b.sgpi - a.sgpi)
      .slice(0, 5);

    // 5. Format Subject Analysis
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