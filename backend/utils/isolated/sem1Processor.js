const pdf = require("pdf-parse"); // ⚠️ make sure version = 1.1.1

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

    let finalScrubbedText = text
      .replace(headerPattern, "")
      .replace(footerPattern, "")
      .replace(noLabelPattern, "")
      .replace(sequencePattern, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // ================= SPLIT =================
    const blocks = finalScrubbedText
      .split(/(?=\b\d{7}\b)/g)
      .filter((b) => b.trim() !== "");

    // ================= SEQUENTIAL =================
    const extractedData = blocks
      .map((block) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length < 107) {
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
          totalCredits: lines[104],
          finalCgpa: lines[105],
          finalGrade: lines[106],

          // FULL SUBJECT MAP (RAW)
          raw: lines,
        };
      })
      .filter(Boolean);

    // ================= GROUPED =================
    const groupedData = extractedData.map((s) => ({
      studentInfo: {
        seatNo: s.seatNo,
        name: s.name,
        motherName: s.motherName,
        prn: s.prn,
        college: s.college,
      },
      summary: {
        resultStatus: s.resultStatus,
        sgpa: s.sgpa,
        grade: s.grade,
        totalCredits: s.totalCredits,
        finalCgpa: s.finalCgpa,
        finalGrade: s.finalGrade,
      },
      subjects: {
        paper1: {
          code: s.raw[2],
          marks: [s.raw[9], s.raw[10], s.raw[11]],
          cr: s.raw[27],
          gr: s.raw[28],
          gp: s.raw[29],
          cxG: s.raw[30],
        },
        paper2: {
          code: s.raw[3],
          marks: [s.raw[12], s.raw[13], s.raw[14]],
          cr: s.raw[31],
          gr: s.raw[32],
          gp: s.raw[33],
          cxG: s.raw[34],
        },
        paper3: {
          code: s.raw[4],
          marks: [s.raw[15], s.raw[16], s.raw[17]],
          cr: s.raw[35],
          gr: s.raw[36],
          gp: s.raw[37],
          cxG: s.raw[38],
        },
        paper4: {
          code: s.raw[5],
          marks: [s.raw[18], s.raw[19], s.raw[20]],
          cr: s.raw[39],
          gr: s.raw[40],
          gp: s.raw[41],
          cxG: s.raw[42],
        },
        paper5: {
          code: s.raw[6],
          marks: [s.raw[21], s.raw[22], s.raw[23]],
          cr: s.raw[43],
          gr: s.raw[44],
          gp: s.raw[45],
          cxG: s.raw[46],
        },
        paper6: {
          code: s.raw[50],
          marks: [s.raw[56], s.raw[57], s.raw[58]],
          cr: s.raw[80],
          gr: s.raw[81],
          gp: s.raw[82],
          cxG: s.raw[83],
        },
        paper7: {
          code: s.raw[51],
          marks: [s.raw[59], s.raw[60], s.raw[61]],
          cr: s.raw[84],
          gr: s.raw[85],
          gp: s.raw[86],
          cxG: s.raw[87],
        },
        paper8: {
          code: s.raw[52],
          marks: [
            s.raw[62],
            s.raw[63],
            s.raw[64],
            s.raw[74],
            s.raw[75],
            s.raw[76],
          ],
          cr: s.raw[88],
          gr: s.raw[89],
          gp: s.raw[90],
          cxG: s.raw[91],
        },
        paper9: {
          code: s.raw[53],
          marks: [s.raw[65], s.raw[66], s.raw[67]],
          cr: s.raw[92],
          gr: s.raw[93],
          gp: s.raw[94],
          cxG: s.raw[95],
        },
        paper10: {
          code: s.raw[54],
          marks: [
            s.raw[68],
            s.raw[69],
            s.raw[70],
            s.raw[77],
            s.raw[78],
            s.raw[79],
          ],
          cr: s.raw[96],
          gr: s.raw[97],
          gp: s.raw[98],
          cxG: s.raw[99],
        },
        paper11: {
          code: s.raw[55],
          marks: [s.raw[71], s.raw[72], s.raw[73]],
          cr: s.raw[100],
          gr: s.raw[101],
          gp: s.raw[102],
          cxG: s.raw[103],
        },
      },
    }));

    return groupedData;
  } catch (err) {
    console.error("Sem1 Extraction Error:", err.message);
    throw err;
  }
};

module.exports = { extractSem1 };
