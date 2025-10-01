import React, { useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface StudentData {
  Seat_No: string;
  Name: string;
  Gender: string;
  Result: string;
  SGPI: string;
  Remark?: string;
  isStatisticallySuccessful?: boolean;
  finalStatus: "Passed" | "Failed";
  [key: string]: any;
}
export interface TopperEntry {
  name: string;
  marks: number;
  seatNo: string;
}
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
export interface SummaryData {
  totalStudents: number;
  successful: number;
  passPercentage: string;
  overallToppers: StudentData[];
  // FIX 1: Change to array to store multiple toppers
  subjectToppers: { [key: string]: TopperEntry[] };
  malePassed: number;
  maleFailed: number;
  femalePassed: number;
  femaleFailed: number;
  subjectAnalysis: AnalysisData;
  processedData: StudentData[];
  subjectMapping: { [key: string]: string };
}

const SubjectAnalysisReport: React.FC<{ analysisData: AnalysisData }> = ({
  analysisData,
}) => {
  // ... (SubjectAnalysisReport implementation remains the same) ...

  const chartData = Object.entries(analysisData).map(([subject, stats]) => ({
    subject: subject
      .split(" ")
      .map((s) => s.substring(0, 3))
      .join(""),
    Appeared: stats.totalAppeared,
    Passed: stats.totalPassed,
    "40-50 Marks": stats.marks40_50,
    "51-59 Marks": stats.marks51_59,
    "60+ Marks": stats.marks60_Above,
  }));

  const maxBarValue = Math.max(
    ...Object.values(analysisData).map((s) => s.totalAppeared),
    1
  );
  const chartDomainMax = Math.ceil(maxBarValue / 10) * 10;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border border-gray-400 text-xs shadow-lg">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 border border-gray-400 mt-8">
      <h2 className="text-xl font-bold text-center mb-4">
        SUBJECT-WISE RESULT SUMMARY
      </h2>

      <div className="overflow-x-auto mx-auto mb-8">
        <table className="min-w-full border border-black text-xs text-center">
          <thead>
            <tr className="bg-blue-50">
              <th rowSpan={2} className="p-2 border border-black font-bold">
                SUBJECT
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                NAME OF TEACHER
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                TOTAL STUDENTS APPEARED
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                TOTAL STUDENTS PASSED
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                PASS PERCENTAGE
              </th>
              <th colSpan={3} className="p-2 border border-black font-bold">
                CANDIDATES SCORING
              </th>
            </tr>
            <tr className="bg-blue-50">
              <th className="p-2 border border-black font-bold">40-50 MARKS</th>
              <th className="p-2 border border-black font-bold">51-59 MARKS</th>
              <th className="p-2 border border-black font-bold">
                60 & ABOVE MARKS
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analysisData).map(([subject, stats]) => (
              <tr key={subject} className="even:bg-gray-50">
                <td className="p-2 border border-black font-semibold">
                  {subject}
                </td>
                <td className="p-2 border border-black">{stats.teacher}</td>
                <td className="p-2 border border-black">
                  {stats.totalAppeared}
                </td>
                <td className="p-2 border border-black">{stats.totalPassed}</td>
                <td className="p-2 border border-black font-bold text-green-700">
                  {stats.passPercentage}
                </td>
                <td className="p-2 border border-black">{stats.marks40_50}</td>
                <td className="p-2 border border-black">{stats.marks51_59}</td>
                <td className="p-2 border border-black">
                  {stats.marks60_Above}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <div className="border border-gray-400 p-4 pt-10 h-[400px]">
          <h4 className="text-center font-bold mb-4">
            Result Analysis (Appeared vs. Passed)
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, chartDomainMax]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="Appeared"
                fill="#3B82F6"
                name="Total Students Appeared"
              />
              <Bar
                dataKey="Passed"
                fill="#10B981"
                name="Total Students Passed"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="border border-gray-400 p-4 pt-10 h-[400px]">
          <h4 className="text-center font-bold mb-4">
            Subject-wise Statistical Analysis (Marks Breakdown)
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, chartDomainMax]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="horizontal" verticalAlign="top" align="center" />
              <Bar dataKey="40-50 Marks" fill="#6B7280" name="40-50 MARKS" />
              <Bar dataKey="51-59 Marks" fill="#3B82F6" name="51-59 MARKS" />
              <Bar dataKey="60+ Marks" fill="#F59E0B" name="60 & ABOVE MARKS" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const parseCSV = (csvText: string): StudentData[] => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2)
    throw new Error(
      "CSV file must contain a header and at least one row of data."
    );
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const data = lines.slice(1).map((line) => {
    const rowData = line.split(",");
    const row: any = {};
    headers.forEach((header, index) => {
      let value = rowData[index] ? rowData[index].replace(/"/g, "").trim() : "";
      if (value.startsWith("=")) {
        value = value.substring(1);
      }
      row[header] = value;
    });
    return row as StudentData;
  });
  return data;
};

const getReportHeader = (title: string) => {
  return `<div style="text-align: center; margin-bottom: 20px; font-family: 'Times New Roman', serif; padding: 10px;"><div style="font-size: 14px; font-weight: bold; color: #555;">MANJARA CHARITABLE TRUST</div><h1 style="font-size: 24px; font-weight: 800; margin: 5px 0; color: #1a1a1a;">RAJIV GANDHI INSTITUTE OF TECHNOLOGY, MUMBAI</h1><h2 style="font-size: 18px; margin: 5px 0; color: #777;">Department of Information Technology</h2><h3 style="font-size: 18px; margin-top: 15px; padding-bottom: 5px; border-bottom: 2px solid #555; display: inline-block; color: #dc2626;">${title}</h3></div>`;
};

const useDownloadReport = (
  overallSummaryRef: React.RefObject<HTMLDivElement>,
  subjectAnalysisRef: React.RefObject<HTMLDivElement>
) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getFullHtmlContent = (
    contentRef: React.RefObject<HTMLDivElement>,
    title: string
  ) => {
    // ... (Your fixed getFullHtmlContent logic remains the same)
    const content = contentRef.current;
    if (!content) return null;

    const fullHtml = document.createElement("div");
    fullHtml.style.padding = "20px";
    fullHtml.style.backgroundColor = "white";
    fullHtml.style.width = "794px";

    // Add report header
    fullHtml.innerHTML = getReportHeader(title);

    // Clone table/content and apply explicit styles
    const cloned = content.cloneNode(true) as HTMLElement;

    // Fix thead
    cloned.querySelectorAll("thead").forEach((thead) => {
      const newHead = document.createElement("thead");
      thead.querySelectorAll("tr").forEach((row) => {
        const newRow = document.createElement("tr");
        row.querySelectorAll("th, td").forEach((cell) => {
          const th = document.createElement("th");
          th.innerText = cell.textContent || "";
          if (cell.hasAttribute("rowspan")) {
            th.setAttribute("rowspan", cell.getAttribute("rowspan")!);
          }
          if (cell.hasAttribute("colspan")) {
            th.setAttribute("colspan", cell.getAttribute("colspan")!);
          }
          th.style.border = "1px solid black";
          th.style.padding = "4px 8px";
          th.style.backgroundColor = "#f0f4ff";
          th.style.fontWeight = "bold";
          th.style.textAlign = "center";
          th.style.fontSize = "10px";
          newRow.appendChild(th);
        });
        newHead.appendChild(newRow);
      });
      thead.replaceWith(newHead);
    });

    // Apply explicit borders to all TBODY cells and fix table styling
    cloned.querySelectorAll("tbody td").forEach((cell) => {
      (cell as HTMLElement).style.border = "1px solid black";
      (cell as HTMLElement).style.padding = "4px 8px";
      (cell as HTMLElement).style.fontSize = "10px";
    });
    cloned.querySelectorAll("table").forEach((table) => {
      (table as HTMLElement).style.borderCollapse = "collapse";
      (table as HTMLElement).style.backgroundColor = "white";
      (table as HTMLElement).style.width = "100%";
    });

    fullHtml.appendChild(cloned);
    return fullHtml;
  };
  // ----------------------------------------------------------------------

  const html2canvasOptions = {
    scale: 2.5,
    useCORS: true,
    allowTaint: true,
    svg: true,
    timeout: 15000,
    logging: false,
  } as any;

  const downloadPdf = async () => {
    const summaryContent = overallSummaryRef.current;
    const analysisContent = subjectAnalysisRef.current;

    if (!summaryContent || !analysisContent) return;

    setIsDownloading(true);
    let analysisHtml: HTMLElement | null = null;
    let fullSummaryHtml: HTMLElement | null = null;

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      // FINAL HEIGHT FIX: Custom page size (A4 width, 1.2m height)
      const A4_WIDTH_MM = 210;
      const CUSTOM_TALL_HEIGHT_MM = 1000;

      const pdf = new jsPDF("p", "mm", [A4_WIDTH_MM, CUSTOM_TALL_HEIGHT_MM]);

      const pdfWidth = pdf.internal.pageSize.getWidth();

      // --- 1. Combined HTML Content Generation ---
      const combinedContent = document.createElement("div");
      combinedContent.style.width = "794px";
      combinedContent.style.padding = "20px";
      combinedContent.style.backgroundColor = "white";

      // Append Analysis Report content
      const analysisContentNode = getFullHtmlContent(
        subjectAnalysisRef,
        "RESULT ANALYSIS B.E. SEM I (Subjectwise Report)"
      );
      if (analysisContentNode) {
        analysisContentNode.childNodes.forEach((node) =>
          combinedContent.appendChild(node.cloneNode(true))
        );
      }

      // Add Separator
      const separator = document.createElement("div");
      separator.style.cssText =
        "height: 20px; border-top: 2px solid #333; margin: 20px 0;";
      combinedContent.appendChild(separator);

      // Append Summary Report content
      const summaryContentNode = getFullHtmlContent(
        overallSummaryRef,
        "RESULT ANALYSIS B.E. SEM I (Summary & Toppers)"
      );
      if (summaryContentNode) {
        summaryContentNode.childNodes.forEach((node) =>
          combinedContent.appendChild(node.cloneNode(true))
        );
      }

      analysisHtml = combinedContent;

      // CRITICAL: Attach to DOM for accurate rendering
      document.body.appendChild(analysisHtml);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const analysisCanvas = await html2canvas(
        analysisHtml,
        html2canvasOptions
      );

      const analysisImgData = analysisCanvas.toDataURL("image/jpeg", 1.0);

      // Calculate height of the image to fit the custom PDF width
      const imgHeight =
        (analysisCanvas.height * pdfWidth) / analysisCanvas.width;

      // Add the entire captured image to the first page (it's tall enough!)
      pdf.addImage(analysisImgData, "JPEG", 0, 0, pdfWidth, imgHeight);

      // Save the single, tall PDF page
      pdf.save("Result_Analysis_Combined_Tall_Report.pdf");
    } catch (error) {
      console.error("Critical error during PDF generation:", error);
      alert("PDF Generation Failed! Please try downloading as PNG.");
    } finally {
      // Cleanup: Remove temporary element from DOM
      if (analysisHtml && document.body.contains(analysisHtml)) {
        document.body.removeChild(analysisHtml);
      }
      setIsDownloading(false);
    }
  };

  const downloadPng = async () => {
    // ... (Existing downloadPng logic)
    const summaryContent = overallSummaryRef.current;
    const analysisContent = subjectAnalysisRef.current;

    if (!summaryContent || !analysisContent) return;
    setIsDownloading(true);

    let combinedContainer: HTMLElement | null = null;

    try {
      combinedContainer = document.createElement("div");
      combinedContainer.style.width = "794px";
      combinedContainer.style.backgroundColor = "white";

      const page1Html = getFullHtmlContent(
        subjectAnalysisRef,
        "RESULT ANALYSIS B.E. SEM I (Subjectwise Report)"
      );
      if (page1Html)
        page1Html.childNodes.forEach((node) =>
          combinedContainer?.appendChild(node.cloneNode(true))
        );

      const separator = document.createElement("div");
      separator.style.cssText =
        "height: 20px; border-top: 1px dashed #ccc; margin: 20px 0;";
      combinedContainer.appendChild(separator);

      const page2Html = getFullHtmlContent(
        overallSummaryRef,
        "RESULT ANALYSIS B.E. SEM I (Summary & Toppers)"
      );
      if (page2Html)
        page2Html.childNodes.forEach((node) =>
          combinedContainer?.appendChild(node.cloneNode(true))
        );

      document.body.appendChild(combinedContainer);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const canvas = await html2canvas(combinedContainer, html2canvasOptions);

      const link = document.createElement("a");
      link.href = canvas.toDataURL(`image/png`, 1.0);
      link.download = "Result_Analysis_Combined.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Error during PNG generation:`, error);
      alert(`Failed to generate PNG. Check console for details.`);
    } finally {
      if (combinedContainer && document.body.contains(combinedContainer)) {
        document.body.removeChild(combinedContainer);
      }
      setIsDownloading(false);
    }
  };

  return { downloadPdf, downloadPng, isDownloading };
};

const ResultUploaderAndViewer4: React.FC = () => {
  const [parsedData, setParsedData] = useState<StudentData[]>([]);
  const [subjectMapping, setSubjectMapping] = useState<{
    [key: string]: string;
  }>({});
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subjectAnalysisRef = useRef<HTMLDivElement>(null);
  const overallSummaryRef = useRef<HTMLDivElement>(null);

  const { downloadPdf, downloadPng, isDownloading } = useDownloadReport(
    overallSummaryRef,
    subjectAnalysisRef
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setError(null);
      setParsedData([]);
      setSubjectMapping({});
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawText = e.target?.result as string;
        try {
          const data = parseCSV(rawText);
          if (data.length > 0) {
            const headers = Object.keys(data[0]);
            const dynamicSubjectMapping: { [key: string]: string } = {};
            // Assuming subject total marks headers end with '_Total'
            headers.forEach((header) => {
              if (header.endsWith("_Total") && header !== "Grand_Total") {
                const subjectName = header
                  .replace(/_/g, " ")
                  .replace(" Total", "");
                dynamicSubjectMapping[header] = subjectName;
              }
            });
            setSubjectMapping(dynamicSubjectMapping);
            setParsedData(data);
          } else {
            setError("CSV file is empty or could not be read.");
          }
        } catch (err) {
          setError("Failed to parse CSV. Please check the file format.");
          setParsedData([]);
        }
      };
      reader.readAsText(file);
    }
  };

  const summary: SummaryData = useMemo(() => {
    if (parsedData.length === 0) {
      return {
        totalStudents: 0,
        successful: 0,
        passPercentage: "0.00%",
        overallToppers: [],
        subjectToppers: {},
        malePassed: 0,
        maleFailed: 0,
        femalePassed: 0,
        femaleFailed: 0,
        subjectAnalysis: {},
        processedData: [],
        subjectMapping: {},
      };
    }

    const subjectKeys = Object.keys(subjectMapping);

    const teacherAssignment: { [key: string]: string } = {
      "BIG DATA ANALYTICS": "Dr. S. Verma",
      "BLOCKCHAIN AND DLT": "Prof. A. Singh",
      "BLOCKCHAIN LAB": "Prof. R. Sharma",
      "CLOUD COMPUTING LAB": "Prof. M. Khan",
      ERP: "Dr. P. Desai",
      "KNOWLEDGE MANAGEMENT": "Prof. V. Iyer",
      "MAJOR PROJECT II": "Dr. K. Patil",
      "PROJECT MANAGEMENT": "Prof. J. Mehta",
    };

    const cleanAndParseInt = (value: any): number => {
      if (value === null || typeof value === "undefined") return NaN;
      return parseInt(String(value).replace(/[^0-9]/g, ""), 10);
    };

    const isStatisticallySuccessful = (student: StudentData): boolean => {
      if (
        student.Result?.trim().toUpperCase() !== "P" ||
        student.Remark?.trim().toUpperCase() === "RLE"
      )
        return false;
      for (const key of subjectKeys) {
        const mark = cleanAndParseInt(student[key]);
        if (!isNaN(mark) && mark < 40) return false;
      }
      return true;
    };

    const getFinalStatus = (student: StudentData): "Passed" | "Failed" => {
      return student.Result?.trim().toUpperCase() === "F" ||
        student.Remark?.trim().toUpperCase() === "RLE"
        ? "Failed"
        : "Passed";
    };

    const processedData = parsedData.map((student) => ({
      ...student,
      isStatisticallySuccessful: isStatisticallySuccessful(student),
      finalStatus: getFinalStatus(student),
    }));

    const successfulStudents = processedData.filter(
      (s) => s.isStatisticallySuccessful
    );
    const maleStudents = processedData.filter((s) => s.Gender === "Male");
    const femaleStudents = processedData.filter((s) => s.Gender === "Female");
    const malePassed = maleStudents.filter(
      (s) => s.isStatisticallySuccessful
    ).length;
    const femalePassed = femaleStudents.filter(
      (s) => s.isStatisticallySuccessful
    ).length;

    const overallToppers = [...successfulStudents]
      .filter((s) => s.SGPI && !isNaN(parseFloat(s.SGPI)))
      .sort((a, b) => parseFloat(b.SGPI) - parseFloat(a.SGPI))
      .slice(0, 3);

    const subjectAnalysis: AnalysisData = {};
    // FIX 2A: Change type to TopperEntry[] for multiple toppers
    const subjectToppers: { [key: string]: TopperEntry[] } = {};

    subjectKeys.forEach((markKey) => {
      const subjectName = subjectMapping[markKey];
      const studentsWithMarks = processedData.filter(
        (s) => s[markKey] && !isNaN(cleanAndParseInt(s[markKey]))
      );
      const totalAppeared = studentsWithMarks.length;
      const totalPassed = studentsWithMarks.filter(
        (s) => cleanAndParseInt(s[markKey]) >= 40
      ).length;

      subjectAnalysis[subjectName] = {
        totalAppeared,
        totalPassed,
        passPercentage:
          totalAppeared > 0
            ? ((totalPassed / totalAppeared) * 100).toFixed(2) + "%"
            : "0.00%",
        marks40_50: studentsWithMarks.filter((s) => {
          const m = cleanAndParseInt(s[markKey]);
          return m >= 40 && m <= 50;
        }).length,
        marks51_59: studentsWithMarks.filter((s) => {
          const m = cleanAndParseInt(s[markKey]);
          return m >= 51 && m <= 59;
        }).length,
        marks60_Above: studentsWithMarks.filter(
          (s) => cleanAndParseInt(s[markKey]) >= 60
        ).length,
        teacher: teacherAssignment[subjectName] || "N/A",
      };

      // FIX 2B: Logic to capture top two scores (including ties)
      if (studentsWithMarks.length > 0) {
        const sortedStudents = [...studentsWithMarks].sort(
          (a, b) => cleanAndParseInt(b[markKey]) - cleanAndParseInt(a[markKey])
        );

        let toppersList: TopperEntry[] = [];
        let uniqueScores = new Set<number>();

        for (const student of sortedStudents) {
          const currentMark = cleanAndParseInt(student[markKey]);

          // If we have less than 2 unique scores, or the current score matches one of the top two
          if (uniqueScores.size < 2 || uniqueScores.has(currentMark)) {
            toppersList.push({
              name: student.Name,
              marks: currentMark,
              seatNo: student.Seat_No,
            });
            uniqueScores.add(currentMark);
          }

          // If we have 2 unique scores and the current mark is lower than the second highest score, stop.
          else if (
            uniqueScores.size === 2 &&
            currentMark < toppersList[toppersList.length - 1].marks
          ) {
            break;
          }
        }
        subjectToppers[subjectName] = toppersList;
      } else {
        subjectToppers[subjectName] = [];
      }
    });

    const totalStudents = processedData.length;
    const successful = successfulStudents.length;
    const passPercentage =
      totalStudents > 0
        ? ((successful / totalStudents) * 100).toFixed(2)
        : "0.00";

    return {
      totalStudents,
      successful,
      passPercentage,
      overallToppers,
      subjectToppers,
      malePassed,
      maleFailed: maleStudents.length - malePassed,
      femalePassed,
      femaleFailed: femaleStudents.length - femalePassed,
      subjectAnalysis,
      processedData,
      subjectMapping,
    };
  }, [parsedData, subjectMapping]);

  const subjectKeysForTable = Object.keys(summary.subjectMapping);

  return (
    <div className="font-serif p-8 max-w-7xl mx-auto my-5 border border-gray-300 shadow-xl bg-white rounded-lg">
      <div className="text-center mb-6 pb-4 border-b border-dashed border-gray-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Upload Result CSV File
        </h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="p-2 border border-gray-400 rounded-md shadow-sm text-sm"
        />
        {fileName && (
          <p className="mt-2 text-sm text-gray-600">
            Loaded File: <strong className="text-blue-700">{fileName}</strong>
          </p>
        )}
        {error && <p className="mt-2 text-red-600 font-bold">❌ {error}</p>}
      </div>

      {summary.processedData.length > 0 && (
        <>
          <div className="text-center mb-6 space-x-4">
            <button
              onClick={downloadPdf}
              disabled={isDownloading}
              className={`px-6 py-2 rounded-lg text-white font-semibold transition duration-150 ${
                isDownloading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 shadow-lg"
              }`}
            >
              {isDownloading ? "Generating PDF..." : "⬇️ Download as PDF"}
            </button>
            <button
              onClick={downloadPng}
              disabled={isDownloading}
              className={`px-6 py-2 rounded-lg text-white font-semibold transition duration-150 ${
                isDownloading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 shadow-lg"
              }`}
            >
              {isDownloading ? "Capturing Image..." : "⬇️ Download as PNG"}
            </button>
          </div>

          <div className="result-analysis-view">
            <div ref={subjectAnalysisRef}>
              <SubjectAnalysisReport analysisData={summary.subjectAnalysis} />
            </div>

            <div className="my-8 border-t border-dashed border-gray-400"></div>

            <div ref={overallSummaryRef} className="p-4">
              <header className="text-center mb-8">
                <h3 className="text-xl mt-4 pb-1 border-b-2 border-gray-700 inline-block font-semibold text-red-700">
                  RESULT ANALYSIS SUMMARY
                </h3>
              </header>

              <section className="summary-section mb-8">
                <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                  OVERALL RESULT
                </h3>
                <p>
                  TOTAL STUDENTS APPEARED:{" "}
                  <strong>{summary.totalStudents}</strong>
                </p>
                <p>
                  TOTAL STUDENTS (STATISTICALLY PASSED):{" "}
                  <strong>{summary.successful}</strong>
                </p>
                <p>
                  OVERALL PASS PERCENTAGE:{" "}
                  <strong>{summary.passPercentage}%</strong>
                </p>
              </section>

              <section className="gender-analysis-section mb-8">
                <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                  GENDER-WISE ANALYSIS (STATISTICAL)
                </h3>
                <div className="overflow-x-auto mt-4 max-w-xs mx-auto">
                  <table className="min-w-full border border-black text-sm text-center">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="p-2 border border-black font-semibold"></th>
                        <th className="p-2 border border-black font-semibold">
                          Male
                        </th>
                        <th className="p-2 border border-black font-semibold">
                          Female
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border border-black font-semibold text-left">
                          Passed
                        </td>
                        <td className="p-2 border border-black text-green-600 font-bold">
                          {summary.malePassed}
                        </td>
                        <td className="p-2 border border-black text-green-600 font-bold">
                          {summary.femalePassed}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-black font-semibold text-left">
                          Failed
                        </td>
                        <td className="p-2 border border-black text-red-600 font-bold">
                          {summary.maleFailed}
                        </td>
                        <td className="p-2 border border-black text-red-600 font-bold">
                          {summary.femaleFailed}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-bold">
                        <td className="p-2 border border-black text-left">
                          Total
                        </td>
                        <td>{summary.malePassed + summary.maleFailed}</td>
                        <td>{summary.femalePassed + summary.femaleFailed}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="toppers-section mb-8">
                <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                  OVERALL TOPPERS
                </h3>
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="p-2 border border-gray-300 font-semibold text-left">
                          RANK
                        </th>
                        <th className="p-2 border border-gray-300 font-semibold text-left">
                          NAME
                        </th>
                        <th className="p-2 border border-gray-300 font-semibold text-center">
                          SGPI
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.overallToppers.map((student, index) => (
                        <tr key={student.Seat_No}>
                          <td className="p-2 border">{index + 1}</td>
                          <td className="p-2 border">{student.Name}</td>
                          <td className="p-2 border text-center">
                            {student.SGPI}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="subject-toppers-section mb-8">
                {/* The title has been updated to match the target UI */}
                <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                  TOPPER IN SUBJECT (Top Two Scores)
                </h3>
                {/* The main container is now a responsive grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {/* Iterate through each subject in the summary.subjectToppers object */}
                  {Object.entries(summary.subjectToppers).map(
                    ([subject, toppers]) => {
                      // --- Logic to determine Rank 1 and Rank 2 Marks (reused from original) ---
                      const rank1Mark = toppers[0]?.marks; // Rank 1 is the first entry's mark
                      // Find the first student with a score lower than rank 1 (this is rank 2 score)
                      const rank2MarkEntry = toppers.find(
                        (s) => s.marks < rank1Mark
                      );
                      const rank2Mark = rank2MarkEntry?.marks;
                      // --- End Rank Logic ---

                      return (
                        // Individual subject card container
                        <div
                          key={subject}
                          className="border border-green-300 rounded-lg shadow-md p-3 bg-white"
                        >
                          <h4 className="text-center text-base font-bold text-green-700 border-b pb-1 mb-2">
                            {subject}
                          </h4>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-green-50">
                                <th className="p-1 border border-gray-300">
                                  Rank
                                </th>
                                <th className="p-1 border border-gray-300 text-left">
                                  Name
                                </th>
                                {/* Assuming all papers are out of 100 for the column header for simplicity, matching the target UI */}
                                <th className="p-1 border border-gray-300">
                                  Marks (100)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Iterate through students in the current subject's toppers array */}
                              {toppers.map((student) => {
                                let displayRank: number | string = "";

                                // Determine rank for the current student
                                if (student.marks === rank1Mark) {
                                  displayRank = 1;
                                } else if (student.marks === rank2Mark) {
                                  displayRank = 2;
                                } else {
                                  // Exclude students outside the top two unique scores (and their ties)
                                  return null;
                                }

                                return (
                                  <tr
                                    key={student.seatNo}
                                    className={
                                      displayRank === 1
                                        ? "bg-yellow-50 font-semibold"
                                        : "bg-white"
                                    }
                                  >
                                    <td className="p-1 border border-gray-300 text-center">
                                      {displayRank}
                                    </td>
                                    <td className="p-1 border border-gray-300 text-left">
                                      {student.name}
                                    </td>
                                    <td className="p-1 border border-gray-300 text-center">
                                      {student.marks.toString()}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Fallback for no marks recorded */}
                              {toppers.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="text-center text-gray-500 p-2"
                                  >
                                    No valid marks recorded.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            </div>

            <section className="detailed-results">
              <h3 className="bg-red-100 p-2 pl-4 mt-6 border-l-4 border-red-700 text-lg font-semibold text-gray-800">
                DETAILED STUDENT SCORE CARD
              </h3>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full border border-gray-300 text-xs text-center">
                  <thead>
                    <tr className="bg-red-50">
                      <th className="p-2 border">Seat No.</th>
                      <th className="p-2 border text-left">Name</th>
                      {subjectKeysForTable.map((key) => (
                        <th className="p-2 border" key={key}>
                          {summary.subjectMapping[key]}
                        </th>
                      ))}
                      <th className="p-2 border">SGPI</th>
                      <th className="p-2 border">Official Final Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.processedData.map((student) => (
                      <tr key={student.Seat_No}>
                        <td className="p-1 border">{student.Seat_No}</td>
                        <td className="p-1 border text-left">{student.Name}</td>
                        {subjectKeysForTable.map((key) => (
                          <td className="p-1 border" key={key}>
                            {student[key] || "-"}
                          </td>
                        ))}
                        <td className="p-1 border font-semibold">
                          {student.SGPI || "-"}
                        </td>
                        <td
                          className={`p-1 border font-bold ${
                            student.finalStatus === "Passed"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {student.finalStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultUploaderAndViewer4;
