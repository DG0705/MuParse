const pdf = require("pdf-parse"); // ⚠️ Ensure version 1.1.1

const extractSem1 = async (buffer) => {
  try {
    const data = await pdf(buffer);
    const text = data.text;

    // ================= CLEANING =================
    const headerPattern =
      /University of Mumbai[\s\S]+?FEL105-Basic Workshop Practice-I: TwCA 50\/20 50\/0(?=SEAT)/g;
    const footerPattern = /\/ - FEMALE, # - 0\.229A[\s\S]+?10\.00\s+/g;
    const noLabelPattern = /^NO$/gm;
    const sequencePattern =
      /SEAT\nNAME OF THE CANDIDATE\nPaper1\nPaper2\nPaper3\nPaper4\nPaper5\nRESULT\nMother Name[\s\S]+?C\*G/g;

    let scrubbedText = text
      .replace(headerPattern, "")
      .replace(footerPattern, "")
      .replace(noLabelPattern, "")
      .replace(sequencePattern, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // ================= SPLIT INTO BLOCKS =================
    const blocks = scrubbedText
      .split(/(?=\b\d{7}\b)/g)
      .filter((b) => b.trim() !== "");

    return blocks
      .map((block) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length < 107) return null;

        const prnValue = lines[26];
        const rawName = lines[1];
        const isFemale = rawName.startsWith("/");
        const cleanName = isFemale ? rawName.substring(1).trim() : rawName;

        // Building exact flat subjects object for Map
        const subjectsMap = {};

        // Semester 1 usually has 11 papers based on your raw mapping
        const paperMapping = [
          { id: 1, code: 2, marks: [9, 10, 11], meta: 27 },
          { id: 2, code: 3, marks: [12, 13, 14], meta: 31 },
          { id: 3, code: 4, marks: [15, 16, 17], meta: 35 },
          { id: 4, code: 5, marks: [18, 19, 20], meta: 39 },
          { id: 5, code: 6, marks: [21, 22, 23], meta: 43 },
          { id: 6, code: 50, marks: [56, 57, 58], meta: 80 },
          { id: 7, code: 51, marks: [59, 60, 61], meta: 84 },
          { id: 8, code: 52, marks: [62, 63, 64, 74, 75, 76], meta: 88 },
          { id: 9, code: 53, marks: [65, 66, 67], meta: 92 },
          { id: 10, code: 54, marks: [68, 69, 70, 77, 78, 79], meta: 96 },
          { id: 11, code: 55, marks: [71, 72, 73], meta: 100 },
        ];

        paperMapping.forEach((p) => {
          subjectsMap[`paper${p.id}code`] = lines[p.code] || "";
          // For Semester 1, we take the last mark in the marks array as the "Total"
          subjectsMap[`paper${p.id}marks`] =
            lines[p.marks[p.marks.length - 1]] || "0";
          subjectsMap[`paper${p.id}cr`] = lines[p.meta] || "0";
          subjectsMap[`paper${p.id}gr`] = lines[p.meta + 1] || "";
          subjectsMap[`paper${p.id}gp`] = lines[p.meta + 2] || "0";
          subjectsMap[`paper${p.id}cxG`] = lines[p.meta + 3] || "0";
        });

        return {
          studentMaster: {
            prn: prnValue,
            name: cleanName,
            batch: prnValue ? prnValue.substring(0, 4) : null,
            gender: isFemale ? "Female" : "Male",
            motherName: lines[8],
            category: "Regular",
          },
          academicRecord: {
            prn: prnValue,
            seatNo: lines[0],
            semester: 1,
            sgpi: lines[47] || "0",
            totalMarks: lines[25] || "0", // Assuming line 25 is C*G total like Sem 2
            finalResult: lines[7] || "Unsuccessful",
            isKT: false,
            subjects: subjectsMap,
          },
        };
      })
      .filter(Boolean);
  } catch (err) {
    throw new Error(`Sem1 Processor Failed: ${err.message}`);
  }
};

module.exports = { extractSem1 };
