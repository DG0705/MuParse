import React, { useMemo, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, BarChart3, Database } from "lucide-react";
import SubjectAnalysisReport from "./SubjectAnalysisReport";

const SUBJECT_RULES: { name: string; components: string[]; shortName: string }[] = [
    { name: "ENGINEERING MATHEMATICS - III", components: ["ESE", "IA", "TOT", "TW"], shortName: "ENGG MATHS - III" },
    { name: "DATA STRUCTURES AND ANALYSIS", components: ["ESE", "IA", "TOT"], shortName: "DSA" },
    { name: "DATABASE MANAGEMENT SYSTEM", components: ["ESE", "IA", "TOT"], shortName: "DBMS" },
    { name: "PRINCIPLE OF COMMUNICATION", components: ["ESE", "IA", "TOT"], shortName: "POC" },
    { name: "PARADIGMS AND COMPUTER PROGRAMMING FUNDAMENTALS", components: ["ESE", "IA", "TOT"], shortName: "PARADIGMS and CPF" },
    { name: "DATA STRUCTURE LAB", components: ["PR OR", "TW", "TOT"], shortName: "DATA STRUCTURE LAB" },
    { name: "SQL LAB", components: ["PR OR", "TW", "TOT"], shortName: "SQL LAB" },
    { name: "COMPUTER PROGRAMMING PARADIGMS LAB", components: ["PR OR", "TW", "TOT"], shortName: "COMP PROG PARADIGMS LAB" },
    { name: "JAVA LAB (SBL)", components: ["PR OR", "TW", "TOT"], shortName: "JAVA LAB (SBL)" },
    { name: "MINI PROJECT - 1 A", components: ["PR OR", "TW", "TOT"], shortName: "MINI PROJECT 1A" },
];

const EXPECTED_COMPONENT_COUNT = 31;

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

const MARK_HEADERS: string[] = [];
const GRADE_HEADERS: string[] = [];
const TOT_INDICES: { subjectName: string; markIndex: number; gradeIndex: number }[] = [];
let currentIndex = 0;

SUBJECT_RULES.forEach(sub => {
    sub.components.forEach((comp, compIndex) => {
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

  // --- SEMESTER 3 STATE ---
  const semester = "3";
  const [isATKT, setIsATKT] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // ----------------------

  useMemo(() => {
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
    setAnalysisData(null); 
    setStudentRecords([]); 

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
      const { records } = parseTextToStructuredData(fullText);
      setStudentRecords(records);
      
      toast({
        title: "Success!",
        description: `PDF data extracted and ${records.length} records processed.`,
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

  const parseTextToStructuredData = (text: string): { headers: string[]; rows: string[][]; records: RawStudentRecord[] } => {
    const records: RawStudentRecord[] = [];
    
    const noisePatterns = [
        /MARKS\s+>=80[\s\S]*?GRADE POINT\s*:\s*\d+/g,
        /Result Sheet for S\.E\.[\s\S]*?/g,
        /PREPARED BY[\s\S]*?Page \d of \d/g,
        /Courses →[\s\S]*?MinM[\s\S]*?10/g
    ];
    
    let cleanedText = text;
    noisePatterns.forEach(pattern => {
        cleanedText = cleanedText.replace(pattern, '');
    });

    const studentBlockRegex = /(\d{5,10})\s*Marks[A-Z]?\s*([\s\S]*?)\s*Grade\s*([\s\S]*?)(?=\d{5,10}\s*Marks[A-Z]?|$)/g;

    let match;
    while ((match = studentBlockRegex.exec(cleanedText)) !== null) {
        const seatNo = match[1];
        const marksBlock = match[2];
        const gradeAndMetadataBlock = match[3];

        const marksTokens = marksBlock.match(/[\d+\-EF\*\!]+|[\d]+/g) || [];
        const subjectMarks = marksTokens.slice(0, EXPECTED_COMPONENT_COUNT);
        const totalMarks = marksTokens.length >= EXPECTED_COMPONENT_COUNT ? marksTokens[EXPECTED_COMPONENT_COUNT] : 'N/A';
        
        const gradeTokens = gradeAndMetadataBlock.match(/\b[A-Z]\b|(?:\s|^)[A-Z](?=\s|$)/g) || [];
        const subjectGrades = gradeTokens.slice(0, EXPECTED_COMPONENT_COUNT);
        
        let name = 'N/A';
        const potentialNameParts = gradeAndMetadataBlock
            .replace(/\b[A-Z]\b/g, '')
            .replace(/(?:GP\*?C|GPC|GPA|SGPI|RESULT|TOTAL|Marks[A-Z]?|Grade)/gi, '') 
            .match(/[A-Z\/\s]{5,}/g); 

        if (potentialNameParts && potentialNameParts.length > 0) {
            name = potentialNameParts.sort((a, b) => b.length - a.length)[0]
                .replace(/[\/\n\r]/g, ' ') 
                .replace(/\s+/g, ' ')
                .trim();
        }

        let sgpa = 'N/A';
        let finalResult = 'N/A';
        const resultMatch = gradeAndMetadataBlock.match(/([\d\.]+)\s+([PF])\s*$/);
        
        if (resultMatch) {
            sgpa = resultMatch[1];
            finalResult = resultMatch[2];
        } else if (gradeAndMetadataBlock.includes(' F ')) {
            finalResult = 'F';
        }

        const record: RawStudentRecord = {
            'Seat No': seatNo,
            'Name': name,
            'Total Marks': totalMarks,
            'SGPA': sgpa,
            'Final Result': finalResult,
        };

        subjectMarks.forEach((mark, index) => { record[MARK_HEADERS[index]] = mark; });
        subjectGrades.forEach((grade, index) => { record[GRADE_HEADERS[index]] = grade; });

        if (subjectMarks.length > 0) {
             records.push(record);
        }
    }
    
    const rows = records.map(record => FINAL_HEADERS.map(header => record[header] || 'N/A'));
    return { headers: FINAL_HEADERS, rows, records };
  };

  const onDownloadCsv = () => {
    if (!extractedText) {
      toast({ title: "No Data", description: "Please upload a PDF file first.", variant: "destructive" });
      return;
    }
    const { headers, rows } = parseTextToStructuredData(extractedText);
    if (rows.length === 0) {
      toast({ title: "No Data", description: "Could not extract structured data from PDF.", variant: "destructive" });
      return;
    }
    const escapeCell = (cell: string) => {
      if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };
    const csvLines = [headers.map(escapeCell).join(","), ...rows.map(row => row.map(escapeCell).join(","))];
    const csv = csvLines.join("\n");
    download(`sem${semester}-result-sheet.csv`, csv, "text/csv;charset=utf-8;");
    toast({ title: "Downloaded!", description: `CSV file with ${headers.length} columns and ${rows.length} student records downloaded.` });
  };

  const hasData = extractedText.length > 0;

  const uploadToBackend = async () => {
    if (!extractedText) {
      toast({ title: "No Data", description: "Please upload a PDF file first.", variant: "destructive" });
      return;
    }

    const { headers, rows } = parseTextToStructuredData(extractedText);
    if (rows.length === 0) {
      toast({ title: "No Data", description: "Could not extract structured data from PDF.", variant: "destructive" });
      return;
    }

    const escapeCell = (cell: string) => {
      if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const csvLines = [headers.map(escapeCell).join(","), ...rows.map(row => row.map(escapeCell).join(","))];
    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const file = new File([blob], "data.csv", { type: "text/csv" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", semester); 

    setIsUploading(true);
    try {
      const endpoint = isATKT 
          ? "http://localhost:5000/api/students/upload-atkt-csv" 
          : "http://localhost:5000/api/students/upload-csv";

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const json = await res.json();
      
      if (res.ok) {
        toast({ title: "Success", description: "Data stored in Database! You can now view analysis." });
      } else {
        toast({ title: "Upload Failed", description: json.message || json.error || "Unknown error occurred", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Connection Error", description: "Is the backend server running on port 5000?", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Card className={`p-6 space-y-6 transition-all duration-300 ${isATKT ? 'border-2 border-orange-300' : ''}`}>
        <div className="space-y-2">
          <h2 className={`text-xl font-semibold ${isATKT ? 'text-orange-700' : ''}`}>{title} {isATKT && "(ATKT Mode)"}</h2>
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
              className={isATKT ? "bg-orange-50" : ""}
            />
          </div>
        </div>

        <Button variant="default" className="w-full" onClick={onDownloadCsv} disabled={!hasData || isLoading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {isLoading ? "Processing..." : "Download CSV"}
        </Button>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <input 
              type="checkbox" id={`isAtkt${semester}`} 
              checked={isATKT} onChange={(e) => setIsATKT(e.target.checked)} 
              className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
            />
            <label htmlFor={`isAtkt${semester}`} className="text-sm font-bold text-gray-700 cursor-pointer select-none">
              This is an ATKT Result (Smartly updates existing records)
            </label>
          </div>

          <Button 
            className={`w-full mt-2 ${isATKT ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`} 
            onClick={uploadToBackend} disabled={!hasData || isLoading || isUploading}
          >
            <Database className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : `Upload ${isATKT ? 'ATKT' : 'CSV'} to DB`}
          </Button>
        </div>

        {hasData && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {studentRecords.length} student records extracted.
            </p>
          </div>
        )}
      </Card>
      
      {/* Subject Analysis rendering removed since it was omitted in your original sem 3 file, but you can add it back if needed! */}
    </div>
  );
};

export default Sem3Converter;