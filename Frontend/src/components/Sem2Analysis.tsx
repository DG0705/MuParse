import React, { useState, useMemo, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import SubjectAnalysisReport from "./SubjectAnalysisReport";
import { useToast } from "@/hooks/use-toast";

// --- Interfaces ---
export interface StudentData {
  "Seat No": string;
  Name: string;
  Gender: string;
  Result: string;
  SGPI: string;
  "Eng_Maths-II_Marks": string;
  "Eng_Physics-II_Marks": string;
  "Eng_Chem-II_Marks": string;
  Eng_Graphics_Marks: string;
  "C Prog_Marks": string;
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
}

// --- Constants ---
const subjectMapping: { [key: string]: string } = {
  "Eng_Maths-II_Marks": "Eng. Maths II",
  "Eng_Physics-II_Marks": "Eng. Physics II",
  "Eng_Chem-II_Marks": "Eng. Chem II",
  Eng_Graphics_Marks: "Eng. Graphics",
  "C Prog_Marks": "C Programming",
};
const subjectKeys = Object.keys(subjectMapping);

const teacherAssignment: { [key: string]: string } = {
  "Eng. Maths II": "XYZ",
  "Eng. Physics II": "XYZ",
  "Eng. Chem II": "XYZ",
  "Eng. Graphics": "XYZ",
  "C Programming": "XYZ",
};

// --- PDF/PNG Download Logic ---
const getReportHeader = (title: string) => {
  return `
        <div style="text-align: center; margin-bottom: 20px; font-family: 'Times New Roman', serif; padding: 10px;">
            <div style="font-size: 14px; font-weight: bold; color: #555;">MANJARA CHARITABLE TRUST</div>
            <h1 style="font-size: 24px; font-weight: 800; margin: 5px 0; color: #1a1a1a;">RAJIV GANDHI INSTITUTE OF TECHNOLOGY, MUMBAI</h1>
            <h2 style="font-size: 18px; margin: 5px 0; color: #777;">Department of Information Technology</h2>
            <h3 style="font-size: 18px; margin-top: 15px; padding-bottom: 5px; border-bottom: 2px solid #555; display: inline-block; color: #dc2626;">${title}</h3>
        </div>
    `;
};

const useDownloadReport = (
  overallSummaryRef: React.RefObject<HTMLDivElement>,
  subjectAnalysisRef: React.RefObject<HTMLDivElement>,
) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getFullHtmlContent = (
    contentRef: React.RefObject<HTMLDivElement>,
    title: string,
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
          if (cell.hasAttribute("rowspan"))
            th.setAttribute("rowspan", cell.getAttribute("rowspan")!);
          if (cell.hasAttribute("colspan"))
            th.setAttribute("colspan", cell.getAttribute("colspan")!);
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
    const tempElements: HTMLElement[] = [];

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const A4_WIDTH_MM = 210;
      const CUSTOM_TALL_HEIGHT_MM = 800;
      const pdf = new jsPDF("p", "mm", [A4_WIDTH_MM, CUSTOM_TALL_HEIGHT_MM]);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      let currentYPosition = 0;

      const analysisHtml = getFullHtmlContent(
        subjectAnalysisRef,
        "RESULT ANALYSIS B.E. SEM II (Subjectwise Report)",
      );
      if (analysisHtml) {
        document.body.appendChild(analysisHtml);
        tempElements.push(analysisHtml);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const analysisCanvas = await html2canvas(
          analysisHtml,
          html2canvasOptions,
        );
        const imgHeight =
          (analysisCanvas.height * pdfWidth) / analysisCanvas.width;
        pdf.addImage(
          analysisCanvas.toDataURL("image/jpeg", 1.0),
          "JPEG",
          0,
          currentYPosition,
          pdfWidth,
          imgHeight,
        );
        currentYPosition += imgHeight + 10;
      }

      const summaryHtml = getFullHtmlContent(
        overallSummaryRef,
        "RESULT ANALYSIS B.E. SEM II (Summary & Toppers)",
      );
      if (summaryHtml) {
        document.body.appendChild(summaryHtml);
        tempElements.push(summaryHtml);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const summaryCanvas = await html2canvas(
          summaryHtml,
          html2canvasOptions,
        );
        const imgHeight =
          (summaryCanvas.height * pdfWidth) / summaryCanvas.width;
        pdf.addImage(
          summaryCanvas.toDataURL("image/jpeg", 1.0),
          "JPEG",
          0,
          currentYPosition,
          pdfWidth,
          imgHeight,
        );
      }

      pdf.save("Result_Analysis_Combined_Tall_Report_Sem2.pdf");
    } catch (error) {
      console.error("Critical error during PDF generation:", error);
      alert("PDF Generation Failed! Please try downloading as PNG.");
    } finally {
      tempElements.forEach(
        (el) => document.body.contains(el) && document.body.removeChild(el),
      );
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
        "RESULT ANALYSIS B.E. SEM II (Subjectwise Report)",
      );
      if (page1Html)
        page1Html.childNodes.forEach((node) =>
          combinedContainer?.appendChild(node.cloneNode(true)),
        );
      const separator = document.createElement("div");
      separator.style.cssText =
        "height: 20px; border-top: 1px dashed #ccc; margin: 20px 0;";
      combinedContainer.appendChild(separator);
      const page2Html = getFullHtmlContent(
        overallSummaryRef,
        "RESULT ANALYSIS B.E. SEM II (Summary & Toppers)",
      );
      if (page2Html)
        page2Html.childNodes.forEach((node) =>
          combinedContainer?.appendChild(node.cloneNode(true)),
        );
      document.body.appendChild(combinedContainer);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const canvas = await html2canvas(combinedContainer, html2canvasOptions);
      const link = document.createElement("a");
      link.href = canvas.toDataURL(`image/png`, 1.0);
      link.download = "Result_Analysis_Combined_Sem2.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`Error during PNG generation:`, error);
      alert(`Failed to generate PNG. Check console for details.`);
    } finally {
      if (combinedContainer && document.body.contains(combinedContainer))
        document.body.removeChild(combinedContainer);
      setIsDownloading(false);
    }
  };

  return { downloadPdf, downloadPng, isDownloading };
};

// --- Main Component ---
const Sem2Analysis: React.FC = () => {
  const [parsedData, setParsedData] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const subjectAnalysisRef = useRef<HTMLDivElement>(null);
  const overallSummaryRef = useRef<HTMLDivElement>(null);

  const { downloadPdf, downloadPng, isDownloading } = useDownloadReport(
    overallSummaryRef,
    subjectAnalysisRef,
  );

  // --- Fetch Data from Backend ---
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/api/students/sem2");
        if (!res.ok) throw new Error("Failed to fetch data from server");

        const json = await res.json();
        setParsedData(json);
      } catch (err: any) {
        console.error(err);
        setError("Could not load data. Ensure the backend is running.");
        toast({
          title: "Fetch Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [toast]);

  // --- Calculation Logic ---
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
      } as SummaryData;
    }

    const totalStudents = parsedData.length;

    const malePassed = parsedData.filter(
      (s) =>
        s.Gender === "Male" && (s.Result === "Successful" || s.Result === "P"),
    ).length;

    const maleFailed = parsedData.filter(
      (s) =>
        s.Gender === "Male" && s.Result !== "Successful" && s.Result !== "P",
    ).length;

    const femalePassed = parsedData.filter(
      (s) =>
        s.Gender === "Female" &&
        (s.Result === "Successful" || s.Result === "P"),
    ).length;

    const femaleFailed = parsedData.filter(
      (s) =>
        s.Gender === "Female" && s.Result !== "Successful" && s.Result !== "P",
    ).length;

    const successful = malePassed + femalePassed;
    const passPercentageOverall =
      totalStudents > 0 ? (successful / totalStudents) * 100 : 0;

    const overallToppers = parsedData
      .filter((s) => (s.Result === "Successful" || s.Result === "P") && s.SGPI)
      .sort((a, b) => Number(b.SGPI) - Number(a.SGPI))
      .slice(0, 3);

    const subjectAnalysis: AnalysisData = {};

    // Helper to safely convert incoming strings like "80" or "80.00" to Numbers
    const getNum = (val: any) => {
      if (!val || val === "-") return NaN;
      return Number(val);
    };

    subjectKeys.forEach((markKey) => {
      const subjectName = subjectMapping[markKey];

      const studentsWithMarks = parsedData.filter(
        (student) => !isNaN(getNum(student[markKey])),
      );

      const totalAppeared = studentsWithMarks.length;

      const passMark =
        subjectName === "Eng. Physics II" || subjectName === "Eng. Chem II"
          ? 30
          : 40;

      const marks40_50 = studentsWithMarks.filter((s) => {
        const marks = getNum(s[markKey]);
        return marks >= 40 && marks <= 50;
      }).length;

      const marks51_59 = studentsWithMarks.filter((s) => {
        const marks = getNum(s[markKey]);
        return marks >= 51 && marks <= 59;
      }).length;

      const marks60_Above = studentsWithMarks.filter((s) => {
        const marks = getNum(s[markKey]);
        return marks >= 60;
      }).length;

      const totalPassed = studentsWithMarks.filter((s) => {
        const marks = getNum(s[markKey]);
        return marks >= passMark;
      }).length;

      const passPercentage =
        totalAppeared > 0
          ? ((totalPassed / totalAppeared) * 100).toFixed(2) + "%"
          : "0.00%";

      subjectAnalysis[subjectName] = {
        totalAppeared,
        totalPassed,
        passPercentage,
        marks40_50,
        marks51_59,
        marks60_Above,
        teacher: teacherAssignment[subjectName] || "N/A",
      };
    });

    const subjectToppers: { [key: string]: TopperEntry[] } = {};

    subjectKeys.forEach((markKey) => {
      const sortedStudents = parsedData
        .filter((student) => !isNaN(getNum(student[markKey])))
        .sort((a, b) => getNum(b[markKey]) - getNum(a[markKey]));

      let toppersList: TopperEntry[] = [];
      let uniqueMarks = new Set<number>();

      for (const student of sortedStudents) {
        const currentMark = getNum(student[markKey]);
        if (uniqueMarks.size < 2 || uniqueMarks.has(currentMark)) {
          toppersList.push({
            name: student.Name,
            marks: currentMark,
            seatNo: student["Seat No"],
          });
          uniqueMarks.add(currentMark);
        }
        if (uniqueMarks.size >= 2 && !uniqueMarks.has(currentMark)) break;
      }
      subjectToppers[subjectMapping[markKey]] = toppersList;
    });

    return {
      totalStudents,
      successful,
      passPercentage: passPercentageOverall.toFixed(2),
      overallToppers,
      subjectToppers,
      malePassed,
      maleFailed,
      femalePassed,
      femaleFailed,
      subjectAnalysis,
    } as SummaryData;
  }, [parsedData]);

  // --- Render ---
  return (
    <div className="font-serif p-8 max-w-7xl mx-auto my-5 border border-gray-300 shadow-xl bg-white rounded-lg">
      <div className="text-center mb-6 pb-4 border-b border-dashed border-gray-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          B.E. Semester II Result Analysis (Database)
        </h2>

        {loading && (
          <p className="text-blue-600 font-semibold animate-pulse">
            Loading data from database...
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 p-4 rounded text-red-800 mx-auto max-w-3xl mt-4">
            <p className="font-bold text-lg mb-2">⚠️ Error</p>
            <p>{error}</p>
          </div>
        )}

        {!loading && parsedData.length === 0 && !error && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800">
            <p>No records found in the database for Semester II.</p>
          </div>
        )}

        {!loading && parsedData.length > 0 && (
          <p className="text-green-700 font-medium mt-2">
            Successfully loaded {parsedData.length} records.
          </p>
        )}
      </div>

      {parsedData.length > 0 && (
        <div className="text-center mb-6 space-x-4">
          <button
            onClick={downloadPdf}
            disabled={isDownloading}
            className={`px-6 py-2 rounded-lg text-white font-semibold transition duration-150 ${isDownloading ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 shadow-lg"}`}
          >
            {isDownloading ? "Generating PDF..." : "⬇️ Download as PDF"}
          </button>
          <button
            onClick={downloadPng}
            disabled={isDownloading}
            className={`px-6 py-2 rounded-lg text-white font-semibold transition duration-150 ${isDownloading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 shadow-lg"}`}
          >
            {isDownloading ? "Capturing Image..." : "⬇️ Download as PNG"}
          </button>
        </div>
      )}

      {parsedData.length > 0 && (
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
              <p className="text-base mt-2">
                TOTAL NO. OF STUDENTS APPEARED:{" "}
                <strong className="text-blue-800">
                  {summary.totalStudents}
                </strong>
              </p>
              <p className="text-base">
                TOTAL NO. OF STUDENTS PASSED:{" "}
                <strong className="text-green-600">{summary.successful}</strong>
              </p>
              <p className="text-base">
                OVERALL RESULT:{" "}
                <strong className="text-blue-800">
                  {summary.passPercentage}%
                </strong>
              </p>
            </section>

            <section className="gender-analysis-section mb-8">
              <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                GENDER-WISE ANALYSIS
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
                    <tr className="bg-white">
                      <td className="p-2 border border-black font-semibold text-left">
                        Total No Students Passed
                      </td>
                      <td className="p-2 border border-black text-green-600 font-bold">
                        {summary.malePassed}
                      </td>
                      <td className="p-2 border border-black text-green-600 font-bold">
                        {summary.femalePassed}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="p-2 border border-black font-semibold text-left">
                        Total No Students Failed
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
                      <td className="p-2 border border-black">
                        {summary.malePassed + summary.maleFailed}
                      </td>
                      <td className="p-2 border border-black">
                        {summary.femalePassed + summary.femaleFailed}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="toppers-section mb-8">
              <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                TOPPER IN OVERALL
              </h3>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="p-2 border border-gray-300 font-semibold text-left">
                        RANK
                      </th>
                      <th className="p-2 border border-gray-300 font-semibold text-left">
                        NAME OF THE STUDENT
                      </th>
                      <th className="p-2 border border-gray-300 font-semibold text-center">
                        SGPI (10)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.overallToppers.map((student, index) => (
                      <tr
                        key={student["Seat No"]}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="p-2 border border-gray-300 text-left font-bold">
                          {index + 1}
                        </td>
                        <td className="p-2 border border-gray-300 text-left">
                          {student.Name}
                        </td>
                        <td className="p-2 border border-gray-300 text-center">
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
                      (s) => s.marks < rank1Mark,
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
                                  <td className="p-1 border border-gray-300">
                                    {displayRank}
                                  </td>
                                  <td className="p-1 border border-gray-300 text-left">
                                    {student.name}
                                  </td>
                                  <td className="p-1 border border-gray-300">
                                    {student.marks}
                                  </td>
                                </tr>
                              );
                            })}
                            {toppers.length === 0 && (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="text-center text-gray-500"
                                >
                                  No valid marks recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          </div>

          <section className="detailed-results">
            <h3 className="bg-red-100 p-2 pl-4 mt-6 border-l-4 border-red-700 text-lg font-semibold text-gray-800">
              DETAILED STUDENT SCORE CARD (NOT included in downloads)
            </h3>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-red-50">
                    <th className="p-2 border border-gray-300">Seat No.</th>
                    <th className="p-2 border border-gray-300">Name</th>
                    {subjectKeys.map((key) => (
                      <th key={key} className="p-2 border border-gray-300">
                        {subjectMapping[key]}
                      </th>
                    ))}
                    <th className="p-2 border border-gray-300">SGPI</th>
                    <th className="p-2 border border-gray-300">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((student, index) => (
                    <tr
                      key={student["Seat No"]}
                      className={index % 2 === 0 ? "bg-white" : "bg-red-50"}
                    >
                      <td className="p-2 border border-gray-300">
                        {student["Seat No"]}
                      </td>
                      <td className="p-2 border border-gray-300 text-left">
                        {student.Name}
                      </td>
                      {subjectKeys.map((key) => (
                        <td
                          key={`${student["Seat No"]}-${key}`}
                          className="p-2 border border-gray-300"
                        >
                          {student[key] || "-"}
                        </td>
                      ))}
                      <td className="p-2 border border-gray-300 font-semibold">
                        {student.SGPI || "-"}
                      </td>
                      <td
                        className={`p-2 border border-gray-300 font-bold ${
                          student.Result === "Successful" ||
                          student.Result === "P"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        <strong>{student.Result || "N/A"}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Sem2Analysis;
