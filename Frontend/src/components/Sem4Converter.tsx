import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, BarChart3, Database } from "lucide-react";
import SubjectAnalysisReport from "./SubjectAnalysisReport";

// --- Semester 4 Dynamic Dictionary Mapping ---
const SHORT_NAMES: Record<string, string> = {
  "ENGINEERING MATHEMATICS - IV": "EM4",
  "COMPUTER NETWORK AND NETWORK DESIGN": "CNND",
  "OPERATING SYSTEM": "OS",
  "AUTOMATA THEORY": "AT",
  "COMPUTER ORGANIZATION AND ARCHITECTURE": "COA",
  "NETWORK LAB": "NET LAB",
  "UNIX LAB": "UNIX LAB",
  "MICROPROCESSOR LAB": "MICRO LAB",
  "PYTHON LAB (SBL)": "PYTHON LAB",
  "MINI PROJECT - 1 B FOR PYTHON BASED AUTOMATION PROJECTS": "MINI PROJ 1B",
};

interface SubjectStats {
  totalAppeared: number;
  totalPassed: number;
  passPercentage: string;
  marks40_50: number;
  marks51_59: number;
  marks60_Above: number;
  teacher: string;
}

interface AnalysisData {
  [subjectName: string]: SubjectStats;
}

interface RawStudentRecord {
  "Seat No": string;
  Name: string;
  "Total Marks": string;
  SGPA: string;
  "Final Result": string;
  [key: string]: string;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  records: RawStudentRecord[];
  totIndices: any[];
  markHeaders: string[];
  gradeHeaders: string[];
}

const download = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const analyzeStudentRecords = (
  records: any[],
  totIndices: any[],
  markHeaders: string[],
  gradeHeaders: string[],
): AnalysisData => {
  const initialStats: AnalysisData = {};

  totIndices.forEach((item) => {
    initialStats[item.subjectName] = {
      totalAppeared: 0,
      totalPassed: 0,
      passPercentage: "0.00%",
      marks40_50: 0,
      marks51_59: 0,
      marks60_Above: 0,
      teacher: "N/A",
    };
  });

  records.forEach((record) => {
    totIndices.forEach((item) => {
      const subjectStats = initialStats[item.subjectName];
      if (!subjectStats) return;

      const markHeader = markHeaders[item.markIndex];
      if (record[markHeader] === undefined) return;

      subjectStats.totalAppeared++;

      const gradeHeader = gradeHeaders[item.gradeIndex];
      const totMarkStr = record[markHeader] || "0";
      const totGrade = record[gradeHeader] || "F";

      const totMarkNum = parseInt(totMarkStr.replace(/\+/g, "").trim(), 10);
      const isPassed = !isNaN(totMarkNum) && totGrade !== "F";

      if (isPassed) {
        subjectStats.totalPassed++;
        if (totMarkNum >= 60) subjectStats.marks60_Above++;
        else if (totMarkNum >= 51 && totMarkNum <= 59)
          subjectStats.marks51_59++;
        else if (totMarkNum >= 40 && totMarkNum <= 50)
          subjectStats.marks40_50++;
      }
    });
  });

  Object.keys(initialStats).forEach((subjectName) => {
    const stats = initialStats[subjectName];
    if (stats.totalAppeared > 0) {
      const percentage = (stats.totalPassed / stats.totalAppeared) * 100;
      stats.passPercentage = percentage.toFixed(2) + "%";
    }
  });

  return initialStats;
};

interface SimpleCsvConverterProps {
  title: string;
  description: string;
}

export const Sem4Converter: React.FC<SimpleCsvConverterProps> = ({
  title,
  description,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [studentRecords, setStudentRecords] = useState<RawStudentRecord[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [parsedTotIndices, setParsedTotIndices] = useState<any[]>([]);
  const [parsedMarkHeaders, setParsedMarkHeaders] = useState<string[]>([]);
  const [parsedGradeHeaders, setParsedGradeHeaders] = useState<string[]>([]);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload the raw CSV file from the university.",
        variant: "destructive",
      });
      return;
    }

    setRawFile(file);
    setIsLoading(true);
    setAnalysisData(null);
    setStudentRecords([]);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        try {
          const parsed = parseCsvToStructuredData(results.data as any[][]);
          if (parsed.records.length === 0) {
            toast({
              title: "Error",
              description: "No valid student data found in the CSV.",
              variant: "destructive",
            });
          } else {
            setCsvHeaders(parsed.headers);
            setParsedTotIndices(parsed.totIndices);
            setParsedMarkHeaders(parsed.markHeaders);
            setParsedGradeHeaders(parsed.gradeHeaders);
            setStudentRecords(parsed.records);
            toast({
              title: "CSV Parsed",
              description: `Preview loaded for ${parsed.records.length} students.`,
            });
          }
        } catch (error: any) {
          console.error(error);
          toast({
            title: "Parse Error",
            description: error.message || "Failed to map CSV structure.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        toast({
          title: "File Read Error",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      },
    });
  };

  const parseCsvToStructuredData = (data: any[][]): ParsedData => {
    let headerRowIdx = -1;
    let subHeaderRowIdx = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const firstCell = data[i][0] ? data[i][0].toString() : "";
      if (firstCell.includes("Courses")) headerRowIdx = i;
      if (firstCell.includes("Seat No")) subHeaderRowIdx = i;
    }

    if (headerRowIdx === -1 || subHeaderRowIdx === -1) {
      throw new Error("Invalid format. Could not find Course Headers.");
    }

    const subjectNamesRowIdx = headerRowIdx + 1;
    const totalIdx = data[headerRowIdx].findIndex(
      (val: string) => val && val.toUpperCase().includes("TOTAL"),
    );
    const sgpiIdx = data[headerRowIdx].findIndex(
      (val: string) => val && val.toUpperCase().includes("SGPI"),
    );
    const resultIdx = data[headerRowIdx].findIndex(
      (val: string) => val && val.toUpperCase().includes("RESULT"),
    );

    let markHeaders: string[] = [];
    let gradeHeaders: string[] = [];
    let totIndices: any[] = [];
    let dynamicHeaders: string[] = ["Seat No", "Name"];
    let currentCourse = "";
    let currentIndex = 0;

    for (let c = 2; c < totalIdx; c++) {
      let courseCell = data[subjectNamesRowIdx][c];
      if (!courseCell || courseCell.toString().trim() === "") {
        courseCell = data[headerRowIdx][c];
      }

      if (courseCell && courseCell.toString().trim() !== "") {
        currentCourse = courseCell.toString().trim();
      }

      const markCategory = data[subHeaderRowIdx][c]
        ? data[subHeaderRowIdx][c].toString().trim()
        : "";
      if (currentCourse && markCategory) {
        const upperSub = currentCourse.toUpperCase();
        const shortName = SHORT_NAMES[upperSub] || upperSub.substring(0, 15);
        const safeShortName = shortName
          .replace(/[^a-zA-Z0-9]/g, "_")
          .replace(/_+/g, "_");

        const markHead = `${safeShortName}_${markCategory}_Marks`;
        const gradeHead = `${safeShortName}_${markCategory}_Grade`;

        markHeaders.push(markHead);
        gradeHeaders.push(gradeHead);
        dynamicHeaders.push(markHead, gradeHead);

        if (markCategory === "TOT") {
          totIndices.push({
            subjectName: currentCourse,
            markIndex: currentIndex,
            gradeIndex: currentIndex,
          });
        }
        currentIndex++;
      }
    }

    dynamicHeaders.push("Total Marks", "SGPA", "Final Result");

    const records: RawStudentRecord[] = [];
    for (let i = 0; i < data.length; i++) {
      const col0 = data[i][0] ? data[i][0].toString().trim() : "";
      const col1 = data[i][1] ? data[i][1].toString().trim() : "";

      if (col0.match(/^\d+(\.0)?$/) && col1 === "MarksO") {
        const marksRow = data[i];
        const nameRow = data[i + 1] || [];

        const cleanSeatNo = col0.replace(/\.0$/, "").replace(/[^0-9]/g, "");
        let rawName = nameRow[0] ? nameRow[0].toString().trim() : "Unknown";
        if (rawName.startsWith("/")) rawName = rawName.substring(1).trim();

        const record: RawStudentRecord = {
          "Seat No": cleanSeatNo,
          Name: rawName,
          "Total Marks": marksRow[totalIdx]
            ? marksRow[totalIdx].toString().trim()
            : "0",
          SGPA: marksRow[sgpiIdx] ? marksRow[sgpiIdx].toString().trim() : "0",
          "Final Result": marksRow[resultIdx]
            ? marksRow[resultIdx].toString().trim()
            : "N/A",
        };

        let mIdx = 0;
        for (let c = 2; c < totalIdx; c++) {
          const markCategory = data[subHeaderRowIdx][c]
            ? data[subHeaderRowIdx][c].toString().trim()
            : "";
          if (markCategory) {
            const mVal = marksRow[c]
              ? marksRow[c]
                  .toString()
                  .replace(/[EF\*\!]/g, "")
                  .trim()
              : "";
            const gVal = nameRow[c] ? nameRow[c].toString().trim() : "";
            record[markHeaders[mIdx]] = mVal;
            record[gradeHeaders[mIdx]] = gVal;
            mIdx++;
          }
        }
        records.push(record);
      }
    }

    const rows = records.map((r) => dynamicHeaders.map((h) => r[h] || "N/A"));
    return {
      headers: dynamicHeaders,
      rows,
      records,
      totIndices,
      markHeaders,
      gradeHeaders,
    };
  };

  const generateCsvContent = () => {
    const escapeCell = (cell: string) => {
      const strCell = String(cell);
      return strCell.includes(",") ||
        strCell.includes('"') ||
        strCell.includes("\n")
        ? `"${strCell.replace(/"/g, '""')}"`
        : strCell;
    };
    const rows = studentRecords.map((record) =>
      csvHeaders.map((header) => record[header] || "N/A"),
    );
    return [
      csvHeaders.map(escapeCell).join(","),
      ...rows.map((row) => row.map(escapeCell).join(",")),
    ].join("\n");
  };

  const onDownloadCsv = () => {
    if (studentRecords.length === 0 || csvHeaders.length === 0) return;
    const csvContent = generateCsvContent();
    download(
      "converted-sem4-result.csv",
      csvContent,
      "text/csv;charset=utf-8;",
    );
    toast({
      title: "Downloaded!",
      description: "Dynamic CSV file has been saved.",
    });
  };

  const uploadToBackend = async () => {
    if (!rawFile)
      return toast({
        title: "No Data",
        description: "Please upload a file first.",
        variant: "destructive",
      });

    const formData = new FormData();
    formData.append("file", rawFile);

    setIsLoading(true);
    try {
      toast({
        title: "Uploading...",
        description: "Sending raw data to database.",
      });

      const res = await fetch(
        "http://localhost:5000/api/students/upload-csv-sem4",
        {
          method: "POST",
          body: formData,
        },
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Upload failed");

      toast({
        title: "Success",
        description: "Data uploaded. Fetching for analysis...",
      });

      const fetchRes = await fetch(
        "http://localhost:5000/api/students?semester=4",
      );
      if (!fetchRes.ok) throw new Error("Failed to fetch data from DB");

      const dbStudents = await fetchRes.json();
      if (dbStudents.length === 0) {
        toast({
          title: "Warning",
          description: "Database is empty for Semester 4.",
        });
        setIsLoading(false);
        return;
      }

      const recordsFromDB = dbStudents.map((s: any) => s.subjects);
      const analysis = analyzeStudentRecords(
        recordsFromDB,
        parsedTotIndices,
        parsedMarkHeaders,
        parsedGradeHeaders,
      );
      setAnalysisData(analysis);

      toast({ title: "Analysis Ready", description: "Charts generated." });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Connection Error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = studentRecords.length > 0;

  return (
    <div className="w-full space-y-6">
      <Card className="p-6 space-y-6 shadow-sm border border-slate-200 rounded-xl">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" /> Upload Sem 4 CSV
            </label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              disabled={isLoading}
              onClick={(e) => (e.currentTarget.value = "")}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer text-slate-500 bg-slate-50 border-slate-300"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              variant="outline"
              className="w-full border-slate-300 text-slate-700 font-medium"
              onClick={onDownloadCsv}
              disabled={!hasData || isLoading}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />{" "}
              {isLoading ? "Processing..." : "Download Clean CSV"}
            </Button>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              onClick={uploadToBackend}
              disabled={!hasData || isLoading}
            >
              <Database className="w-4 h-4 mr-2" /> Upload to DB & Analyze
            </Button>
          </div>
        </div>
        {hasData && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm font-medium text-blue-600 bg-blue-50 py-2 px-3 rounded-md inline-block">
              {studentRecords.length} student records ready.
            </p>
          </div>
        )}
      </Card>

      {analysisData && Object.keys(analysisData).length > 0 && (
        <Card className="p-6 space-y-4 shadow-sm border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">
              Semester 4 Analysis (Database Live)
            </h3>
          </div>
          <SubjectAnalysisReport analysisData={analysisData} />
        </Card>
      )}
    </div>
  );
};

export default Sem4Converter;
