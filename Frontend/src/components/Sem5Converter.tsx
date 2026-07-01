import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, BarChart3, Database } from "lucide-react";
import SubjectAnalysisReport from "./SubjectAnalysisReport";

const SHORT_NAMES: Record<string, string> = {
  "INTERNET PROGRAMMING": "IP",
  "COMPUTER NETWORK SECURITY": "CNS",
  "ENTREPRENEURSHIP AND E-BUSINESS": "EEB",
  "SOFTWARE ENGINEERING": "SE",
  "ADVANCE DATA MANAGEMENT TECHNOLOGIES": "ADMT",
  "ADVANCED DATA STRUCTURE AND ANALYSIS": "ADSA",
  "IP LAB": "IP LAB",
  "SECURITY LAB": "SEC LAB",
  "DEVOPS LAB": "DEVOPS LAB",
  "ADVANCE DEVOPS LAB": "ADV DEVOPS LAB",
  "PROFESSIONAL COMMUNICATION AND ETHICS - II (PCE-II)": "PCE II",
  "MINI PROJECT - 2 A WEB BASED BUSINESS MODEL": "MINI PROJ 2A",
  "MINI PROJECT - 2A WEB BASED BUSINESS MODEL": "MINI PROJ 2A",
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
  "Total Marks": string | number;
  SGPA: string | number;
  "Final Result": string;
  [key: string]: any;
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
  records: RawStudentRecord[],
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
      if (record[markHeader] === undefined || record[markHeader] === null)
        return;

      subjectStats.totalAppeared++;

      const gradeHeader = gradeHeaders[item.gradeIndex];
      const rawMark = record[markHeader];
      const totGrade = record[gradeHeader] || "F";

      // --- THE TYPE-SAFE BRIDGE ---
      const totMarkNum =
        typeof rawMark === "number"
          ? rawMark
          : parseInt(
              String(rawMark || "0")
                .replace(/\+/g, "")
                .trim(),
              10,
            );

      const isPassed = !isNaN(totMarkNum) && totGrade !== "F";

      if (isPassed) {
        subjectStats.totalPassed++;
        if (totMarkNum >= 60) {
          subjectStats.marks60_Above++;
        } else if (totMarkNum >= 51 && totMarkNum <= 59) {
          subjectStats.marks51_59++;
        } else if (totMarkNum >= 40 && totMarkNum <= 50) {
          subjectStats.marks40_50++;
        }
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

export const Sem5Converter: React.FC<SimpleCsvConverterProps> = ({
  title,
  description,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

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
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnalysisData(null);
    setStudentRecords([]);

    Papa.parse(file, {
      complete: (results) => {
        try {
          const parsed = parseCsvToStructuredData(results.data as any[][]);
          if (parsed.records.length === 0) {
            toast({
              title: "Error",
              description: "No valid student data found.",
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
              description:
                "Preview loaded. Click 'Upload to Database' to analyze.",
            });
          }
        } catch (error: any) {
          console.error(error);
          toast({
            title: "Parse Error",
            description: error.message || "Failed to map CSV.",
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
    const records: RawStudentRecord[] = [];
    let dynamicHeaders: string[] = [];
    let totIndices: any[] = [];
    let markHeaders: string[] = [];
    let gradeHeaders: string[] = [];
    let extractedSubjects: string[] = [];

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const rowStr = data[i].join(",").toUpperCase();
      if (rowStr.includes("INTERNET PROGRAMMING")) {
        extractedSubjects = data[i]
          .map((s: any) => (s ? s.toString().trim() : ""))
          .filter(
            (s: string) =>
              s !== "" &&
              ![
                "COURSES →",
                "TOTAL",
                "SGPI (GPA)",
                "RESULT",
                "CGPI",
                "RLE",
              ].includes(s.toUpperCase()),
          );

        let currentIndex = 0;
        extractedSubjects.forEach((subName, idx) => {
          const upperSub = subName.toUpperCase();
          const shortName = SHORT_NAMES[upperSub] || upperSub.substring(0, 15);
          const components =
            idx < 5 ? ["ESE", "IA", "TOT"] : ["PR OR", "TW", "TOT"];

          components.forEach((comp) => {
            const safeShortName = shortName
              .replace(/[^a-zA-Z0-9]/g, "_")
              .replace(/_+/g, "_");
            const markHead = `${safeShortName}_${comp}_Marks`;
            const gradeHead = `${safeShortName}_${comp}_Grade`;

            markHeaders.push(markHead);
            gradeHeaders.push(gradeHead);

            if (comp === "TOT") {
              totIndices.push({
                subjectName: subName,
                markIndex: currentIndex,
                gradeIndex: currentIndex,
              });
            }
            currentIndex++;
          });
        });

        dynamicHeaders = [
          "Seat No",
          "Name",
          ...markHeaders,
          ...gradeHeaders,
          "Total Marks",
          "SGPA",
          "Final Result",
        ];
        break;
      }
    }

    if (dynamicHeaders.length === 0) {
      throw new Error(
        "Could not detect subjects row. Standard headers missing.",
      );
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;

      const firstCell = row[0].toString().trim();
      if (/^\d{5,}(\.0)?$/.test(firstCell)) {
        const seatNo = firstCell.replace(".0", "");
        const nameRow = data[i + 1] || [];
        const name = nameRow[0] ? nameRow[0].toString().trim() : "Unknown";

        const record: RawStudentRecord = {
          "Seat No": seatNo,
          Name: name,
          "Total Marks": row[35] ? row[35].toString().trim() : "N/A",
          SGPA: row[36] ? row[36].toString().trim() : "N/A",
          "Final Result": row[37] ? row[37].toString().trim() : "N/A",
        };

        let colIdx = 2;
        extractedSubjects.forEach((subName, subIdx) => {
          const components =
            subIdx < 5 ? ["ESE", "IA", "TOT"] : ["PR OR", "TW", "TOT"];
          const upperSub = subName.toUpperCase();
          const shortName = SHORT_NAMES[upperSub] || upperSub.substring(0, 15);

          components.forEach((comp) => {
            const safeShortName = shortName
              .replace(/[^a-zA-Z0-9]/g, "_")
              .replace(/_+/g, "_");
            const markHead = `${safeShortName}_${comp}_Marks`;
            const gradeHead = `${safeShortName}_${comp}_Grade`;

            record[markHead] =
              row[colIdx] !== undefined
                ? row[colIdx]
                    .toString()
                    .trim()
                    .replace(/[EF\*\!]/g, "")
                : "";
            record[gradeHead] =
              nameRow[colIdx] !== undefined
                ? nameRow[colIdx].toString().trim()
                : "";
            colIdx++;
          });
        });

        records.push(record);
      }
    }

    const rows = records.map((record) =>
      dynamicHeaders.map((header) => record[header] || "N/A"),
    );
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
      "converted-sem5-result.csv",
      csvContent,
      "text/csv;charset=utf-8;",
    );
    toast({ title: "Downloaded!", description: "Dynamic CSV saved." });
  };

  const uploadToBackend = async () => {
    if (studentRecords.length === 0 || csvHeaders.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload and parse a file first.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = generateCsvContent();
    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], "sem5_data.csv", { type: "text/csv" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", "5");

    setIsLoading(true);
    try {
      toast({
        title: "Uploading...",
        description: "Sending data to database.",
      });
      const res = await fetch(
        "http://localhost:5000/api/students/upload-csv-sem5",
        { method: "POST", body: formData },
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Upload failed");

      toast({
        title: "Success",
        description: "Data uploaded. Fetching for analysis...",
      });

      const fetchRes = await fetch(
        "http://localhost:5000/api/students?semester=5",
      );
      if (!fetchRes.ok) throw new Error("Failed to fetch data from DB");

      const dbStudents = await fetchRes.json();
      if (dbStudents.length === 0) {
        toast({
          title: "Warning",
          description: "Database is empty for Semester 5.",
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

      toast({
        title: "Analysis Ready",
        description: "Charts generated from verified Database data.",
      });
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
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Excel/CSV File
            </label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              disabled={isLoading}
              onClick={(e) => (e.currentTarget.value = "")}
            />
          </div>
          <Button
            variant="default"
            className="w-full"
            onClick={onDownloadCsv}
            disabled={!hasData || isLoading}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />{" "}
            {isLoading ? "Processing..." : "Download Clean CSV"}
          </Button>
          <Button
            variant="secondary"
            className="w-full mt-2"
            onClick={uploadToBackend}
            disabled={!hasData || isLoading}
          >
            <Database className="w-4 h-4 mr-2" /> Upload to Database & Analyze
          </Button>
        </div>
        {hasData && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {studentRecords.length} student records ready to process.
            </p>
          </div>
        )}
      </Card>

      {analysisData && Object.keys(analysisData).length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <h3 className="text-lg font-semibold">
              Result Analysis (From Database)
            </h3>
          </div>
          <SubjectAnalysisReport analysisData={analysisData} />
        </Card>
      )}
    </div>
  );
};

export default Sem5Converter;
