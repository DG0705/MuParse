import React, { useMemo, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  parseStudentsFromTxt,
  toCsv,
  StudentRecord,
  SUBJECT_NAMES_SEM2 as SUBJECT_NAMES,
} from "@/utils/dummy1";

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
    "FEC201 TW-Engineering Mathematics-II Term Work:",
  "SEAT NAME OF THE CANDIDATE": "|CR GR GP C*G",
  "CENTRE-COLLEGE": "|CR GR GP C*G",
  "/ - FEMALE, # - 0.229A": "GRADE POINT :",
  "Page No.": "Page No.",
};

function cleanExtractedText(
  rawText: string,
  blocksToRemove: Record<string, string>
): string {
  let lines = rawText.split(/\n/);
  let inBlockToRemove = false;
  const linesAfterBlockRemoval: string[] = [];
  const startMarkers = Object.keys(blocksToRemove).map((m) =>
    m.replace(/\s+/g, " ").trim()
  );
  const endMarkers = Object.values(blocksToRemove).map((m) =>
    m.replace(/\s+/g, " ").trim()
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
    (line) => line.trim() !== ""
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

export const Dummy1: React.FC = () => {
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
          (item) => "str" in item
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
        cleaningRules
      );
      setCleanedText(textAfterCleaning);
      toast({ title: "Step 3: Parsing Final Text..." });
      const results = parseStudentsFromTxt(textAfterCleaning);
      setStudents(results);
      if (results.length > 0) {
        toast({
          title: "Success!",
          description: `${results.length+1} student(s) found.`,
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
        prnsToFilter.includes(student.prn)
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
    download("sem2-students-marks.csv", csv, "text/csv;charset=utf-8;");
  };

  const hasData = students.length > 0;

  const sampleCols = useMemo(() => {
    const markCols = SUBJECT_NAMES.map((name) => `${name} Marks`);
    return ["Seat No", "Name", "Result", "SGPI", ...markCols];
  }, []);

  return (
    <div className="w-full space-y-8">
      <Card className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">
              1. Upload Sem 2 PDF File
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
          <Button
            variant="outline"
            className="w-full"
            onClick={onDownloadCsv}
            disabled={!hasData || isLoading}
          >
            {isLoading ? "Processing..." : "Download CSV"}
          </Button>
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
                    <TableCell className="min-w-[200px]">{s.name}</TableCell>
                    <TableCell>{s.result}</TableCell>
                    <TableCell>{s.sgpi ?? ""}</TableCell>
                    {Array.from({ length: 13 }, (_, i) => (
                      <TableCell key={`m-${i}`}>
                        {s.papers[i]?.marks ?? ""}
                      </TableCell>
                    ))}
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
  );
};

export default Dummy1;
