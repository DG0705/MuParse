import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as pdfjs from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseStudentsFromTxt,
  toCsv,
  StudentRecord,
  SUBJECT_NAMES,
  ALL_PAPERS_CONFIG,
} from "@/utils/sem7";

const download = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const cleaningRules = {
  "University of Mumbai, Mumbai":
    "FEC101 -Engineering Mathematics -I Term Work:",
  "SEAT NAME OF THE CANDIDATE": "|CR GR GP C*G",
  "CENTRE-COLLEGE": "|CR GR GP C*G",
  "/ - FEMALE, # - 0.229A": "GRADE POINT :",
  "Page No.": "Page No.",
};

function cleanExtractedText(
  rawText: string,
  blocksToRemove: Record<string, string>,
): string {
  let lines = rawText.split(/\n/);
  let inBlockToRemove = false;
  const linesAfterBlockRemoval: string[] = [];
  const startMarkers = Object.keys(blocksToRemove).map((m) =>
    m.replace(/\s+/g, " ").trim(),
  );
  const endMarkers = Object.values(blocksToRemove).map((m) =>
    m.replace(/\s+/g, " ").trim(),
  );
  for (const line of lines) {
    const normalizedLine = line.replace(/\s+/g, " ").trim();
    if (
      !inBlockToRemove &&
      startMarkers.some((marker) => normalizedLine.includes(marker))
    ) {
      inBlockToRemove = true;
    }
    if (!inBlockToRemove) {
      linesAfterBlockRemoval.push(line);
    }
    if (
      inBlockToRemove &&
      endMarkers.some((marker) => normalizedLine.includes(marker))
    ) {
      inBlockToRemove = false;
    }
  }
  const nonBlankLines = linesAfterBlockRemoval.filter(
    (line) => line.trim() !== "",
  );
  const finalLines: string[] = [];
  for (let i = 0; i < nonBlankLines.length; i++) {
    const currentLine = nonBlankLines[i];
    const isCurrentDash = currentLine.trim().startsWith("---");
    const wasPreviousDash =
      i > 0 && nonBlankLines[i - 1].trim().startsWith("---");
    if (isCurrentDash && wasPreviousDash) continue;
    finalLines.push(currentLine);
  }
  return finalLines.join("\n");
}

export const Sem7Converter: React.FC = () => {
  const { toast } = useToast();
  const [rawText, setRawText] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prnFilter, setPrnFilter] = useState("");

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
    setRawText("");
    setCleanedText("");
    setStudents([]);
    try {
      let extractedText = "";
      toast({ title: "Step 1: Extracting Text from PDF..." });
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.filter(
          (item) => "str" in item,
        ) as any[];
        textItems.sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) > 5)
            return b.transform[5] - a.transform[5];
          return a.transform[4] - b.transform[4];
        });
        let pageText = "";
        let lastItem = null;
        for (const item of textItems) {
          if (lastItem) {
            if (Math.abs(item.transform[5] - lastItem.transform[5]) > 5) {
              pageText += "\n";
            } else {
              const lastItemEndX = lastItem.transform[4] + lastItem.width;
              if (item.transform[4] > lastItemEndX + 1) {
                pageText += " ";
              }
            }
          }
          pageText += item.str;
          lastItem = item;
        }
        extractedText += pageText + "\n\n";
      }

      setRawText(extractedText);
      toast({ title: "Step 2: Cleaning Extracted Text..." });
      const textAfterCleaning = cleanExtractedText(
        extractedText,
        cleaningRules,
      );
      setCleanedText(textAfterCleaning);
      toast({ title: "Step 3: Parsing Final Text..." });
      const results = parseStudentsFromTxt(textAfterCleaning);
      setStudents(results);
      if (results.length > 0) {
        toast({
          title: "Success!",
          description: `${results.length} student(s) found.`,
        });
      } else {
        toast({
          title: "No Records Found",
          description: "Could not find student records in the cleaned text.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to handle file:", error);
      toast({
        title: "Error",
        description: "Could not read or process the file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onDownloadCsv = () => {
    if (students.length === 0) {
      toast({
        title: "No Data to Download",
        description: "Please process a file first.",
        variant: "destructive",
      });
      return;
    }

    const prnsToFilter = prnFilter
      .split(/[\s,]+/)
      .map((prn) => prn.trim())
      .filter((prn) => prn.length > 0);

    let studentsToExport = students;

    if (prnsToFilter.length > 0) {
      studentsToExport = students.filter((student) =>
        prnsToFilter.includes(student.prn),
      );
    }

    if (studentsToExport.length === 0) {
      toast({
        title: "No Matching Students Found",
        description: "No students matched the PRN numbers you provided.",
        variant: "destructive",
      });
      return;
    }

    const csv = toCsv(studentsToExport);
    download("students-marks.csv", csv, "text/csv;charset=utf-8;");
  };

  const hasData = students.length > 0;

  const sampleCols = useMemo(() => {
    const markCols = SUBJECT_NAMES.map((name) => `${name} Marks`);
    return ["Seat No", "Name", "Result", "SGPI", ...markCols];
  }, []);



const uploadToBackend = async () => {
    // Check if we have students data
    if (students.length === 0) {
      toast({ 
        title: "No data", 
        description: "Please process a PDF first.",
        variant: "destructive" 
      });
      return;
    }

    // 1. Convert parsed students to CSV string (using existing utility)
    const csvData = toCsv(students);
    
    // 2. Create File Object
    const blob = new Blob([csvData], { type: "text/csv" });
    const file = new File([blob], "data.csv", { type: "text/csv" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", "7"); // Set for Semester 7

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
  }









  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/year4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Year 4
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Semester 7 - PDF to CSV Converter
            </h1>
            <p className="text-sm text-muted-foreground">
              Convert result PDFs to structured CSV format
            </p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="w-full space-y-8">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">
                  1. Upload .pdf File
                </label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  disabled={isLoading}
                  onClick={(e) => (e.currentTarget.value = "")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="prn-filter" className="text-sm font-medium">
                2. (Optional) Filter by PRN Numbers
              </label>
              <Textarea
                id="prn-filter"
                placeholder="Enter PRN numbers, separated by commas or newlines..."
                value={prnFilter}
                onChange={(e) => setPrnFilter(e.target.value)}
                disabled={!hasData || isLoading}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                3. Download Formatted Data
              </label>
              {/* <Button
                variant="outline"
                className="w-full"
                onClick={onDownloadCsv}
                disabled={!hasData || isLoading}
              >
                {isLoading ? "Processing..." : "Download CSV"}
              </Button> */}
            </div>



            <div className="space-y-2">
              <label className="text-sm font-medium">
                3. Actions
              </label>
              <div className="flex flex-col gap-2">
                {/* Existing Download Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onDownloadCsv}
                  disabled={!hasData || isLoading}
                >
                  {isLoading ? "Processing..." : "Download CSV"}
                </Button>

                {/* --- ADD THIS NEW BUTTON HERE --- */}
                <Button
                  variant="default"
                  className="w-full"
                  onClick={uploadToBackend}
                  disabled={!hasData || isLoading}
                >
                  Upload to Database & Analyze
                </Button>
              </div>
            </div>








          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Raw Extracted Text</h2>
              <Textarea
                value={rawText}
                placeholder="Raw text from the uploaded file will appear here..."
                className="min-h-[300px] font-mono text-xs"
                readOnly
              />
            </Card>
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Cleaned Text</h2>
              <Textarea
                value={cleanedText}
                placeholder="Text after your cleaning rules are applied will appear here..."
                className="min-h-[300px] font-mono text-xs"
                readOnly
              />
            </Card>
          </div>
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Final Parsed Data Preview ({students.length} students)
            </h2>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sampleCols.map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasData ? (
                    students.map((s) => (
                      <TableRow key={`${s.seatNo}-${s.prn}`}>
                        <TableCell className="whitespace-nowrap">
                          {s.seatNo}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {s.name}
                        </TableCell>
                        <TableCell>{s.result}</TableCell>
                        <TableCell>{s.sgpi ?? ""}</TableCell>
                        {Array.from(
                          { length: ALL_PAPERS_CONFIG.length },
                          (_, i) => (
                            <TableCell key={`m-${i}`}>
                              {s.papers[i]?.marks ?? ""}
                            </TableCell>
                          ),
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={sampleCols.length}
                        className="h-24 text-center"
                      >
                        No data to display. Upload a file to begin.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Sem7Converter;
