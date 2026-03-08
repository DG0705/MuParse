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
        for (let i = 1; i <= 13; i++) {
          let mark = "";
          if (i <= 5) mark = lines[11 + (i - 1) * 3];
          else if (i <= 11) mark = lines[58 + (i - 6) * 3];
          else if (i === 12) mark = lines[108];
          else if (i === 13) mark = lines[111];

          let cr, gr, gp, cxG, code;
          if (i <= 5) {
            code = lines[i + 1];
            const base = 27 + (i - 1) * 4;
            [cr, gr, gp, cxG] = [
              lines[base],
              lines[base + 1],
              lines[base + 2],
              lines[base + 3],
            ];
          } else if (i <= 11) {
            code = lines[50 + (i - 6)];
            const base = 80 + (i - 6) * 4;
            [cr, gr, gp, cxG] = [
              lines[base],
              lines[base + 1],
              lines[base + 2],
              lines[base + 3],
            ];
          } else if (i === 12) {
            code = lines[104];
            [cr, gr, gp, cxG] = [
              lines[112],
              lines[113],
              lines[114],
              lines[115],
            ];
          } else if (i === 13) {
            code = lines[105];
          }

          subjectsMap[`paper${i}code`] = code || "";
          subjectsMap[`paper${i}marks`] = mark || "0";

          if (i !== 13) {
            subjectsMap[`paper${i}cr`] = cr || "0";
            subjectsMap[`paper${i}gr`] = gr || "";
            subjectsMap[`paper${i}gp`] = gp || "0";
            subjectsMap[`paper${i}cxG`] = cxG || "0";
          }
        }

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
