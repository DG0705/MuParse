const pdf = require("pdf-parse"); // ⚠️ use v1.1.1

const extractSem2 = async (buffer) => {
  try {
    const data = await pdf(buffer);
    const text = data.text;

    // ================= CLEANING =================
    const headerPattern =
      /University of Mumbai, Mumbai[\s\S]+?Paper12\nPaper13\nTotal\nTotal\nCR\nGR\nGP\nC\*G\nCR\nGR\nGP\nC\*G/g;

    const footerPattern = /\/ - FEMALE, # - 0\.229A[\s\S]+?10\.00\s+/g;

    const noLabelPattern = /^NO$/gm;

    let cleanedText = text
      .replace(headerPattern, "")
      .replace(footerPattern, "")
      .replace(noLabelPattern, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // ================= SPLIT =================
    const blocks = cleanedText
      .split(/(?=\b\d{7}\b)/g)
      .filter((b) => b.trim() !== "");

    // ================= SEQUENTIAL =================
    const sequentialData = blocks
      .map((block) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 110) {
          console.warn("⚠️ Skipped block:", lines[0]);
          return null;
        }

        return {
          seatNo: lines[0],
          name: lines[1],
          motherName: lines[8],
          prn: lines[26],
          college: lines[49],

          resultStatus: lines[7],
          sgpa: lines[47],
          grade: lines[48],
          totalCredits: lines[116],
          finalCgpa: lines[117],
          finalGrade: lines[118],

          raw: lines, // 🔥 full access
        };
      })
      .filter(Boolean);

    // ================= GROUPED =================
    const groupedData = sequentialData.map((s) => {
      const subjects = {};

      for (let i = 1; i <= 13; i++) {
        const marks = [
          s.raw[8 + i * 3], // approx mapping preserved
          s.raw[9 + i * 3],
          s.raw[10 + i * 3],
        ];

        // extra marks for paper 8 & 10
        if (i === 8 || i === 10) {
          marks.push(s.raw[74], s.raw[75], s.raw[76]);
        }

        subjects[`paper${i}`] = {
          code: s.raw[i + 1],
          marks: marks.filter(Boolean),
          cr: s.raw[26 + i * 4 + 1],
          gr: s.raw[26 + i * 4 + 2],
          gp: s.raw[26 + i * 4 + 3],
          cxG: s.raw[26 + i * 4 + 4],
        };
      }

      return {
        studentInfo: {
          seatNo: s.seatNo,
          name: s.name,
          motherName: s.motherName,
          prn: s.prn,
          college: s.college,
        },
        academicSummary: {
          status: s.resultStatus,
          sgpa: s.sgpa,
          grade: s.grade,
          totalCredits: s.totalCredits,
          cgpa: s.finalCgpa,
          finalGrade: s.finalGrade,
        },
        subjects,
      };
    });

    return groupedData;
  } catch (err) {
    console.error("Sem2 Extraction Error:", err.message);
    throw err;
  }
};

module.exports = { extractSem2 };
