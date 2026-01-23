import React, { useState, useMemo } from "react";
import * as pdfjs from "pdfjs-dist";

// Remove interface definitions if this is a .js file, 
// otherwise keep them for TypeScript (.tsx)
interface StudentData {
  Seat_No: string;
  Name: string;
  Gender: "Male" | "Female";
  PRN: string;
  ABCID: string;
  Is_Diploma_Student: "Yes" | "No";
  Result: string;
  Remark: string;
  Grand_Total: string;
  SGPI: string;
  CGPI: string;
  SGPI_SEM_I?: string;
  MARKS_SEM_I?: string;
  CREDITS_SEM_I?: string;
  SGPI_SEM_II?: string;
  MARKS_SEM_II?: string;
  CREDITS_SEM_II?: string;
  SGPI_SEM_III?: string;
  MARKS_SEM_III?: string;
  CREDITS_SEM_III?: string;
  SGPI_SEM_IV?: string;
  MARKS_SEM_IV?: string;
  CREDITS_SEM_IV?: string;
  SGPI_SEM_V?: string;
  MARKS_SEM_V?: string;
  CREDITS_SEM_V?: string;
  SGPI_SEM_VI?: string;
  MARKS_SEM_VI?: string;
  CREDITS_SEM_VI?: string;
  SGPI_SEM_VII?: string;
  MARKS_SEM_VII?: string;
  CREDITS_SEM_VII?: string;
  TOTAL_MARKS?: string;
  [key: string]: string | "Male" | "Female" | undefined;
}

const cleanExtractedText = (extractedText: string): string => {
  const lines = extractedText.split("\n");
  const unwantedPatterns = [
    /^Page No\./i,
    /UNIVERSITY OF MUMBAI/i,
    /RESULT DATE/i,
    /COLLEGE\/CENTRE NAME/i,
    /OFFICE REGISTER FOR THE/i,
    /EXAMINATION HELD IN/i,
    /SEAT_NO NAME/,
    /Th\(\d+\/\d+\)/,
    /In\(\d+\/\d+\)/,
    /Total/,
    /C G GP/,
    /^\s*\/- FEMALE/i,
    /^\s*RPV/i,
    /NULL & VOID/i,
    /MARKS CARRIED FORWARD/i,
    /^G:/,
    /^\s*~/,
    /^\s*@/,
    /^\s*#/,
    /RR- Reserved/,
    /Grade \/ Gr\. Pt\./,
    /% Marks/,
  ];
  const cleanedLines = lines.filter((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === "" || trimmedLine.startsWith("---")) {
      return false;
    }
    return !unwantedPatterns.some((pattern) => pattern.test(trimmedLine));
  });
  return cleanedLines.join("\n");
};

const parseMarksLine = (line: string): string[] => {
  if (!line) return [];
  const parts = line.trim().match(/\S+/g) || [];
  const result: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const currentPart = parts[i];
    const nextPart = parts[i + 1];
    if (nextPart === "*" || nextPart === "+") {
      result.push(`${currentPart} ${nextPart}`);
      i += 2;
    } else {
      result.push(currentPart);
      i += 1;
    }
  }
  return result;
};

const parseStudentBlock = (
  block: string,
  activeSubjects: string[]
): StudentData | null => {
  const lines = block
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length < 5 || activeSubjects.length === 0) return null;

  const data: Partial<StudentData> = {};
  data.Is_Diploma_Student = /\(\s*DIPLOMA\s*STUDENT\s*\)/i.test(block)
    ? "Yes"
    : "No";

  const infoLine = lines[0].trim();
  const infoMatch = infoLine.match(/^(\d{7})\s*(.*?)\s*\((\d+)\)\s*\((\d+)\)$/);
  if (!infoMatch) return null;

  data.Seat_No = infoMatch[1];
  data.PRN = infoMatch[3];
  data.ABCID = infoMatch[4];

  const rawName = infoMatch[2].trim();
  if (rawName.startsWith("/")) {
    data.Gender = "Female";
    data.Name = rawName.substring(1).trim();
  } else {
    data.Gender = "Male";
    data.Name = rawName;
  }

  const thTwMarks = parseMarksLine(lines[1]);
  const inPrOrLineParts = parseMarksLine(lines[2]);
  const courseTotals = parseMarksLine(lines[3]);
  const sgpiLineParts = lines[4].trim().split(/\s+/);

  activeSubjects.forEach((subjectName, i) => {
    if (i < courseTotals.length) {
      data[`${subjectName}_Th_Tw`] = thTwMarks[i] || "";
      data[`${subjectName}_In_PrOr`] = inPrOrLineParts[i] || "";
      data[`${subjectName}_Total`] = courseTotals[i] || "";
    }
  });

  const resultParts = inPrOrLineParts.slice(activeSubjects.length);
  data.Grand_Total = resultParts.pop() || "";
  data.Result = resultParts.shift() || "";
  data.Remark = resultParts.join(" ");

  data.SGPI = sgpiLineParts[sgpiLineParts.length - 1];
  data.CGPI = "";

  lines.slice(5).forEach((line) => {
    const trimmedLine = line.trim();
    const cgpiMatch = trimmedLine.match(/CGPI:\s*([0-9.\s@]+)/);
    if (cgpiMatch) data.CGPI = cgpiMatch[1].trim();
    if (trimmedLine.includes("SGPI:")) {
      const sgpiMatches = trimmedLine.matchAll(/SEM-([IVX]+):\s*([0-9.-]+)/g);
      for (const match of sgpiMatches) data[`SGPI_SEM_${match[1]}`] = match[2];
    }
    if (trimmedLine.includes("CREDITS:")) {
      const creditsMatches = trimmedLine.matchAll(/SEM-([IVX]+):\s*(\d+|--)/g);
      for (const match of creditsMatches)
        data[`CREDITS_SEM_${match[1]}`] = match[2];
    }
    if (trimmedLine.includes("MARKS:")) {
      const marksMatches = trimmedLine.matchAll(/SEM-([IVX]+):\s*(\S+?);/g);
      for (const match of marksMatches)
        data[`MARKS_SEM_${match[1]}`] = match[2];
      const totalMarksMatch = trimmedLine.match(/TOTAL:\s*(.*)/);
      if (totalMarksMatch) data.TOTAL_MARKS = totalMarksMatch[1].trim();
    }
  });

  return data as StudentData;
};

const parseAllStudentsWithContext = (text: string): StudentData[] => {
  const allStudents: StudentData[] = [];
  let currentSubjects: string[] = [];

  const chunks = text.split(/(?=^\s*\d{7}\s)/m);

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    const subjectLineRegex = /\d{2}\.\s+[A-Z0-9]+\s+/;
    if (subjectLineRegex.test(trimmedChunk)) {
      const subjectMatches = [
        ...trimmedChunk.matchAll(
          /\d{2}\.\s+[A-Z0-9]+\s+(.*?)(?=\s+\d{2}\.|$)/g
        ),
      ];
      if (subjectMatches.length > 0) {
        currentSubjects = subjectMatches.map((match) =>
          match[1].trim().replace(/\s+/g, " ")
        );
      }
    }

    if (/^\d{7}/.test(trimmedChunk)) {
      const student = parseStudentBlock(trimmedChunk, currentSubjects);
      if (student) {
        allStudents.push(student);
      }
    }
  }
  return allStudents;
};

const generateCsvContent = (students: StudentData[]): string => {
  if (students.length === 0) return "";

  const baseHeaders = [
    "Seat_No",
    "Name",
    "Gender",
    "PRN",
    "ABCID",
    "Is_Diploma_Student",
    "Result",
    "Remark",
    "Grand_Total",
    "SGPI",
    "CGPI",
  ];

  const semesterHeaders = [
    "SGPI_SEM_I",
    "MARKS_SEM_I",
    "CREDITS_SEM_I",
    "SGPI_SEM_II",
    "MARKS_SEM_II",
    "CREDITS_SEM_II",
    "SGPI_SEM_III",
    "MARKS_SEM_III",
    "CREDITS_SEM_III",
    "SGPI_SEM_IV",
    "MARKS_SEM_IV",
    "CREDITS_SEM_IV",
    "SGPI_SEM_V",
    "MARKS_SEM_V",
    "CREDITS_SEM_V",
    "SGPI_SEM_VI",
    "MARKS_SEM_VI",
    "CREDITS_SEM_VI",
    "SGPI_SEM_VII",
    "MARKS_SEM_VII",
    "CREDITS_SEM_VII",
    "TOTAL_MARKS",
  ];

  const allHeaders = new Set<string>(baseHeaders);
  const subjectRelatedHeaders = new Set<string>();

  students.forEach((student) => {
    Object.keys(student).forEach((key) => {
      if (!baseHeaders.includes(key) && !semesterHeaders.includes(key)) {
        subjectRelatedHeaders.add(key);
      }
    });
  });

  const sortedSubjectHeaders = Array.from(subjectRelatedHeaders).sort();

  const finalHeaders = [
    ...baseHeaders,
    ...sortedSubjectHeaders,
    ...semesterHeaders,
  ];

  const csvRows = [finalHeaders.join(",")];

  students.forEach((studentData) => {
    const csvRow = finalHeaders.map((headerKey) => {
      const value = String(studentData[headerKey] || "").replace(/"/g, '""');
      if (["Seat_No", "PRN", "ABCID"].includes(headerKey)) {
        return `"=""${value}"""`;
      }
      return `"${value}"`;
    });
    csvRows.push(csvRow.join(","));
  });

  return csvRows.join("\n");
};

const PdfResultConverter: React.FC = () => {
  const [rawText, setRawText] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  const [prnFilter, setPrnFilter] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // --- NEW STATE ---
  const [semester, setSemester] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  // ----------------

  useMemo(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;
  }, []);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setRawText("");
    setCleanedText("");
    setAllStudents([]);
    setPrnFilter("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      let extractedText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.filter(
          (item): item is import("pdfjs-dist/types/src/display/api").TextItem =>
            "str" in item
        );

        let lines: { [y: number]: string[] } = {};
        for (const item of textItems) {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item.str);
        }
        const sortedY = Object.keys(lines)
          .map(parseFloat)
          .sort((a, b) => b - a);
        for (const y of sortedY) {
          extractedText += lines[y].join(" ") + "\n";
        }
        extractedText += "\n\n";
      }

      setRawText(extractedText);
      const textAfterCleaning = cleanExtractedText(extractedText);
      setCleanedText(textAfterCleaning);

      const results = parseAllStudentsWithContext(textAfterCleaning);
      setAllStudents(results);
    } catch (error) {
      console.error("An error occurred during conversion:", error);
      alert(
        "An error occurred during PDF processing. Check the console for details."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCsv = () => {
    const prnsToFilter = prnFilter
      .split(/[\s,]+/)
      .map((prn) => prn.trim())
      .filter((prn) => prn.length > 0);
    let studentsToExport = allStudents;

    if (prnsToFilter.length > 0) {
      studentsToExport = allStudents.filter((student) =>
        prnsToFilter.includes(student.PRN)
      );
    }

    if (studentsToExport.length === 0) {
      alert(
        "No students found matching the provided PRNs, or no data available."
      );
      return;
    }

    const csvContent = generateCsvContent(studentsToExport);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_results_dynamic.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- NEW UPLOAD FUNCTION ---
  const handleUploadToDatabase = async () => {
    if (!semester) {
      alert("Please enter a Semester number before uploading.");
      return;
    }

    const prnsToFilter = prnFilter
      .split(/[\s,]+/)
      .map((prn) => prn.trim())
      .filter((prn) => prn.length > 0);

    let studentsToExport = allStudents;

    if (prnsToFilter.length > 0) {
      studentsToExport = allStudents.filter((student) =>
        prnsToFilter.includes(student.PRN)
      );
    }

    if (studentsToExport.length === 0) {
      alert("No student data available to upload.");
      return;
    }

    const csvContent = generateCsvContent(studentsToExport);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], "converted_result.csv", { type: "text/csv" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", semester);

    setIsUploading(true);

    try {
      // Ensure this URL matches your backend configuration
      const response = await fetch("http://localhost:5000/api/students/upload-csv", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success! ${result.message}`);
      } else {
        alert(`Upload Failed: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error uploading data:", error);
      alert("Network error. Please ensure the backend server is running.");
    } finally {
      setIsUploading(false);
    }
  };
  // ---------------------------

  const hasData = allStudents.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-8">
      <div className="border rounded-lg p-6 space-y-6 bg-white shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">1. Upload PDF File</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isProcessing}
            onClick={(e) => (e.currentTarget.value = "")}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="prn-filter" className="text-sm font-medium">
            2. (Optional) Filter by PRN Numbers
          </label>
          <textarea
            id="prn-filter"
            placeholder="Enter PRN numbers, separated by commas or newlines..."
            value={prnFilter}
            onChange={(e) => setPrnFilter(e.target.value)}
            disabled={!hasData || isProcessing}
            className="w-full p-2 border rounded-md min-h-[80px] font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            3. Download Formatted Data
          </label>
          <button
            onClick={handleDownloadCsv}
            disabled={!hasData || isProcessing}
            className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isProcessing
              ? "Processing..."
              : `Download CSV (${
                  prnFilter.trim() === "" ? "All" : "Filtered"
                })`}
          </button>
        </div>

        {/* --- NEW UPLOAD SECTION --- */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <label className="text-sm font-medium">4. Upload to Database</label>
          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Semester (e.g. 1)"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="p-2 border rounded-md w-32 text-sm"
              min="1"
              max="8"
            />
            <button
              onClick={handleUploadToDatabase}
              disabled={!hasData || isProcessing || isUploading}
              className={`flex-1 text-white font-bold py-2 px-4 rounded-lg transition-colors ${
                isUploading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isUploading ? "Uploading..." : "Upload CSV to DB"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            * Converts extracted data to CSV and saves to MongoDB.
          </p>
        </div>
        {/* ------------------------- */}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Raw Extracted Text</h2>
          <textarea
            value={rawText}
            placeholder="Raw text from PDF will appear here..."
            className="w-full p-2 border rounded-md min-h-[300px] font-mono text-xs"
            readOnly
          />
        </div>
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Cleaned Text for Parsing
          </h2>
          <textarea
            value={cleanedText}
            placeholder="Cleaned text will appear here..."
            className="w-full p-2 border rounded-md min-h-[300px] font-mono text-xs"
            readOnly
          />
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Final Parsed Data Preview ({allStudents.length} students found)
        </h2>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                {["Seat No", "Name", "PRN", "Result", "SGPI"].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {hasData ? (
                allStudents.slice(0, 10).map((s) => (
                  <tr key={s.Seat_No}>
                    <td className="px-4 py-2 whitespace-nowrap">{s.Seat_No}</td>
                    <td className="px-4 py-2">{s.Name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{s.PRN}</td>
                    <td className="px-4 py-2">{s.Result}</td>
                    <td className="px-4 py-2">{s.SGPI}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="h-24 text-center">
                    No data to display. Upload a file to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PdfResultConverter;