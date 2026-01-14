import Student from '../models/student.js';
import Papa from 'papaparse';

export const uploadCsvData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload a CSV file." });
    const { semester } = req.body;
    if (!semester) return res.status(400).json({ message: "Provide a semester number." });

    const csvString = req.file.buffer.toString();
    const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });

    const bulkOps = data.map((s) => {
      // 1. Extract and clean IDs from Excel formatting
      // Matches "=""1055187""" or standard "1055187"
      const cleanSeatNo = (s["Seat No"] || s["Seat_No"] || "").toString().replace(/[^0-9]/g, "");
      const cleanPRN = (s["PRN"] || "").toString().replace(/[^0-9]/g, "");

      // 2. Map Result and Total Marks based on your CSV headers
      const finalResult = s["Result"] || s["Final Result"] || "N/A";
      const sgpiValue = s["SGPI"] || s["SGPA"] || "0";
      
      // Total Marks can be under "Total Marks", "Total", or "Total_CxG" depending on the Sem
      const totalMarks = s["Total Marks"] || s["Total_Marks"] || s["Total_CxG"] || s["Grand_Total"] || "0";

      return {
        updateOne: {
          filter: { seatNo: cleanSeatNo },
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
              // 3. This saves EVERY column from the CSV (Subjects, Grades, etc.)
              subjects: s 
            }
          },
          upsert: true,
        },
      };
    });

    const result = await Student.bulkWrite(bulkOps);
    res.status(200).json({ 
      success: true, 
      message: `Processed ${data.length} records`,
      upserted: result.upsertedCount,
      modified: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};