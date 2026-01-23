import React, { useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import SubjectAnalysisReport from "./SubjectAnalysisReport";

export interface StudentData {
  "Seat No": string;
  Name: string;
  Gender: string;
  Result: string;
  SGPI: string;
  [key: string]: string;
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
  subjectKeys: string[];
}

// A comprehensive mapping for all possible SEM VII subjects
const fullSubjectMapping: { [key: string]: string } = {
  AI_DS_II_Marks: "AI & Data Science II",
  IoE_Marks: "Internet of Everything",
  Data_Science_Lab_Marks: "Data Science Lab",
  IOE_Lab_Marks: "IoE Lab",
  Secure_App_Dev_Lab_Marks: "Secure App Dev Lab",
  Open_Source_Lab_Marks: "Open Source Project Lab",
  Major_Project_I_Marks: "Major Project I",
  Prod_Lifecycle_Mgmt_Marks: "Product Lifecycle Management",
  Reliability_Eng_Marks: "Reliability Engineering",
  Mgmt_Info_Sys_Marks: "Management Information System",
  Design_of_Experiments_Marks: "Design of Experiments",
  Operation_Research_Marks: "Operation Research",
  Cyber_Security_Laws_Marks: "Cyber Security and Laws",
  Disaster_Mgmt_Marks: "Disaster Management",
  Energy_Audit_Mgmt_Marks: "Energy Audit & Management",
  Dev_Engineering_Marks: "Development Engineering",
  Storage_Area_Net_Marks: "Storage Area Network",
  HPC_Marks: "High Performance Computing",
  Infra_Security_Marks: "Infrastructure Security",
  Software_Testing_QA_Marks: "Software Testing & QA",
  MANET_Marks: "MANET",
  AR_VR_Marks: "AR – VR",
  Quantum_Computing_Marks: "Quantum Computing",
  Info_Retrieval_Sys_Marks: "Information Retrieval System",
};

const teacherAssignment: { [key: string]: string } = {
  "AI & Data Science II": "Dr. A. B. Cde",
  "Internet of Everything": "Prof. F. G. Hijk",
  "Data Science Lab": "Dr. L. M. Nop",
  "IoE Lab": "Prof. Q. R. Stu",
  "Secure App Dev Lab": "Dr. V. W. Xyz",
  "Open Source Project Lab": "Prof. A. S. Dfg",
  "Major Project I": "Prof. Coordinator",
  "Product Lifecycle Management": "Prof. Elective",
  "Reliability Engineering": "Prof. Elective",
  "Management Information System": "Prof. Elective",
  "Design of Experiments": "Prof. Elective",
  "Operation Research": "Prof. Elective",
  "Cyber Security and Laws": "Prof. Elective",
  "Disaster Management": "Prof. Elective",
  "Energy Audit & Management": "Prof. Elective",
  "Development Engineering": "Prof. Elective",
  "Storage Area Network": "Prof. Elective",
  "High Performance Computing": "Prof. Elective",
  "Infrastructure Security": "Prof. Elective",
  "Software Testing & QA": "Prof. Elective",
  MANET: "Prof. Elective",
  "AR – VR": "Prof. Elective",
  "Quantum Computing": "Prof. Elective",
  "Information Retrieval System": "Prof. Elective",
};

const parseCSV = (
  csvText: string,
): { data: StudentData[]; headers: string[] } => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2)
    throw new Error(
      "CSV file must contain a header and at least one row of data.",
    );
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const data: StudentData[] = lines
    .slice(1)
    .map((line) => {
      const values = line.split(",");
      const row: any = {};
      if (values.length !== headers.length) {
        console.error(
          "Row data length mismatch with header length. Skipping row.",
        );
        return null;
      }
      headers.forEach((header, index) => {
        let value = values[index];
        if (value) {
          if (value.startsWith('="') && value.endsWith('"'))
            value = value.substring(2, value.length - 1);
          value = value.replace(/"/g, "").trim();
        } else {
          value = "";
        }
        row[header] = value;
      });
      return row as StudentData;
    })
    .filter((row): row is StudentData => row !== null);
  return { data, headers };
};

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

      // 🛑 FINAL HEIGHT FIX: Custom page size (A4 width, 1.2m height)
      // A4 width: 210mm. We will set the height to 1200mm (1.2m)
      const A4_WIDTH_MM = 210;
      const CUSTOM_TALL_HEIGHT_MM = 1200; // 120 cm or 1.2 meters

      const pdf = new jsPDF(
        "p", // Portrait orientation
        "mm", // Millimeter unit
        [A4_WIDTH_MM, CUSTOM_TALL_HEIGHT_MM], // Custom [width, height] in mm
      );

      // Since we are creating a very tall PDF, we will only use one page
      // and capture the HTML content in its entirety.
      const pdfWidth = pdf.internal.pageSize.getWidth();

      // --- 1. Combined HTML Content Generation ---
      // For a single tall page, we should combine all content into one HTML element
      // to ensure seamless rendering by html2canvas, rather than two separate pages.
      const combinedContent = document.createElement("div");
      combinedContent.style.width = "794px";
      combinedContent.style.padding = "20px";
      combinedContent.style.backgroundColor = "white";

      // Append Analysis Report content
      const analysisContentNode = getFullHtmlContent(
        subjectAnalysisRef,
        "RESULT ANALYSIS B.E. SEM I (Subjectwise Report)",
      );
      if (analysisContentNode) {
        analysisContentNode.childNodes.forEach((node) =>
          combinedContent.appendChild(node.cloneNode(true)),
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
        "RESULT ANALYSIS B.E. SEM I (Summary & Toppers)",
      );
      if (summaryContentNode) {
        summaryContentNode.childNodes.forEach((node) =>
          combinedContent.appendChild(node.cloneNode(true)),
        );
      }

      analysisHtml = combinedContent; // Rename for consistency in cleanup

      // CRITICAL: Attach to DOM for accurate rendering
      document.body.appendChild(analysisHtml);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Increased wait time for tall content

      const analysisCanvas = await html2canvas(
        analysisHtml,
        html2canvasOptions,
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

  // ... (downloadPng function remains the same as its width is fixed)
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
        "RESULT ANALYSIS B.E. SEM I (Subjectwise Report)",
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
        "RESULT ANALYSIS B.E. SEM I (Summary & Toppers)",
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

const Sem7Analysis: React.FC = () => {
  const [parsedData, setParsedData] = useState<StudentData[]>([]);
  const [subjectKeys, setSubjectKeys] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subjectAnalysisRef = useRef<HTMLDivElement>(null);
  const overallSummaryRef = useRef<HTMLDivElement>(null);
  const { downloadPdf, downloadPng, isDownloading } = useDownloadReport(
    overallSummaryRef,
    subjectAnalysisRef,
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setError(null);
      setParsedData([]);
      setSubjectKeys([]);
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawText = e.target?.result as string;
        try {
          const { data, headers } = parseCSV(rawText);
          // Dynamically find all subject mark columns from the CSV headers
          const dynamicSubjectKeys = headers.filter((h) =>
            h.endsWith("_Marks"),
          );
          setParsedData(data);
          setSubjectKeys(dynamicSubjectKeys);
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
        passPercentage: "0.00",
        overallToppers: [],
        subjectToppers: {},
        malePassed: 0,
        maleFailed: 0,
        femalePassed: 0,
        femaleFailed: 0,
        subjectAnalysis: {},
        subjectKeys: [],
      };
    }

    const malePassed = parsedData.filter(
      (s) => s.Gender === "Male" && s.Result === "Successful",
    ).length;
    const maleFailed = parsedData.filter(
      (s) => s.Gender === "Male" && s.Result !== "Successful",
    ).length;
    const femalePassed = parsedData.filter(
      (s) => s.Gender === "Female" && s.Result === "Successful",
    ).length;
    const femaleFailed = parsedData.filter(
      (s) => s.Gender === "Female" && s.Result !== "Successful",
    ).length;
    const totalStudents = parsedData.length;
    const successful = malePassed + femalePassed;
    const passPercentageOverall =
      totalStudents > 0 ? (successful / totalStudents) * 100 : 0;

    const overallToppers = parsedData
      .filter(
        (s) =>
          s.Result === "Successful" && s.SGPI && !isNaN(parseFloat(s.SGPI)),
      )
      .sort((a, b) => parseFloat(b.SGPI) - parseFloat(a.SGPI))
      .slice(0, 3);

    const subjectAnalysis: AnalysisData = {};
    subjectKeys.forEach((markKey) => {
      const subjectName = fullSubjectMapping[markKey] || markKey; // Fallback to raw key name
      const studentsWithMarks = parsedData.filter(
        (s) => s[markKey] && !isNaN(parseInt(s[markKey])),
      );
      const totalAppeared = studentsWithMarks.length;
      if (totalAppeared === 0) return; // Skip subjects with no students

      const passMark = 40;
      const marks40_50 = studentsWithMarks.filter(
        (s) => parseInt(s[markKey]) >= 40 && parseInt(s[markKey]) <= 50,
      ).length;
      const marks51_59 = studentsWithMarks.filter(
        (s) => parseInt(s[markKey]) >= 51 && parseInt(s[markKey]) <= 59,
      ).length;
      const marks60_Above = studentsWithMarks.filter(
        (s) => parseInt(s[markKey]) >= 60,
      ).length;
      const totalPassed = studentsWithMarks.filter(
        (s) => parseInt(s[markKey]) >= passMark,
      ).length;
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
      const subjectName = fullSubjectMapping[markKey] || markKey;
      const sortedStudents = parsedData
        .filter((s) => s[markKey] && !isNaN(parseInt(s[markKey])))
        .sort((a, b) => parseInt(b[markKey]) - parseInt(a[markKey]));
      if (sortedStudents.length === 0) return;

      let toppersList: TopperEntry[] = [];
      let uniqueMarks = new Set<number>();
      for (const student of sortedStudents) {
        const currentMark = parseInt(student[markKey]);
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
      subjectToppers[subjectName] = toppersList;
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
      subjectKeys,
    };
  }, [parsedData, subjectKeys]);

  return (
    <div className="font-serif p-8 max-w-7xl mx-auto my-5 border border-gray-300 shadow-xl bg-white rounded-lg">
      <div className="text-center mb-6 pb-4 border-b border-dashed border-gray-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Upload B.E. Semester VII Result CSV
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

      {parsedData.length > 0 && (
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
                RESULT ANALYSIS SUMMARY (SEM VII)
              </h3>
            </header>

            <section className="summary-section mb-8">
              <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                OVERALL RESULT
              </h3>
              <p>
                TOTAL STUDENTS APPEARED:{" "}
                <strong className="text-blue-800">
                  {summary.totalStudents}
                </strong>
              </p>
              <p>
                TOTAL STUDENTS PASSED:{" "}
                <strong className="text-green-600">{summary.successful}</strong>
              </p>
              <p>
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
                    <tr>
                      <td className="p-2 border border-black font-semibold text-left">
                        Passed
                      </td>
                      <td className="text-green-600 font-bold">
                        {summary.malePassed}
                      </td>
                      <td className="text-green-600 font-bold">
                        {summary.femalePassed}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-black font-semibold text-left">
                        Failed
                      </td>
                      <td className="text-red-600 font-bold">
                        {summary.maleFailed}
                      </td>
                      <td className="text-red-600 font-bold">
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
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-blue-100">
                      <th>RANK</th>
                      <th>NAME</th>
                      <th>SGPI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.overallToppers.map((s, i) => (
                      <tr key={s["Seat No"]}>
                        <td>{i + 1}</td>
                        <td>{s.Name}</td>
                        <td>{s.SGPI}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="subject-toppers-section mb-8">
              <h3 className="bg-gray-100 p-2 pl-4 mt-6 border-l-4 border-blue-700 text-lg font-semibold text-gray-800">
                SUBJECT TOPPERS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {Object.entries(summary.subjectToppers).map(
                  ([subject, toppers]) => (
                    <div key={subject} className="border p-3">
                      <h4 className="text-center font-bold">{subject}</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {toppers.slice(0, 3).map((t) => (
                            <tr key={t.seatNo}>
                              <td>1</td>
                              <td>{t.name}</td>
                              <td>{t.marks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>

          <section className="detailed-results">
            <h3 className="bg-red-100 p-2 pl-4 mt-6 border-l-4 border-red-700 text-lg font-semibold text-gray-800">
              DETAILED STUDENT SCORE CARD
            </h3>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full border text-xs">
                <thead>
                  <tr className="bg-red-50">
                    <th>Seat No</th>
                    <th>Name</th>
                    {summary.subjectKeys.map((key) => (
                      <th key={key}>{fullSubjectMapping[key] || key}</th>
                    ))}
                    <th>SGPI</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((s) => (
                    <tr key={s["Seat No"]}>
                      <td>{s["Seat No"]}</td>
                      <td>{s.Name}</td>
                      {summary.subjectKeys.map((key) => (
                        <td key={key}>{s[key] || "-"}</td>
                      ))}
                      <td>{s.SGPI}</td>
                      <td
                        className={
                          s.Result === "Successful"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {s.Result}
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

export default Sem7Analysis;
