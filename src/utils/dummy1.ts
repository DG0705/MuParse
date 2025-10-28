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

// --- Subject Name Constants (ACTION REQUIRED: Update these with actual Sem 2 names) ---
export const SUBJECT_NAMES_SEM2 = [
  "Engineering Mathematics-II",
  "Engineering Mathematics-II Term Work",
  "Engineering Physics-II",
  "Engineering Physics-II (TW)",
  "Engineering Chemistry-II",
  "Engineering Chemistry-II (TW)",
  "Engineering Graphics",
  "Engineering Graphics (TW/Orl)",
  "C programming",
  "C programming (TW/Orl)",
  "Professional Communication and Ethics- I",
  "Professional Communication and Ethics- I (TW)",
  "Basic Workshop practice-II (TW)"
];

const CSV_SUBJECT_HEADERS_SEM2 = [
  "Eng. Maths-II",
  "Eng. Maths-II TW",
  "Eng. Physics-II",
  "Eng. Physics-II TW",
  "Eng. Chem-II",
  "Eng. Chem-II TW",
  "Eng. Graphics",
  "Eng. Graphics TW/Orl",
  "C Prog",
  "C Prog TW/Orl",
  "PCE-I",
  "PCE-I TW",
  "Workshop-II TW"
];
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
    const firstLine = block.find((l) => isSeatStart(l)) || "";
    const seatMatch = firstLine.match(/^(\s*\d{7})\s+(.*?)\s*\|/);
    const seatNo = seatMatch ? seatMatch[1].trim() : "";
    const rawName = seatMatch ? seatMatch[2].trim() : "";
    
    const gender = rawName.startsWith("/") ? "Female" : "Male";
    const name = rawName.startsWith("/") ? rawName.substring(1).trim() : rawName;

    const secondLineIdx = block.indexOf(firstLine) + 1;
    const secondLine = block[secondLineIdx] || "";
    const prnIdx = block.findIndex((l) => /^\s*\d{16}\s+/.test(l));
    const prnLine = prnIdx !== -1 ? block[prnIdx] : "";
    const dashIdx = block.findIndex((l) => /-{10,}/.test(l));
    let bottomGroupLine = "";
    let bottomMarksLine = "";
    if (dashIdx !== -1) {
      for (let i = dashIdx + 1; i < Math.min(block.length, dashIdx + 12); i++) {
        const l = block[i] || "";
        if ((l.match(/\|/g) || []).length >= 4 && /(?:\+|--)/.test(l)) {
          bottomMarksLine = l;
          break;
        }
      }
      for (let i = dashIdx + 1; i < Math.min(block.length, dashIdx + 12); i++) {
        const l = block[i] || "";
        const pattern = /(\d+\s*\.\s*\d+)\s+[A-Z]\s+(\d+\s*\.\s*\d+)\s+(\d+\s*\.\s*\d+)/;
        if ((l.match(/\|/g) || []).length >= 4 && pattern.test(l)) {
          bottomGroupLine = l;
          break;
        }
      }
    }
    const lastBar = firstLine.lastIndexOf("|");
    const result = lastBar !== -1 ? firstLine.slice(lastBar + 1).trim().split(/\s+/)[0] : "";
    const motherLine = secondLine || "";
    const mother = (motherLine.includes("|") ? motherLine.split("|")[0] : motherLine).trim();
    let prn = "";
    const prn16Match = prnLine.match(/(\d{16})/);
    if (prn16Match) {
      prn = prn16Match[1];
    } else {
      const prnFallbackMatch = prnLine.match(/(\d{10,20})/);
      prn = prnFallbackMatch ? prnFallbackMatch[1] : "";
    }
    let papersTop: any[] = [];
    if (prnLine.includes("|")) {
      const segs = prnLine.split("|").slice(1);
      papersTop = segs.slice(0, 6).map(parseGroup);
    }
    let papersBottom: any[] = [];
    if (bottomGroupLine) {
      const segs = bottomGroupLine.split("|").slice(1);
      papersBottom = segs.slice(0, 7).map(parseGroup);
    }
    const combinedPapers = [...papersTop, ...papersBottom];
    while (combinedPapers.length < 13) combinedPapers.push({ cr: null, gr: null, gp: null, cxg: null, marks: null });
    
    let topMarksTotals: Array<number | null> = [];
    if (secondLine && secondLine.includes("|")) {
      const segs = secondLine.split("|").slice(1);
      topMarksTotals = segs.slice(0, 6).map(parseMarksTotal);
    }
    let bottomMarksTotals: Array<number | null> = [];
    if (bottomMarksLine) {
      const segs = bottomMarksLine.split("|").slice(1);
      bottomMarksTotals = segs.slice(0, 7).map(parseMarksTotal);
    }
    for (let i = 0; i < Math.min(6, combinedPapers.length); i++) {
      if(combinedPapers[i]) combinedPapers[i].marks = topMarksTotals[i] ?? null;
    }
    for (let i = 0; i < Math.min(7, Math.max(0, combinedPapers.length - 6)); i++) {
      if(combinedPapers[6 + i]) combinedPapers[6 + i].marks = bottomMarksTotals[i] ?? null;
    }
    
    const papers: PaperStats[] = combinedPapers.slice(0, 13).map((p, i) => ({
      name: SUBJECT_NAMES_SEM2[i] || `Paper ${i + 1}`,
      cr: p.cr,
      gr: p.gr,
      gp: p.gp,
      cxg: p.cxg,
      marks: p.marks,
    }));

    let sgpi: number | null = null;
    let finalGrade: string | null = null;
    if (prnLine) {
      const tail = prnLine.split("|").pop() || "";
      const tokens = tail.trim().split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        const maybeSgpi = parseFloat(fixNumberToken(tokens[0]));
        sgpi = Number.isFinite(maybeSgpi) ? maybeSgpi : null;
        finalGrade = tokens[1] || null;
      }
    }
    const totalCr = sum(papers.map((p) => p.cr));
    const totalCxg = sum(papers.map((p) => p.cxg));
    
    students.push({
      seatNo, name, gender, motherName: mother, prn, result, papers,
      totalCr: Number.parseFloat(totalCr.toFixed(2)),
      totalCxg: Number.parseFloat(totalCxg.toFixed(2)),
      sgpi, finalGrade,
    });
  }
  return students.filter(
    s => 
        s.seatNo && s.seatNo.trim() !== "" && 
        s.name && s.name.trim() !== "" &&
        s.result && s.result.trim() !== ""
  );
}

export function toCsv(students: StudentRecord[]): string {
  const paperCols = CSV_SUBJECT_HEADERS_SEM2.flatMap((name) => [`${name}_CR`, `${name}_GR`, `${name}_GP`, `${name}_CxG`, `${name}_Marks`]);
  const headers = ["Seat No", "Name", "Gender", "Mother Name", "PRN", "Result", ...paperCols, "Total_CR", "Total_CxG", "SGPI", "Final_Grade"];
  
  const rows = students.map((s) => {
      const paperValues = s.papers.slice(0, 13).flatMap((p) => [p.cr ?? "", p.gr ?? "", p.gp ?? "", p.cxg ?? "", p.marks ?? ""]);
      const seatForExcel = s.seatNo ? `="${s.seatNo}"` : "";
      const prnForExcel = s.prn ? `="${s.prn}"` : "";
      return [seatForExcel, s.name, s.gender, s.motherName, prnForExcel, s.result, ...paperValues, s.totalCr, s.totalCxg, s.sgpi ?? "", s.finalGrade ?? ""];
  });

  const toCsvCell = (v: unknown) => {
    if (typeof v === "string") {
      if (v.includes(",") || v.includes("\n") || v.includes('"')) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    }
    return String(v);
  };
  return [headers, ...rows].map((r) => r.map(toCsvCell).join(",")).join("\n");
}