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
  Eng_Maths_I_Marks: string;
  Eng_Physics_I_Marks: string;
  Eng_Chem_I_Marks: string;
  Eng_Mechanics_Marks: string;
  Basic_Elec_Eng_Marks: string;
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
}

const subjectMapping: { [key: string]: string } = {
  Eng_Maths_I_Marks: "Eng. Maths I",
  Eng_Physics_I_Marks: "Eng. Physics I",
  Eng_Chem_I_Marks: "Eng. Chem I",
  Eng_Mechanics_Marks: "Mechanics",
  Basic_Elec_Eng_Marks: "Basic Elec. Eng.",
};
const subjectKeys = Object.keys(subjectMapping);

const teacherAssignment: { [key: string]: string } = {
  "Eng. Maths I": "Prof. A. N. Sharma",
  "Eng. Physics I": "Dr. R. K. Singh",
  "Eng. Chem I": "Prof. S. B. Patil",
  Mechanics: "Dr. A. A. Khan",
  "Basic Elec. Eng.": "Prof. J. M. Desai",
};

const parseCSV = (csvText: string): StudentData[] => {
  // ... (Your existing parseCSV implementation)
  const lines = csvText.trim().split("\n");
  if (lines.length < 2)
    throw new Error(
      "CSV file must contain a header and at least one row of data."
    );

  const headers = lines[0].split(",");

  const data: StudentData[] = lines
    .slice(1)
    .map((line) => {
      const values = line.split(",");
      const row: any = {};

      if (values.length !== headers.length) {
        console.error(
          "Row data length mismatch with header length. Skipping row."
        );
        return null;
      }

      headers.forEach((header, index) => {
        const key = header.replace(/"/g, "").trim();
        let value = values[index];
        if (value && value.startsWith('="')) {
          value = value.substring(2, value.length - 1);
        } else {
          value = value ? value.replace(/"/g, "").trim() : "";
        }
        row[key] = value;
      });

      return row as StudentData;
    })
    .filter((row): row is StudentData => row !== null);

  return data;
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

    // Array to hold temporary HTML elements attached to the DOM for rendering
    const tempElements: HTMLElement[] = [];

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Define the custom tall page size
      const A4_WIDTH_MM = 210;
      const CUSTOM_TALL_HEIGHT_MM = 800; // 120 cm or 1.2 meters (Large enough to contain content)

      // 1. Initialize PDF with the custom TALL page size
      const pdf = new jsPDF(
        "p",
        "mm",
        [A4_WIDTH_MM, CUSTOM_TALL_HEIGHT_MM] // Use the tall size
      );

      // Calculate PDF width in pixels for image scaling
      const pdfWidth = pdf.internal.pageSize.getWidth(); // This is in 'mm'

      let currentYPosition = 0; // Tracks the vertical position to place the next image

      // --- 1. CAPTURE & ADD SUBJECT ANALYSIS REPORT ---
      const analysisHtml = getFullHtmlContent(
        subjectAnalysisRef,
        "RESULT ANALYSIS B.E. SEM I (Subjectwise Report)"
      );

      if (analysisHtml) {
        document.body.appendChild(analysisHtml);
        tempElements.push(analysisHtml);
        await new Promise((resolve) => setTimeout(resolve, 100));

        const analysisCanvas = await html2canvas(
          analysisHtml,
          html2canvasOptions
        );
        const analysisImgData = analysisCanvas.toDataURL("image/jpeg", 1.0);

        // Calculate the image height in 'mm' based on the PDF width
        const imgHeight =
          (analysisCanvas.height * pdfWidth) / analysisCanvas.width;

        pdf.addImage(
          analysisImgData,
          "JPEG",
          0,
          currentYPosition,
          pdfWidth,
          imgHeight
        );
        currentYPosition += imgHeight; // Update the Y position for the next element
        currentYPosition += 10; // Add a small margin/separator space
      }

      // --- 2. CAPTURE & ADD OVERALL SUMMARY REPORT ---
      const summaryHtml = getFullHtmlContent(
        overallSummaryRef,
        "RESULT ANALYSIS B.E. SEM I (Summary & Toppers)"
      );

      if (summaryHtml) {
        document.body.appendChild(summaryHtml);
        tempElements.push(summaryHtml);
        await new Promise((resolve) => setTimeout(resolve, 100));

        const summaryCanvas = await html2canvas(
          summaryHtml,
          html2canvasOptions
        );
        const summaryImgData = summaryCanvas.toDataURL("image/jpeg", 1.0);

        // Calculate the image height in 'mm' based on the PDF width
        const imgHeight =
          (summaryCanvas.height * pdfWidth) / summaryCanvas.width;

        // Add to the PDF starting from the new Y position
        pdf.addImage(
          summaryImgData,
          "JPEG",
          0,
          currentYPosition,
          pdfWidth,
          imgHeight
        );
        currentYPosition += imgHeight;
      }

      // NOTE: The height of the page is now fixed at 1200mm, but the content will only
      // occupy the space required by the two rendered images.

      // Save the single, tall PDF page
      pdf.save("Result_Analysis_Combined_Tall_Report.pdf");
    } catch (error) {
      console.error("Critical error during PDF generation:", error);
      alert("PDF Generation Failed! Please try downloading as PNG.");
    } finally {
      // Cleanup: Remove all temporary elements from DOM
      tempElements.forEach((el) => {
        if (document.body.contains(el)) {
          document.body.removeChild(el);
        }
      });
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

const ResultUploaderAndViewer: React.FC = () => {
  const [parsedData, setParsedData] = useState<StudentData[]>([]);
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

      const reader = new FileReader();
      reader.onload = (e) => {
        const rawText = e.target?.result as string;
        try {
          const data = parseCSV(rawText);
          setParsedData(data);
        } catch (err) {
          setError(
            "Failed to parse the CSV file. Please ensure it's the correct format."
          );
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
      } as SummaryData;
    }

    const malePassed = parsedData.filter(
      (s) => s.Gender === "Male" && s.Result === "Successful"
    ).length;
    const maleFailed = parsedData.filter(
      (s) =>
        s.Gender === "Male" &&
        (s.Result === "Unsuccessful" || s.Result === "ABS")
    ).length;
    const femalePassed = parsedData.filter(
      (s) => s.Gender === "Female" && s.Result === "Successful"
    ).length;
    const femaleFailed = parsedData.filter(
      (s) =>
        s.Gender === "Female" &&
        (s.Result === "Unsuccessful" || s.Result === "ABS")
    ).length;
    const totalStudents = parsedData.length;
    const successful = malePassed + femalePassed;
    const passPercentageOverall =
      totalStudents > 0 ? (successful / totalStudents) * 100 : 0;

    const overallToppers = parsedData
      .filter((s) => s.Result === "Successful" && !isNaN(parseFloat(s.SGPI)))
      .sort((a, b) => parseFloat(b.SGPI) - parseFloat(a.SGPI))
      .slice(0, 3);

    const subjectAnalysis: AnalysisData = {};
    subjectKeys.forEach((markKey) => {
      const subjectName = subjectMapping[markKey];
      const studentsWithMarks = parsedData.filter(
        (student) => student[markKey] && !isNaN(parseInt(student[markKey]))
      );
      const totalAppeared = studentsWithMarks.length;

      const passMark =
        subjectName === "Eng. Physics I" || subjectName === "Eng. Chem I"
          ? 30
          : 40;

      const marks40_50 = studentsWithMarks.filter((s) => {
        const marks = parseInt(s[markKey]);
        return marks >= 40 && marks <= 50;
      }).length;
      const marks51_59 = studentsWithMarks.filter((s) => {
        const marks = parseInt(s[markKey]);
        return marks >= 51 && marks <= 59;
      }).length;
      const marks60_Above = studentsWithMarks.filter((s) => {
        const marks = parseInt(s[markKey]);
        return marks >= 60;
      }).length;

      const totalPassed = studentsWithMarks.filter((s) => {
        const marks = parseInt(s[markKey]);
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
        .filter(
          (student) => student[markKey] && !isNaN(parseInt(student[markKey]))
        )
        .sort((a, b) => parseInt(b[markKey]) - parseInt(a[markKey]));

      let toppersList: TopperEntry[] = [];
      let uniqueMarks = new Set<number>();

      for (const student of sortedStudents) {
        const currentMark = parseInt(student[markKey]);

        if (uniqueMarks.size < 2 || uniqueMarks.has(currentMark)) {
          if (
            toppersList.length === 0 ||
            currentMark === toppersList[0].marks
          ) {
            toppersList.push({
              name: student.Name,
              marks: currentMark,
              seatNo: student["Seat No"],
            });
            uniqueMarks.add(currentMark);
          } else if (uniqueMarks.size === 1) {
            toppersList.push({
              name: student.Name,
              marks: currentMark,
              seatNo: student["Seat No"],
            });
            uniqueMarks.add(currentMark);
          } else if (
            uniqueMarks.size === 2 &&
            currentMark === toppersList[toppersList.length - 1].marks
          ) {
            toppersList.push({
              name: student.Name,
              marks: currentMark,
              seatNo: student["Seat No"],
            });
            uniqueMarks.add(currentMark);
          }
        }

        if (
          uniqueMarks.size === 2 &&
          currentMark < toppersList[toppersList.length - 1].marks
        ) {
          break;
        }
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

  return (
    <div className="font-serif p-8 max-w-7xl mx-auto my-5 border border-gray-300 shadow-xl bg-white rounded-lg">
      <div className="text-center mb-6 pb-4 border-b border-dashed border-gray-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Upload B.E. Semester I Result CSV
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
                                  <td className="p-1 border border-gray-300">
                                    {displayRank}
                                  </td>
                                  <td className="p-1 border border-gray-300 text-left">
                                    {student.name}
                                  </td>
                                  <td className="p-1 border border-gray-300">
                                    {student.marks.toString()}
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
                  }
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
                          student.Result === "Successful"
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

export default ResultUploaderAndViewer;
