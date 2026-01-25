import React, { useMemo, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, BarChart3 } from "lucide-react";

// Import the analysis component for rendering the report
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

// --- Helper Data Structures for Analysis (from SubjectAnalysisReport.tsx) ---
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

// Generate the column headers and the crucial TOT Mark indices
const MARK_HEADERS: string[] = [];
const GRADE_HEADERS: string[] = [];
const TOT_INDICES: { subjectName: string; markIndex: number; gradeIndex: number }[] = [];
let currentIndex = 0;

SUBJECT_RULES.forEach(sub => {
    sub.components.forEach((comp, compIndex) => {
        const fullMarkHeader = `${sub.shortName} - ${comp} (Marks)`;
        const fullGradeHeader = `${sub.shortName} - ${comp} (Grade)`;
        
        MARK_HEADERS.push(fullMarkHeader);
        GRADE_HEADERS.push(fullGradeHeader);

        if (comp === 'TOT') {
            TOT_INDICES.push({
                subjectName: sub.name,
                markIndex: currentIndex, // Index in the 31-mark array
                gradeIndex: currentIndex, // Index in the 31-grade array
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
// --- END: Define Data Structures and Subject Rules ---


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

            // 1. Total Appeared
            subjectStats.totalAppeared++;
            
            // Get the TOT mark and grade for the subject
            const markHeader = MARK_HEADERS[item.markIndex];
            const gradeHeader = GRADE_HEADERS[item.gradeIndex];
            
            const totMarkStr = record[markHeader];
            const totGrade = record[gradeHeader];

            const totMarkNum = parseInt(totMarkStr.replace(/\+/g, '').trim(), 10);
            
            // Check for pass: TOT mark must be a valid number (i.e., not 'F', '!', etc.) 
            // AND the TOT grade must NOT be 'F'
            const isPassed = !isNaN(totMarkNum) && totGrade !== 'F';

            if (isPassed) {
                subjectStats.totalPassed++;

                // 2. Marks Categories
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

    // Finalize Pass Percentage
    Object.keys(initialStats).forEach(subjectName => {
        const stats = initialStats[subjectName];
        if (stats.totalAppeared > 0) {
            const percentage = (stats.totalPassed / stats.totalAppeared) * 100;
            stats.passPercentage = percentage.toFixed(2) + "%";
        }
    });

    return initialStats;
};
// --- END: Result Analysis Function ---


interface SimplePdfConverterProps {
  title: string;
  description: string;
}

export const Sem3Converter: React.FC<SimplePdfConverterProps> = ({
  title,
  description,
}) => {
  const { toast } = useToast();
  const [extractedText, setExtractedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [studentRecords, setStudentRecords] = useState<RawStudentRecord[]>([]);


  useMemo(() => {
    // Setting workerSrc for pdf.js is crucial for client-side processing
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;
  }, []);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setExtractedText("");
    setAnalysisData(null); // Clear previous analysis
    setStudentRecords([]); // Clear previous records

    try {
      toast({ title: "Extracting data from PDF..." });
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.filter(
          (item) => "str" in item
        ) as any[];
        
        textItems.sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) > 5)
            return b.transform[5] - a.transform[5];
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
              if (item.transform[4] > lastItemEndX + 1) {
                pageText += "\t";
              }
            }
          }
          pageText += item.str;
          lastItem = item;
        }
        fullText += pageText + "\n\n";
      }

      setExtractedText(fullText);
      
      // *** New: Process and Analyze Data ***
      const { records } = parseTextToStructuredData(fullText);
      const analysis = analyzeStudentRecords(records);
      setStudentRecords(records);
      setAnalysisData(analysis);
      // **********************************
      
      toast({
        title: "Success!",
        description: `PDF data extracted and ${records.length} records analyzed.`,
      });
      
    } catch (error) {
      console.error("Failed to process PDF:", error);
      toast({
        title: "Error",
        description: "Could not read or process the PDF file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * REPLACED: Implements the specific regex-based parsing logic for the result sheet format.
   * Extracts Seat No, 31 Marks, Total Mark, 31 Grades, Name, SGPA, and Final Result.
   */
  const parseTextToStructuredData = (text: string): { headers: string[]; rows: string[][]; records: RawStudentRecord[] } => {
    const records: RawStudentRecord[] = [];
    
    // Regex to capture one complete student block:
    const studentBlockRegex = /(\d{5})\s*MarksO\s*([\s\S]*?)\s*Grade\s*([\s\S]*?)(?=\d{5}\s*MarksO|\Z)/g;
    
    const cleanedText = text.replace(/\r/g, '').replace(/\n\s{1,}\n/g, '\n\n'); 

    let match;
    while ((match = studentBlockRegex.exec(cleanedText)) !== null) {
        const seatNo = match[1];
        const marksBlock = match[2];
        const gradeAndMetadataBlock = match[3];

        // 1. Extract Marks Tokens (31 subject marks + 1 total mark = 32 tokens expected)
        const marksTokens = marksBlock.match(/[\d+\-EF\*\!]+|[\d]+/g) || [];
        
        const subjectMarks = marksTokens.slice(0, EXPECTED_COMPONENT_COUNT);
        const totalMarks = marksTokens.length > EXPECTED_COMPONENT_COUNT ? marksTokens[EXPECTED_COMPONENT_COUNT] : 'N/A';
        
        // 2. Extract Grade Tokens (31 tokens expected)
        const gradeTokens = gradeAndMetadataBlock.match(/[A-Z\-]+/g) || [];
        const subjectGrades = gradeTokens.slice(0, EXPECTED_COMPONENT_COUNT);
        
        // 3. Extract Name, SGPA, and Final Result
        let name = 'N/A';
        let sgpa = 'N/A';
        let finalResult = 'N/A';
        
        // --- Corrected Name Extraction ---
        let nameStart = 0;
        
        // Find the index right after the 31st grade token to find the start of the name block
        if (subjectGrades.length === EXPECTED_COMPONENT_COUNT) {
             const gradesMatch = gradeAndMetadataBlock.matchAll(/[A-Z\-]+/g);
             let i = 0;
             let lastGradeMatch: RegExpMatchArray | null = null;
             for (const gMatch of gradesMatch) {
                if (i === EXPECTED_COMPONENT_COUNT - 1) { 
                    lastGradeMatch = gMatch;
                    break;
                }
                i++;
             }
             if (lastGradeMatch && lastGradeMatch.index !== undefined) {
                 nameStart = lastGradeMatch.index + lastGradeMatch[0].length;
             }
        }
        
        const nameAndMetadataBlock = gradeAndMetadataBlock.substring(nameStart);

        // Name is everything up to the first occurrence of "C" (credits line).
        const nameSplit = nameAndMetadataBlock.split(/\n\s*C\s*[\d\-]+/); 
        let nameText = nameSplit[0] || 'N/A';

        name = nameText.trim()
            .replace(/\r/g, '')
            .replace(/\n/g, ' ') 
            .replace(/^\/\s*/, '') 
            .replace(/\s+/g, ' '); 
        // --- End Corrected Name Extraction ---

        // The SGPA and Result are typically in the last line (GP*C line)
        const sgpaResultBlock = nameAndMetadataBlock; 
        
        const sgpaResultMatch = sgpaResultBlock.match(/[\d\.-]+\s+([PF])\s*$/);
        
        if (sgpaResultMatch) {
            const finalResultLetter = sgpaResultMatch[1];
            const sgpaMatch = sgpaResultBlock.match(/([\d\.-]+)\s+([PF])\s*$/);
            if (sgpaMatch && sgpaMatch.length > 1) {
                sgpa = sgpaMatch[1];
            } else {
                sgpa = 'N/A';
            }
            finalResult = finalResultLetter;
        } else if (sgpaResultBlock.includes('- -   F')) {
             sgpa = '- -';
             finalResult = 'F';
        }


        // 4. Construct the Final Record object
        const record: RawStudentRecord = {
            'Seat No': seatNo,
            'Name': name,
            'Total Marks': totalMarks,
            'SGPA': sgpa,
            'Final Result': finalResult,
        };

        // Populate Marks
        subjectMarks.forEach((mark, index) => {
            record[MARK_HEADERS[index]] = mark;
        });

        // Populate Grades
        subjectGrades.forEach((grade, index) => {
            record[GRADE_HEADERS[index]] = grade;
        });

        if (subjectMarks.length === EXPECTED_COMPONENT_COUNT && subjectGrades.length === EXPECTED_COMPONENT_COUNT) {
             records.push(record);
        }
    }
    
    // 5. Convert array of objects to array of arrays (rows) for CSV output
    const rows = records.map(record => {
        return FINAL_HEADERS.map(header => record[header] || 'N/A');
    });

    return { headers: FINAL_HEADERS, rows, records };
  };

  const onDownloadCsv = () => {
    if (!extractedText) {
      toast({
        title: "No Data",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    const { headers, rows } = parseTextToStructuredData(extractedText);

    if (rows.length === 0) {
      toast({
        title: "No Data",
        description: "Could not extract structured data from PDF.",
        variant: "destructive",
      });
      return;
    }

    // Escape and format cell for CSV
    const escapeCell = (cell: string) => {
      if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    // Generate CSV with headers and data rows
    const csvLines = [
      headers.map(escapeCell).join(","),
      ...rows.map(row => row.map(escapeCell).join(","))
    ];

    const csv = csvLines.join("\n");

    download("converted-result-sheet.csv", csv, "text/csv;charset=utf-8;");
    toast({
      title: "Downloaded!",
      description: `CSV file with ${headers.length} columns and ${rows.length} student records downloaded.`,
    });
  };

  const hasData = extractedText.length > 0;







const uploadToBackend = async () => {
    if (!extractedText) {
      toast({
        title: "No Data",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    // 1. Generate CSV Data (Same logic as Download)
    const { headers, rows } = parseTextToStructuredData(extractedText);

    if (rows.length === 0) {
      toast({
        title: "No Data",
        description: "Could not extract structured data from PDF.",
        variant: "destructive",
      });
      return;
    }

    const escapeCell = (cell: string) => {
      if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const csvLines = [
      headers.map(escapeCell).join(","),
      ...rows.map(row => row.map(escapeCell).join(","))
    ];
    const csv = csvLines.join("\n");

    // 2. Create File for Upload
    const blob = new Blob([csv], { type: "text/csv" });
    const file = new File([blob], "data.csv", { type: "text/csv" });

    const formData = new FormData();
    formData.append("file", file);
    
    // ⚠️ IMPORTANT: CHANGE THIS NUMBER FOR EACH FILE (3, 4, 5, or 6)
    formData.append("semester", "3"); 

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/students/upload-csv", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      
      if (res.ok) {
        toast({ 
          title: "Success", 
          description: "Data stored in Database! You can now view analysis." 
        });
      } else {
        toast({ 
          title: "Upload Failed", 
          description: json.message || "Unknown error occurred", 
          variant: "destructive" 
        });
      }
    } catch (err) {
      console.error(err);
      toast({ 
        title: "Connection Error", 
        description: "Is the backend server running on port 5000?", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };










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
              <Upload className="w-4 h-4" />
              Upload PDF File
            </label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              disabled={isLoading}
              onClick={(e) => (e.currentTarget.value = "")}
            />
          </div>

          {/* <Button
            variant="default"
            className="w-full"
            onClick={onDownloadCsv}
            disabled={!hasData || isLoading}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {isLoading ? "Processing..." : "Download CSV"}
          </Button> */}
        </div> 

        <Button
            variant="default"
            className="w-full"
            onClick={onDownloadCsv}
            disabled={!hasData || isLoading}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {isLoading ? "Processing..." : "Download CSV"}
          </Button>

          {/* --- ADD THIS NEW BUTTON HERE --- */}
          <Button
            variant="secondary" // Different style to distinguish it
            className="w-full mt-2"
            onClick={uploadToBackend}
            disabled={!hasData || isLoading}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Upload to Database & Analyze
          </Button>






        {hasData && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {studentRecords.length} student records extracted.
            </p>
          </div>
        )}
      </Card>
      
      {/* 3. Conditional Rendering of Analysis Report */}
      {analysisData && Object.keys(analysisData).length > 0 && (
        <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Semester 3 Result Analysis</h3>
            </div>
            <SubjectAnalysisReport analysisData={analysisData} />
        </Card>
      )}
    </div>
  );
};

export default Sem3Converter;