import React, { useState, useMemo, useRef, useEffect } from "react";
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

// --- Interfaces ---
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
  subjectToppers: { [key: string]: TopperEntry[] };
  malePassed: number;
  maleFailed: number;
  femalePassed: number;
  femaleFailed: number;
  subjectAnalysis: AnalysisData;
  processedData: StudentData[];
  subjectMapping: { [key: string]: string };
}

// --- Subject Analysis Report Component (Charts) ---
const SubjectAnalysisReport: React.FC<{ analysisData: AnalysisData }> = ({
  analysisData,
}) => {
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

// --- PDF Header Helper ---
const getReportHeader = (title: string) => {
  return `<div style="text-align: center; margin-bottom: 20px; font-family: 'Times New Roman', serif; padding: 10px;"><div style="font-size: 14px; font-weight: bold; color: #555;">MANJARA CHARITABLE TRUST</div><h1 style="font-size: 24px; font-weight: 800; margin: 5px 0; color: #1a1a1a;">RAJIV GANDHI INSTITUTE OF TECHNOLOGY, MUMBAI</h1><h2 style="font-size: 18px; margin: 5px 0; color: #777;">Department of Information Technology</h2><h3 style="font-size: 18px; margin-top: 15px; padding-bottom: 5px; border-bottom: 2px solid #555; display: inline-block; color: #dc2626;">${title}</h3></div>`;
};

// --- Download Hook ---
const useDownloadReport = (
  overallSummaryRef: React.RefObject<HTMLDivElement>,
  subjectAnalysisRef: React.RefObject<HTMLDivElement>
) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getFullHtmlContent = (
    contentRef: React.RefObject<HTMLDivElement>,
    title: string
  ) => {
    const content = contentRef.current;
    if (!content) return null;

    const fullHtml = document.createElement("div");
    fullHtml.style.padding = "20px";
    fullHtml.style.backgroundColor = "white";
    fullHtml.style.width = "794px";

    fullHtml.innerHTML = getReportHeader(title);

    const cloned = content.cloneNode(true) as HTMLElement;

    cloned.querySelectorAll("thead").forEach((thead) => {
      const newHead = document.createElement("thead");
      thead.querySelectorAll("tr").forEach((row) => {
        const newRow = document.createElement("tr");
        row.querySelectorAll("th, td").forEach((cell) => {
          const th = document.createElement("th");
          th.innerText = cell.textContent || "";
          if (cell.hasAttribute("rowspan")) th.setAttribute("rowspan", cell.getAttribute("rowspan")!);
          if (cell.hasAttribute("colspan")) th.setAttribute("colspan", cell.getAttribute("colspan")!);
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

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const A4_WIDTH_MM = 210;
      const CUSTOM_TALL_HEIGHT_MM = 1000;
      const pdf = new jsPDF("p", "mm", [A4_WIDTH_MM, CUSTOM_TALL_HEIGHT_MM]);
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const combinedContent = document.createElement("div");
      combinedContent.style.width = "794px";
      combinedContent.style.padding = "20px";
      combinedContent.style.backgroundColor = "white";

      const analysisContentNode = getFullHtmlContent(
        subjectAnalysisRef,
        "RESULT ANALYSIS B.E. SEM VIII (Subjectwise Report)"
      );
      if (analysisContentNode) {
        analysisContentNode.childNodes.forEach((node) =>
          combinedContent.appendChild(node.cloneNode(true))
        );
      }

      const separator = document.createElement("div");
      separator.style.cssText =
        "height: 20px; border-top: 2px solid #333; margin: 20px 0;";
      combinedContent.appendChild(separator);

      const summaryContentNode = getFullHtmlContent(
        overallSummaryRef,
        "RESULT ANALYSIS B.E. SEM VIII (Summary & Toppers)"
      );
      if (summaryContentNode) {
        summaryContentNode.childNodes.forEach((node) =>
          combinedContent.appendChild(node.cloneNode(true))
        );
      }

      analysisHtml = combinedContent;
      document.body.appendChild(analysisHtml);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const analysisCanvas = await html2canvas(analysisHtml, html2canvasOptions);
      const analysisImgData = analysisCanvas.toDataURL("image/jpeg", 1.0);
      const imgHeight = (analysisCanvas.height * pdfWidth) / analysisCanvas.width;
      pdf.addImage(analysisImgData, "JPEG", 0, 0, pdfWidth, imgHeight);
      pdf.save("Result_Analysis_Combined_Tall_Report.pdf");
    } catch (error) {
      console.error("Critical error during PDF generation:", error);
      alert("PDF Generation Failed! Please try downloading as PNG.");
    } finally {
      if (analysisHtml && document.body.contains(analysisHtml)) {
        document.body.removeChild(analysisHtml);
      }
      setIsDownloading(false);
    }
  };

  const downloadPng = async () => {
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
        "RESULT ANALYSIS B.E. SEM VIII (Subjectwise Report)"
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
        "RESULT ANALYSIS B.E. SEM VIII (Summary & Toppers)"
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

// --- Main Component ---
const ResultUploaderAndViewer4: React.FC = () => {
  const [parsedData, setParsedData] = useState<StudentData[]>([]);
  const [subjectMapping, setSubjectMapping] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const subjectAnalysisRef = useRef<HTMLDivElement>(null);
  const overallSummaryRef = useRef<HTMLDivElement>(null);

  const { downloadPdf, downloadPng, isDownloading } = useDownloadReport(
    overallSummaryRef,
    subjectAnalysisRef
  );

  // --- NEW: Fetch Data from Backend (Semester 8) ---
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        // Change semester to 8
        const res = await fetch("http://localhost:5000/api/students?semester=8");
        
        if (!res.ok) throw new Error("Failed to fetch data from server");
        
        const json = await res.json();
        
        if (Array.isArray(json) && json.length > 0) {
            // 1. Map Backend Data to Frontend Format
            const mappedData: StudentData[] = json.map((s: any) => ({
                ...s.subjects, // Spread raw subject columns
                Seat_No: s.seatNo,
                Name: s.name,
                Result: s.results.finalResult,
                SGPI: s.results.sgpi,
                Gender: s.subjects?.Gender || "Unknown",
                Remark: s.subjects?.Remark || "",
                // Default finalStatus (will be recalculated in useMemo)
                finalStatus: s.results.finalResult === "F" ? "Failed" : "Passed" 
            }));

            // 2. Dynamically Determine Subject Mapping
            // We look at the first student record to find columns ending in "_Total"
            const firstRecord = mappedData[0];
            const headers = Object.keys(firstRecord);
            const dynamicSubjectMapping: { [key: string]: string } = {};
            
            headers.forEach((header) => {
              if (header.endsWith("_Total") && header !== "Grand_Total") {
                const subjectName = header.replace(/_/g, " ").replace(" Total", "");
                dynamicSubjectMapping[header] = subjectName;
              }
            });

            setSubjectMapping(dynamicSubjectMapping);
            setParsedData(mappedData);
        } else {
            // No data found
            setParsedData([]); 
        }

      } catch (err: any) {
        console.error(err);
        setError("Could not load data. Ensure the backend is running and data is uploaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

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

      if (studentsWithMarks.length > 0) {
        const sortedStudents = [...studentsWithMarks].sort(
          (a, b) => cleanAndParseInt(b[markKey]) - cleanAndParseInt(a[markKey])
        );

        let toppersList: TopperEntry[] = [];
        let uniqueScores = new Set<number>();

        for (const student of sortedStudents) {
          const currentMark = cleanAndParseInt(student[markKey]);
          if (uniqueScores.size < 2 || uniqueScores.has(currentMark)) {
            toppersList.push({
              name: student.Name,
              marks: currentMark,
              seatNo: student.Seat_No,
            });
            uniqueScores.add(currentMark);
          } else if (
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
          B.E. Semester VIII Result Analysis (Database)
        </h2>
        
        {loading && <p className="text-blue-600 font-semibold animate-pulse">Loading data from database...</p>}
        {error && <p className="text-red-600 font-bold">❌ {error}</p>}
        {!loading && parsedData.length === 0 && !error && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800">
                <p>No records found in the database for Semester 8.</p>
                <p className="text-sm mt-1">Please upload the PDF/Data first via the uploader.</p>
            </div>
        )}
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
                <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                  TOPPER IN SUBJECT (Top Two Scores)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {Object.entries(summary.subjectToppers).map(
                    ([subject, toppers]) => {
                      const rank1Mark = toppers[0]?.marks;
                      const rank2MarkEntry = toppers.find(
                        (s) => s.marks < rank1Mark
                      );
                      const rank2Mark = rank2MarkEntry?.marks;

                      return (
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
                                <th className="p-1 border border-gray-300">
                                  Marks (100)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {toppers.map((student) => {
                                let displayRank: number | string = "";

                                if (student.marks === rank1Mark) {
                                  displayRank = 1;
                                } else if (student.marks === rank2Mark) {
                                  displayRank = 2;
                                } else {
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