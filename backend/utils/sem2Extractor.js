import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export const extractSem2Logic = async (buffer) => {
  // Robustly handle the library export regardless of the environment
  const parse = typeof pdf === "function" ? pdf : pdf.default || pdf;

  if (typeof parse !== "function") {
    throw new Error(
      "PDF parsing library failed to load: Entry point is not a function.",
    );
  }

  try {
    const pdfData = await parse(buffer);
    const text = pdfData.text;

    const headerPattern =
      /University of Mumbai, Mumbai[\s\S]+?Paper12\nPaper13\nTotal\nTotal\nCR\nGR\nGP\nC\*G\nCR\nGR\nGP\nC\*G/g;
    const footerPattern = /\/ - FEMALE, # - 0\.229A[\s\S]+?10\.00\s+/g;

    let cleanText = text
      .replace(headerPattern, "")
      .replace(footerPattern, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const blocks = cleanText
      .split(/(?=\b\d{7}\b)/g)
      .filter((b) => b.trim() !== "");

    return blocks
      .map((block) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 110) return null;
        return {
          "SEAT no": lines[0],
          NAME: lines[1],
          "PRN.": lines[26],
          SGPA: lines[47],
          "Total Credit": lines[116],
        };
      })
      .filter(Boolean);
  } catch (err) {
    throw new Error("Extraction Logic Failed: " + err.message);
  }
};
