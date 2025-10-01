// Utility functions for Semester 1 PDF parsing

export const SUBJECT_NAMES = [
  "Eng. Maths I",
  "Eng. Physics I",
  "Eng. Chem I",
  "Mechanics",
  "Basic Elec. Eng.",
  "Eng. Maths I TW",
  "Eng. Physics I TW",
  "Eng. Chem I TW",
  "Mechanics TW",
  "Basic Elec. Eng. TW",
  "Universal Human Values"
];

export interface PaperResult {
  code?: string;
  name?: string;
  marks: string;
  grade?: string;
  gradePoint?: string;
  credit?: string;
  creditGradeProduct?: string;
}

export interface StudentRecord {
  seatNo: string;
  prn: string;
  name: string;
  papers: PaperResult[];
  sgpi?: string;
  result?: string;
}

export function parseStudentsFromTxt(cleanedText: string): StudentRecord[] {
  const students: StudentRecord[] = [];
  const lines = cleanedText.split("\n");

  let currentStudent: Partial<StudentRecord> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect seat number line
    if (/^\d{8,}/.test(line)) {
      if (currentStudent && currentStudent.seatNo) {
        students.push(currentStudent as StudentRecord);
      }
      currentStudent = {
        seatNo: line.split(/\s+/)[0],
        prn: "",
        name: "",
        papers: [],
        sgpi: "",
        result: ""
      };
    }
    
    // Detect PRN line
    if (currentStudent && /PRN\s*:\s*(\d+)/.test(line)) {
      const match = line.match(/PRN\s*:\s*(\d+)/);
      if (match) currentStudent.prn = match[1];
    }
    
    // Detect name
    if (currentStudent && !currentStudent.name && /^[A-Z\s]+$/.test(line) && line.length > 5) {
      currentStudent.name = line;
    }
    
    // Parse marks line (simplified)
    if (currentStudent && /^\d+\s+\d+/.test(line)) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        currentStudent.papers.push({
          marks: parts[1] || "0"
        });
      }
    }
    
    // Detect SGPI
    if (currentStudent && /SGPI\s*:\s*([\d.]+)/.test(line)) {
      const match = line.match(/SGPI\s*:\s*([\d.]+)/);
      if (match) currentStudent.sgpi = match[1];
    }
    
    // Detect result
    if (currentStudent && /PASS|FAIL/.test(line)) {
      currentStudent.result = line.includes("PASS") ? "PASS" : "FAIL";
    }
  }
  
  if (currentStudent && currentStudent.seatNo) {
    students.push(currentStudent as StudentRecord);
  }

  return students;
}

export function toCsv(students: StudentRecord[]): string {
  const headers = [
    "Seat No",
    "PRN",
    "Name",
    "Result",
    "SGPI",
    ...SUBJECT_NAMES.map(name => `${name}_Marks`)
  ];
  
  const rows = students.map(student => {
    const row = [
      student.seatNo,
      student.prn,
      student.name,
      student.result || "",
      student.sgpi || ""
    ];
    
    for (let i = 0; i < SUBJECT_NAMES.length; i++) {
      row.push(student.papers[i]?.marks || "");
    }
    
    return row.join(",");
  });
  
  return [headers.join(","), ...rows].join("\n");
}
