const pdfParse = require("pdf-parse");

const extractSem2 = async (buffer) => {
  try {
    const parse = typeof pdfParse === "function" ? pdfParse : pdfParse.default;
    const pdfData = await parse(buffer);
    const text = pdfData.text;

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

    const blocks = cleanedText
      .split(/(?=\b\d{7}\b)/g)
      .filter((b) => b.trim() !== "");

    return blocks
      .map((block) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 110) return null;

        const prnValue = lines[26];
        const rawName = lines[1];
        const isFemale = rawName.startsWith("/");

        const subjectsMap = {};

        const SUBJECT_MAP = {
          1: "Eng_Maths_II",
          2: "Eng_Maths_II_TW",
          3: "Eng_Physics_II",
          4: "Eng_Physics_II_TW",
          5: "Eng_Chem_II",
          6: "Eng_Chem_II_TW",
          7: "Eng_Graphics",
          8: "Eng_Graphics_TW",
          9: "C_Prog",
          10: "C_Programming_TW",
          11: "Prof_Comm_Ethics_I",
          12: "Prof_Comm_Ethics_I_TW",
          13: "Workshop_II",
        };

        let totalCR = 0;
        let totalCxG = 0;

        for (let i = 1; i <= 13; i++) {
          let mark = "";
          let cr = 0;
          let gr = "";
          let gp = 0;
          let cxG = 0;

          if (i <= 5) {
            mark = lines[11 + (i - 1) * 3];

            const base = 27 + (i - 1) * 4;
            cr = Number(lines[base]) || 0;
            gr = lines[base + 1] || "";
            gp = Number(lines[base + 2]) || 0;
            cxG = Number(lines[base + 3]) || 0;
          } else if (i <= 11) {
            mark = lines[58 + (i - 6) * 3];

            const base = 80 + (i - 6) * 4;
            cr = Number(lines[base]) || 0;
            gr = lines[base + 1] || "";
            gp = Number(lines[base + 2]) || 0;
            cxG = Number(lines[base + 3]) || 0;
          } else if (i === 12) {
            mark = lines[108];

            cr = Number(lines[112]) || 0;
            gr = lines[113] || "";
            gp = Number(lines[114]) || 0;
            cxG = Number(lines[115]) || 0;
          } else if (i === 13) {
            mark = lines[111];

            // Workshop-II has only marks in the PDF
            cr = 1;
            gr = "";
            gp = 0;
            cxG = 0;
          }

          const key = SUBJECT_MAP[i];

          subjectsMap[`${key}_CR`] = cr;
          subjectsMap[`${key}_GR`] = gr;
          subjectsMap[`${key}_GP`] = gp;
          subjectsMap[`${key}_CxG`] = cxG;
          subjectsMap[`${key}_Marks`] = Number(mark) || 0;

          totalCR += cr;
          totalCxG += cxG;
        }

        subjectsMap["Total_CR"] = totalCR;
        subjectsMap["Total_CxG"] = totalCxG;

        return {
          studentMaster: {
            prn: prnValue,
            name: isFemale ? rawName.substring(1).trim() : rawName,
            batch: prnValue ? prnValue.substring(0, 4) : null,
            gender: isFemale ? "Female" : "Male",
            motherName: lines[8],
            category: "Regular",
          },
          academicRecord: {
            prn: prnValue,
            seatNo: lines[0],
            semester: 2,
            sgpi: lines[47] || "0",
            totalMarks: lines[25] || "0",
            finalResult: lines[7] || "Unsuccessful",
            isKT: false,
            subjects: subjectsMap,
          },
        };
      })
      .filter(Boolean);
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = { extractSem2 };
