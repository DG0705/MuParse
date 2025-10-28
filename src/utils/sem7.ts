export type PaperStats = {
  name: string;
  cr: number | null;
  gr: string | null;
  gp: number | null;
  cxg: number | null;
  marks: number | null;
};

export type StudentRecord = {
  seatNo: string;
  name: string;
  gender: string;
  motherName: string;
  prn: string;
  result: string;
  papers: PaperStats[];
  totalCr: number;
  totalCxg: number;
  sgpi: number | null;
  finalGrade: string | null;
};

// MODIFIED: From 11 to 10 papers. Please update with your actual subject names.
// --- NEW MASTER CONFIGURATION ---
// This is the single source of truth for all papers.
// It defines the final column order in the CSV and the data preview.
export const ALL_PAPERS_CONFIG = [
    // Core Subjects
    { code: "42671", name: "AI and DS –II", csvHeader: "AI_DS_II" },
    { code: "42672", name: "Internet of Everything", csvHeader: "IoE" },
    { code: "ITL701", name: "Data Science Lab", csvHeader: "Data_Science_Lab" },
    { code: "ITL702", name: "IOE Lab", csvHeader: "IOE_Lab" },
    { code: "ITL703", name: "Secure Application Development", csvHeader: "Secure_App_Dev_Lab" },
    { code: "ITL704", name: "Recent Open Source Project Lab", csvHeader: "Open_Source_Lab" },
    { code: "ITP701", name: "Major Project I", csvHeader: "Major_Project_I" },

    // Elective Subjects (Department & Institute Level)
    { code: "42681", name: "Product Lifecycle Management", csvHeader: "Prod_Lifecycle_Mgmt" },
    { code: "42682", name: "Reliability Engineering", csvHeader: "Reliability_Eng" },
    { code: "42683", name: "Management Information System", csvHeader: "Mgmt_Info_Sys" },
    { code: "42684", name: "Design of Experiments", csvHeader: "Design_of_Experiments" },
    { code: "42685", name: "Operation Research", csvHeader: "Operation_Research" },
    { code: "42686", name: "Cyber Security and Laws", csvHeader: "Cyber_Security_Laws" },
    { code: "42687", name: "Disaster Management and Mitigation", csvHeader: "Disaster_Mgmt" },
    { code: "42688", name: "Energy Audit and Management", csvHeader: "Energy_Audit_Mgmt" },
    { code: "42689", name: "Development Engineering", csvHeader: "Dev_Engineering" },
    { code: "42673", name: "Storage Area Network", csvHeader: "Storage_Area_Net" },
    { code: "42674", name: "High Performance computing", csvHeader: "HPC" },
    { code: "42675", name: "Infrastructure Security", csvHeader: "Infra_Security" },
    { code: "42676", name: "Software Testing and QA", csvHeader: "Software_Testing_QA" },
    { code: "42677", name: "MANET", csvHeader: "MANET" },
    { code: "42678", name: "AR – VR", csvHeader: "AR_VR" },
    { code: "42679", name: "Quantum Computing", csvHeader: "Quantum_Computing" },
    { code: "42680", name: "Information Retrieval System", csvHeader: "Info_Retrieval_Sys" },
];

// --- UPDATE EXISTING CONSTANTS ---
// These are now derived from the master config to ensure consistency.
export const SUBJECT_NAMES = ALL_PAPERS_CONFIG.map(p => p.name);
const CSV_SUBJECT_HEADERS = ALL_PAPERS_CONFIG.map(p => p.csvHeader);


// --- Helper Utilities for Parsing ---
const fixNumberToken = (token: string) => token.replace(/\s+/g, "");

const parseGroup = (segment: string) => {
  const cleaned = segment.replace(/\s{2,}/g, " ").replace(/\|/g, " ").trim();
  const rx = /(\d+(?:\s*\.\s*\d+)?)\s+([A-Z])\s+(\d+(?:\s*\.\s*\d+)?)\s+(\d+(?:\s*\.\s*\d+)?)/;
  const m = cleaned.match(rx);
  if (!m) return { cr: null, gr: null, gp: null, cxg: null, marks: null };
  const cr = parseFloat(fixNumberToken(m[1]));
  const gr = m[2];
  const gp = parseFloat(fixNumberToken(m[3]));
  const cxg = parseFloat(fixNumberToken(m[4]));
  return {
    cr: Number.isFinite(cr) ? cr : null,
    gr: gr || null,
    gp: Number.isFinite(gp) ? gp : null,
    cxg: Number.isFinite(cxg) ? cxg : null,
    marks: null,
  };
};

const sum = (arr: Array<number | null>) =>
  arr.reduce((acc, n) => acc + (typeof n === "number" && Number.isFinite(n) ? n : 0), 0);

const parseMarksTotal = (segment: string): number | null => {
  const s = segment.replace(/\s+/g, " ").trim();
  const nums = s.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const last = parseInt(nums[nums.length - 1], 10);
  return Number.isFinite(last) ? last : null;
};

export function parseStudentsFromTxt(raw: string): StudentRecord[] {
  const lines = raw.split(/\r?\n/);
  const students: StudentRecord[] = [];
  const isSeatStart = (line: string) => /^\s*\d{7}\s+/.test(line);
  
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (isSeatStart(line) && current.length) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  for (const block of blocks) {
    const firstLineIdx = block.findIndex(isSeatStart);
    if (firstLineIdx === -1) continue;

    const nameLine = block[firstLineIdx] || "";
    const motherMarksLine = block[firstLineIdx + 1] || "";
    
    let prnGradeLine = "";
    for (let i = firstLineIdx + 2; i < Math.min(firstLineIdx + 5, block.length); i++) {
        if (block[i] && /^\s*\d{16}/.test(block[i])) {
            prnGradeLine = block[i];
            break;
        }
    }
    if (!prnGradeLine) continue;

    const bottomPapersStartIdx = block.findIndex(l => /^\s*\(\d+\)/.test(l));
    const bottomPapersStartLine = block[bottomPapersStartIdx] || "";
    let bottomTotalMarksLine = "";
    let bottomGradeLine = "";
    if (bottomPapersStartIdx !== -1) {
      bottomTotalMarksLine = block[bottomPapersStartIdx + 1] || "";
      bottomGradeLine = block[bottomPapersStartIdx + 3] || "";
    }

    const seatMatch = nameLine.match(/^(\s*\d{7})\s+(.*?)\s*\|/);
    const seatNo = seatMatch ? seatMatch[1].trim() : "";
    const rawName = seatMatch ? seatMatch[2].trim() : "";
    const gender = rawName.startsWith("/") ? "Female" : "Male";
    const name = rawName.startsWith("/") ? rawName.substring(1).trim() : rawName;
    const result = (nameLine.split("|").pop() || "").trim().split(/\s+/)[0];

    const motherName = (motherMarksLine.split("|")[0] || "").trim();
    const prn = (prnGradeLine.split("|")[0] || "").trim();

    const sgpiGradePart = (prnGradeLine.split("|").pop() || "").trim().split(/\s+/);
    const sgpiVal = sgpiGradePart.length > 0 ? parseFloat(sgpiGradePart[0]) : null;
    const finalGrade = sgpiGradePart.length > 1 ? sgpiGradePart[1] : null;
    const sgpi = sgpiVal && Number.isFinite(sgpiVal) ? sgpiVal : null;

    // --- NEW: Parse data into a map using paper codes as keys ---
    const papersByCode: { [code: string]: PaperStats } = {};

    // 1. Get paper codes for this student
    const topPaperCodes = nameLine.split("|").slice(1, 7).map(s => s.trim());
    const bottomPaperCodes = bottomPapersStartLine.split("|").slice(1, 5).map(s => s.trim());
    const studentPaperCodes = [...topPaperCodes, ...bottomPaperCodes];

    // 2. Parse marks and grades for each code
    const topMarksSegs = motherMarksLine.split("|").slice(1);
    const topGradeSegs = prnGradeLine.split("|").slice(1);
    for (let i = 0; i < 6; i++) {
        const code = topPaperCodes[i];
        if (!code) continue;
        const gradeInfo = parseGroup(topGradeSegs[i] || "");
        gradeInfo.marks = parseMarksTotal(topMarksSegs[i] || "");
        papersByCode[code] = { name: ALL_PAPERS_CONFIG.find(p => p.code === code)?.name || code, ...gradeInfo };
    }

    const bottomMarksSegs = bottomTotalMarksLine.split("|").slice(1);
    const bottomGradeSegs = bottomGradeLine.split("|").slice(1);
    for (let i = 0; i < 4; i++) {
        const code = bottomPaperCodes[i];
        if (!code) continue;
        const gradeInfo = parseGroup(bottomGradeSegs[i] || "");
        gradeInfo.marks = parseMarksTotal(bottomMarksSegs[i] || "");
        papersByCode[code] = { name: ALL_PAPERS_CONFIG.find(p => p.code === code)?.name || code, ...gradeInfo };
    }
    
    // --- NEW: Assemble the final papers array in the correct order using the master config ---
    const finalOrderedPapers = ALL_PAPERS_CONFIG.map(paperConfig => {
        return papersByCode[paperConfig.code] || { 
            name: paperConfig.name, 
            cr: null, gr: null, gp: null, cxg: null, marks: null 
        };
    });

    const totalCr = sum(finalOrderedPapers.map((p) => p.cr));
    const totalCxg = sum(finalOrderedPapers.map((p) => p.cxg));

    students.push({
      seatNo, name, gender, motherName, prn, result, 
      papers: finalOrderedPapers,
      totalCr: Number.parseFloat(totalCr.toFixed(2)),
      totalCxg: Number.parseFloat(totalCxg.toFixed(2)),
      sgpi, finalGrade,
    });
  }

  return students.filter(
    s => s.seatNo && s.seatNo.trim() !== "" && s.name && s.name.trim() !== ""
  );
}

// REMOVED: The toJson function has been removed as requested.

export function toCsv(students: StudentRecord[]): string {
  // Now uses the derived CSV_SUBJECT_HEADERS
  const paperCols = CSV_SUBJECT_HEADERS.flatMap((name) => [`${name}_CR`, `${name}_GR`, `${name}_GP`, `${name}_CxG`, `${name}_Marks`]);
  const headers = ["Seat No", "Name", "Gender", "Mother Name", "PRN", "Result", ...paperCols, "Total_CR", "Total_CxG", "SGPI", "Final_Grade"];

  const rows = students.map((s) => {
    // The s.papers array is now guaranteed to be in the correct order and length
    const paperValues = s.papers.flatMap((p) => [p.cr ?? "", p.gr ?? "", p.gp ?? "", p.cxg ?? "", p.marks ?? ""]);
    
    const seatForExcel = s.seatNo ? `="${s.seatNo}"` : "";
    const prnForExcel = s.prn ? `="${s.prn}"` : "";

    return [seatForExcel, s.name, s.gender, s.motherName, prnForExcel, s.result, ...paperValues, s.totalCr, s.totalCxg, s.sgpi ?? "", s.finalGrade ?? ""];
  });
  
  const toCsvCell = (v: unknown) => {
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  return [headers, ...rows].map((r) => r.map(toCsvCell).join(",")).join("\n");
}