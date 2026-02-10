import React, { useMemo, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, BarChart3, Database } from "lucide-react";
import SubjectAnalysisReport from "./SubjectAnalysisReport";

// --- 1. Define Data Structures and Subject Rules ---
const SUBJECT_RULES: { name: string; components: string[]; shortName: string }[] = [
    { name: "ENGINEERING MATHEMATICS - III", components: ["ESE", "IA", "TOT", "TW"], shortName: "ENGG MATHS - III" },
    { name: "DATA STRUCTURE AND ANALYSIS", components: ["ESE", "IA", "TOT"], shortName: "DSA" },
    { name: "DATABASE MANAGEMENT SYSTEM", components: ["ESE", "IA", "TOT"], shortName: "DBMS" },
    { name: "PRINCIPLE OF COMMUNICATION", components: ["ESE", "IA", "TOT"], shortName: "POC" },
    { name: "PARADIGMS AND COMPUTER PROGRAMMING FUNDAMENTALS", components: ["ESE", "IA", "TOT"], shortName: "PARADIGMS & CPF" },
    { name: "DATA STRUCTURE LAB", components: ["PR OR", "TW", "TOT"], shortName: "DATA STRUCTURE LAB" },
    { name: "SQL LAB", components: ["PR OR", "TW", "TOT"], shortName: "SQL LAB" },
    { name: "COMPUTER PROGRAMMING PARADIGMS LAB", components: ["PR OR", "TW", "TOT"], shortName: "COMP PROG PARADIGMS LAB" },
    { name: "JAVA LAB (SBL)", components: ["PR OR", "TW", "TOT"], shortName: "JAVA LAB (SBL)" },
    { name: "MINI PROJECT - 1A FOR FRONT END / BACKEND APPLICATION USING JAVA", components: ["PR OR", "TW", "TOT"], shortName: "MINI PROJECT - 1A" },
];

const EXPECTED_COMPONENT_COUNT = 31;

// --- Helper Data Structures for Analysis ---
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

// --- Headers Generation ---
const MARK_HEADERS: string[] = [];
const GRADE_HEADERS: string[] = [];
const TOT_INDICES: { subjectName: string; markIndex: number; gradeIndex: number }[] = [];
let currentIndex = 0;

SUBJECT_RULES.forEach(sub => {
    sub.components.forEach((comp) => {
        // Sanitize headers for Database Compatibility
        const safeShortName = sub.shortName
            .replace(/\./g, "")       
            .replace(/\s+/g, "_")     
            .replace(/-/g, "_")       
            .replace(/&/g, "and")     
            .replace(/_+/g, "_");     
        
        const fullMarkHeader = `${safeShortName}_${comp}_Marks`;
        const fullGradeHeader = `${safeShortName}_${comp}_Grade`;
        
        MARK_HEADERS.push(fullMarkHeader);
        GRADE_HEADERS.push(fullGradeHeader);

        if (comp === 'TOT') {
            TOT_INDICES.push({
                subjectName: sub.name,
                markIndex: currentIndex, 
                gradeIndex: currentIndex, 
            });
        }
        currentIndex++;
    });
});

const FINAL_HEADERS: string[] = [
    "Seat No",
    "Name",
    ...MARK_HEADERS,
    ...GRADE_HEADERS,
    "Total Marks",
    "SGPA",
    "Final Result",
];

interface RawStudentRecord {
    'Seat No': string;
    'Name': string;
    'Total Marks': string;
    'SGPA': string;
    'Final Result': string;
    [key: string]: string;
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

// --- 2. Result Analysis Function ---
const analyzeStudentRecords = (records: RawStudentRecord[]): AnalysisData => {
    const initialStats: AnalysisData = {};

    TOT_INDICES.forEach(item => {
        initialStats[item.subjectName] = {
            totalAppeared: 0,
            totalPassed: 0,
            passPercentage: "0.00%",
            marks40_50: 0,
            marks51_59: 0,
            marks60_Above: 0,
            teacher: "N/A (Provide Teacher Data Separately)",
        };
    });

    records.forEach(record => {
        TOT_INDICES.forEach(item => {
            const subjectStats = initialStats[item.subjectName];
            if (!subjectStats) return;

            // Only count if the subject exists in the record
            const markHeader = MARK_HEADERS[item.markIndex];
            if(record[markHeader] === undefined) return;

            subjectStats.totalAppeared++;
            
            const gradeHeader = GRADE_HEADERS[item.gradeIndex];
            const totMarkStr = record[markHeader] || "0";
            const totGrade = record[gradeHeader] || "F";

            const totMarkNum = parseInt(totMarkStr.replace(/\+/g, '').trim(), 10);
            const isPassed = !isNaN(totMarkNum) && totGrade !== 'F';

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

    Object.keys(initialStats).forEach(subjectName => {
        const stats = initialStats[subjectName];
        if (stats.totalAppeared > 0) {
            const percentage = (stats.totalPassed / stats.totalAppeared) * 100;
            stats.passPercentage = percentage.toFixed(2) + "%";
        }
    });

    return initialStats;
};

interface SimplePdfConverterProps {
  title: string;
  description: string;
}

export const Sem3Converter: React.FC<SimplePdfConverterProps> = ({ title, description }) => {
  const { toast } = useToast();
  const [extractedText, setExtractedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [studentRecords, setStudentRecords] = useState<RawStudentRecord[]>([]);

  useMemo(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;
  }, []);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid File Type", description: "Please upload a PDF.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setExtractedText("");
    setAnalysisData(null);
    setStudentRecords([]);

    try {
      toast({ title: "Processing PDF", description: "Extracting text..." });
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.filter((item) => "str" in item) as any[];
        
        textItems.sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) > 5) return b.transform[5] - a.transform[5];
          return a.transform[4] - b.transform[4];
        });
        
        let pageText = "";
        let lastItem: any = null;
        for (const item of textItems) {
          if (lastItem) {
            if (Math.abs(item.transform[5] - lastItem.transform[5]) > 5) {
              pageText += "\n";
            } else {
              const lastItemEndX = lastItem.transform[4] + lastItem.width;
              if (item.transform[4] > lastItemEndX + 1) pageText += "\t";
            }
          }
          pageText += item.str;
          lastItem = item;
        }
        fullText += pageText + "\n\n";
      }

      setExtractedText(fullText);
      
      // Parse Logic
      const { records } = parseTextToStructuredData(fullText);
      setStudentRecords(records);
      
      toast({ title: "PDF Parsed", description: "Preview loaded. Click 'Upload to Database' to analyze." });

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not process PDF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const parseTextToStructuredData = (text: string): { headers: string[]; rows: string[][]; records: RawStudentRecord[] } => {
    const records: RawStudentRecord[] = [];
    const studentBlockRegex = /(\d{5})\s*MarksO\s*([\s\S]*?)\s*Grade\s*([\s\S]*?)(?=\d{5}\s*MarksO|\Z)/g;
    const cleanedText = text.replace(/\r/g, '').replace(/\n\s{1,}\n/g, '\n\n'); 

    let match;
    while ((match = studentBlockRegex.exec(cleanedText)) !== null) {
        const seatNo = match[1];
        const marksBlock = match[2];
        const gradeAndMetadataBlock = match[3];

        const marksTokens = marksBlock.match(/[\d+\-EF\*\!]+|[\d]+/g) || [];
        const subjectMarks = marksTokens.slice(0, EXPECTED_COMPONENT_COUNT);
        const totalMarks = marksTokens.length > EXPECTED_COMPONENT_COUNT ? marksTokens[EXPECTED_COMPONENT_COUNT] : 'N/A';
        
        const gradeTokens = gradeAndMetadataBlock.match(/[A-Z\-]+/g) || [];
        const subjectGrades = gradeTokens.slice(0, EXPECTED_COMPONENT_COUNT);
        
        let name = 'N/A';
        let sgpa = 'N/A';
        let finalResult = 'N/A';
        
        // --- UPDATED NAME EXTRACTION LOGIC ---
        // 1. Calculate nameStart based on the EXPECTED_COMPONENT_COUNT-th grade occurrence
        let nameStart = 0;
        const allGradeMatches = [...gradeAndMetadataBlock.matchAll(/[A-Z\-]+(\+[A-Z])?/g)];
        
        // We look for the grade at index (EXPECTED_COMPONENT_COUNT - 1)
        if (allGradeMatches.length >= EXPECTED_COMPONENT_COUNT) {
             const lastGradeMatch = allGradeMatches[EXPECTED_COMPONENT_COUNT - 1];
             if (lastGradeMatch && lastGradeMatch.index !== undefined) {
                 nameStart = lastGradeMatch.index + lastGradeMatch[0].length;
             }
        } else {
             // Fallback: if we didn't find enough grades, just start from 0 
             // (This avoids "N/A" but might include grades in name, which we clean later)
             nameStart = 0; 
        }

        // 2. Extract the section that contains Name + Metadata
        let rawNameSection = gradeAndMetadataBlock.substring(nameStart);

        // 3. Trim "Garbage" specifically (e.g., " C - - -", " GPC", " GP ", " TOTAL")
        // This splits the string at the first occurrence of these footer markers
        const garbageMatch = rawNameSection.match(/(\s+C\s+[\-\d]|\s+GPC\s|\s+GP\s|\s+TOT\s)/);
        if (garbageMatch && garbageMatch.index !== undefined) {
             rawNameSection = rawNameSection.substring(0, garbageMatch.index);
        }

        // 4. Final Clean: Remove non-name characters (keeping letters, dots, hyphens)
        name = rawNameSection.trim()
            .replace(/[^a-zA-Z\s\.\-']/g, "")
            .replace(/\s+/g, " ")
            .trim();
        // -------------------------------------

        const sgpaResultBlock = gradeAndMetadataBlock.substring(nameStart); 
        const sgpaResultMatch = sgpaResultBlock.match(/[\d\.-]+\s+([PF])\s*$/);
        
        if (sgpaResultMatch) {
            const finalResultLetter = sgpaResultMatch[1];
            const sgpaMatch = sgpaResultBlock.match(/([\d\.-]+)\s+([PF])\s*$/);
            if (sgpaMatch && sgpaMatch.length > 1) sgpa = sgpaMatch[1];
            finalResult = finalResultLetter;
        } else if (sgpaResultBlock.includes('- -   F')) {
             sgpa = '- -';
             finalResult = 'F';
        }

        const record: RawStudentRecord = { 'Seat No': seatNo, 'Name': name, 'Total Marks': totalMarks, 'SGPA': sgpa, 'Final Result': finalResult };
        subjectMarks.forEach((mark, index) => { record[MARK_HEADERS[index]] = mark; });
        subjectGrades.forEach((grade, index) => { record[GRADE_HEADERS[index]] = grade; });

        // Push record even if marks/grades count is slightly off to avoid missing data
        if (subjectMarks.length > 0) records.push(record);
    }
    
    const rows = records.map(record => FINAL_HEADERS.map(header => record[header] || 'N/A'));
    return { headers: FINAL_HEADERS, rows, records };
  };

  const onDownloadCsv = () => {
    if (!extractedText) return;
    const { headers, rows } = parseTextToStructuredData(extractedText);
    if (rows.length === 0) return;

    const escapeCell = (cell: string) => cell.includes(",") || cell.includes('"') || cell.includes("\n") ? `"${cell.replace(/"/g, '""')}"` : cell;
    const csvLines = [headers.map(escapeCell).join(","), ...rows.map(row => row.map(escapeCell).join(","))];

    download("converted-result-sheet.csv", csvLines.join("\n"), "text/csv;charset=utf-8;");
    toast({ title: "Downloaded!", description: "CSV downloaded." });
  };

  // --- UPLOAD & FETCH ANALYZE FUNCTION ---
  const uploadToBackend = async () => {
    if (!extractedText) {
      toast({ title: "No Data", description: "Please upload a PDF first.", variant: "destructive" });
      return;
    }

    const { headers, rows } = parseTextToStructuredData(extractedText);
    if (rows.length === 0) {
      toast({ title: "No Data", description: "No records to upload.", variant: "destructive" });
      return;
    }

    const escapeCell = (cell: string) => cell.includes(",") || cell.includes('"') || cell.includes("\n") ? `"${cell.replace(/"/g, '""')}"` : cell;
    const csvLines = [headers.map(escapeCell).join(","), ...rows.map(row => row.map(escapeCell).join(","))];
    const csv = csvLines.join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const file = new File([blob], "data.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", "3"); 

    setIsLoading(true);
    try {
      toast({ title: "Uploading...", description: "Sending data to database." });
      const res = await fetch("http://localhost:5000/api/students/upload-csv", { method: "POST", body: formData });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || "Upload failed");
      }

      toast({ title: "Success", description: "Data uploaded. Fetching for analysis..." });

      const fetchRes = await fetch("http://localhost:5000/api/students?semester=3");
      if (!fetchRes.ok) throw new Error("Failed to fetch data from DB");
      
      const dbStudents = await fetchRes.json(); 

      if (dbStudents.length === 0) {
        toast({ title: "Warning", description: "Database is empty for Semester 3." });
        setIsLoading(false);
        return;
      }

      const recordsFromDB = dbStudents.map((s: any) => s.subjects);
      
      const analysis = analyzeStudentRecords(recordsFromDB);
      setAnalysisData(analysis);
      
      toast({ title: "Analysis Ready", description: "Charts generated from verified Database data." });

    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Connection Error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = extractedText.length > 0;

  return (
    <div className="w-full space-y-6">
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Upload PDF File</label>
            <Input type="file" accept=".pdf" onChange={(e) => handleFile(e.target.files?.[0] || null)} disabled={isLoading} onClick={(e) => (e.currentTarget.value = "")} />
          </div>
          <Button variant="default" className="w-full" onClick={onDownloadCsv} disabled={!hasData || isLoading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> {isLoading ? "Processing..." : "Download CSV"}
          </Button>
          <Button variant="secondary" className="w-full mt-2" onClick={uploadToBackend} disabled={!hasData || isLoading}>
            <Database className="w-4 h-4 mr-2" /> Upload to Database & Analyze
          </Button>
        </div>
        {hasData && (<div className="pt-4 border-t"><p className="text-sm text-muted-foreground">{studentRecords.length} student records ready to process.</p></div>)}
      </Card>
      
      {analysisData && Object.keys(analysisData).length > 0 && (
        <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /><h3 className="text-lg font-semibold">Result Analysis (From Database)</h3></div>
            <SubjectAnalysisReport analysisData={analysisData} />
        </Card>
      )}
    </div>
  );
};

export default Sem3Converter;