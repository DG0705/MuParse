import React, { useEffect, useState } from "react";
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

const Sem5Analysis = () => {
  const [data, setData] = useState(null);

  // Store teacher names in React State so they can be edited dynamically
  const [teachers, setTeachers] = useState({
    IP_TOT_Marks: "Prof. Kiran Babar",
    CNS_TOT_Marks: "Prof. Pranoti Nage",
    EEB_TOT_Marks: "Prof. Abhay Patil",
    SE_TOT_Marks: "Prof. Pallavi Yaul",
    ADSA_TOT_Marks: "Prof Snehal Bhure",
    ADMT_TOT_Marks: "Prof. Renuka Nagpure",
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/students/sem/5")
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch((err) => console.error(err));
  }, []);

  // Handle Input Changes for Teacher Names
  const handleTeacherChange = (subjectKey, newName) => {
    setTeachers((prev) => ({
      ...prev,
      [subjectKey]: newName,
    }));
  };

  if (!data)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="p-10 text-center text-blue-600 font-bold text-xl animate-pulse">
          Generating Official Report...
        </div>
      </div>
    );

  if (!data.success || !data.analysis) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="p-10 text-center text-red-600 font-bold text-xl bg-red-50 rounded-lg border border-red-200">
          Oops! Something went wrong.
          <br />
          <span className="text-base font-medium text-red-500 mt-2 block">
            {data.message || data.error || "Could not load analysis data."}
          </span>
        </div>
      </div>
    );
  }

  const { analysis } = data;

  // Colors matching the Excel template
  const tableHeaderColor = "bg-[#9bc2e6]";

  // Short clean names so they perfectly fit on the X-Axis horizontally
  const cleanSubjectNames = {
    IP_TOT_Marks: "IP",
    CNS_TOT_Marks: "CNS",
    EEB_TOT_Marks: "EEB",
    SE_TOT_Marks: "SE",
    ADSA_TOT_Marks: "ADSA",
    ADMT_TOT_Marks: "ADMT",
  };

  // Format data for Recharts
  const chartData = analysis.subjectAnalysis.map((sub) => ({
    name: cleanSubjectNames[sub.subject] || sub.subject,
    appeared: sub.appeared,
    passed: sub.passed,
    marks40to50: sub.marks40to50 || 0,
    marks51to59: sub.marks51to59 || 0,
    marks60Plus: sub.marks60Plus || 0,
  }));

  // Fallback for Gender data if backend hasn't updated yet
  const genderStats = analysis.overall.gender || {
    male: { passed: "--", failed: "--", total: "--" },
    female: { passed: "--", failed: "--", total: "--" },
  };

  return (
    <div className="max-w-5xl mx-auto p-10 bg-white text-black min-h-screen font-sans border-4 border-blue-900 m-8 shadow-2xl print:m-0 print:border-none print:shadow-none print:p-8">
      {/* THIS STYLE BLOCK HIDES THE BROWSER URL AND DATE ON PRINT */}
      <style>
        {`
          @media print {
            @page { margin: 0mm; }
          }
        `}
      </style>

      {/* PDF EXPORT BUTTON */}
      <div className="flex justify-end mb-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
              clipRule="evenodd"
            />
          </svg>
          Save as PDF
        </button>
      </div>

      {/* ========================================== */}
      {/* 1. REPORT HEADER */}
      {/* ========================================== */}
      <div className="text-center mb-8 leading-tight">
        <img
          src="IT New logo.png"
          alt="IT New logo"
          className="align-middle mb-4 object-contain mx-auto"
        />
        <h3 className="text-xl font-bold text-gray-900">
          RESULT ANALYSIS T.E. SEMESTER V
        </h3>
        <p className="text-lg font-medium mt-1">Academic Year 2025-26</p>
      </div>

      {/* ========================================== */}
      {/* 2. TOPPER IN OVERALL TABLE */}
      {/* ========================================== */}
      <div className="mb-10 flex flex-col items-center">
        <h4 className="text-xl font-semibold underline decoration-1 underline-offset-4 mb-3 uppercase tracking-wider">
          TOPPER IN OVERALL
        </h4>
        <table className="w-3/4 border-collapse border-2 border-black shadow-sm">
          <thead>
            <tr className={`${tableHeaderColor} text-sm`}>
              <th className="border border-black p-2 w-24">RANK</th>
              <th className="border border-black p-2">NAME OF THE STUDENT</th>
              <th className="border border-black p-2 w-32">SGPI (10)</th>
            </tr>
          </thead>
          <tbody>
            {analysis.topOverall.map((topper, idx) => (
              <tr key={idx} className="text-sm hover:bg-gray-50">
                <td className="border border-black p-1.5 text-center font-bold">
                  {topper.rank}
                </td>
                <td className="border border-black p-1.5 pl-4 uppercase font-medium">
                  {topper.name}
                </td>
                <td className="border border-black p-1.5 text-center font-bold">
                  {topper.sgpi.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========================================== */}
      {/* 3. TOPPER IN SUBJECT TABLE */}
      {/* ========================================== */}
      <div className="mb-12 flex flex-col items-center">
        <h4 className="text-xl font-semibold underline decoration-1 underline-offset-4 mb-3 uppercase tracking-wider">
          TOPPER IN SUBJECT
        </h4>
        <table className="w-full border-collapse border-2 border-black max-w-4xl shadow-sm">
          <thead>
            <tr className={`${tableHeaderColor} text-sm`}>
              <th className="border border-black p-2 w-1/4">SUBJECT</th>
              <th className="border border-black p-2 w-16">RANK</th>
              <th className="border border-black p-2">NAME OF STUDENTS</th>
              <th className="border border-black p-2 w-28">MARKS (100)</th>
            </tr>
          </thead>
          <tbody>
            {analysis.subjectAnalysis.map((sub, idx) => {
              const displayName = cleanSubjectNames[sub.subject] || sub.subject;

              return sub.topScorers.map((scorer, i) => (
                <tr key={`${idx}-${i}`} className="text-sm hover:bg-gray-50">
                  <td className="border border-black p-2 text-center font-bold bg-white text-gray-800">
                    {displayName}
                  </td>
                  <td className="border border-black p-1.5 text-center font-semibold">
                    {i + 1}
                  </td>
                  <td className="border border-black p-1.5 pl-4 uppercase font-medium">
                    {scorer.name}
                  </td>
                  <td className="border border-black p-1.5 text-center font-bold text-blue-900">
                    {scorer.marks}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      {/* ========================================== */}
      {/* 6. FOOTER STATISTICS & MALE/FEMALE TABLE */}
      {/* ========================================== */}
      <div className="flex justify-between items-end mb-20 max-w-4xl mx-auto print:break-inside-avoid print:mt-16">
        <div className="font-bold text-base leading-relaxed tracking-wide text-gray-900">
          <p>TOTAL NO. OF STUDENTS :- {analysis.overall.totalStudents}</p>
          <p>TOTAL NO. OF STUDENTS PASSED:- {analysis.overall.totalPassed}</p>
          <p>OVERALL RESULT :- {analysis.overall.passPercentage}%</p>
        </div>

        <table className="border-collapse border-2 border-black text-sm font-bold text-center shadow-sm">
          <thead>
            <tr>
              <th className="border border-black p-2 bg-white w-48"></th>
              <th className="border border-black p-2 px-6 bg-gray-50">Male</th>
              <th className="border border-black p-2 px-6 bg-gray-50">
                Female
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 text-left px-3">
                Total No Students Passed
              </td>
              <td className="border border-black p-2">
                {genderStats.male.passed}
              </td>
              <td className="border border-black p-2">
                {genderStats.female.passed}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 text-left px-3">
                Total No Students Failed
              </td>
              <td className="border border-black p-2">
                {genderStats.male.failed}
              </td>
              <td className="border border-black p-2">
                {genderStats.female.failed}
              </td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-black p-2 text-left px-3 uppercase">
                Total
              </td>
              <td className="border border-black p-2 text-lg">
                {genderStats.male.total}
              </td>
              <td className="border border-black p-2 text-lg">
                {genderStats.female.total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* ========================================== */}
      {/* 7. SIGNATURES */}
      {/* ========================================== */}
      <div className="flex justify-between items-center px-4 pt-10 mt-10 font-bold text-base max-w-4xl mx-auto text-gray-900 print:break-inside-avoid">
        <div className="text-center">
          <p>Dr. Swati Narwane</p>
          <p>Result Committee Convener</p>
        </div>
        <div className="text-center">
          <p>Dr. S.B. Wankhade</p>
          <p>HOD</p>
        </div>
      </div>

      <hr className="border-0 h-[1px] bg-black my-4 print:hidden" />
      <div className="text-center mb-8 leading-tight print:break-before-page print:pt-4">
        <img
          src="IT New logo.png"
          alt="IT New logo"
          className="align-middle mb-4 object-contain mx-auto"
        />
        <h3 className="text-xl font-bold text-gray-900">
          RESULT ANALYSIS T.E. SEMESTER V
        </h3>
        <p className="text-lg font-medium mt-1">Academic Year 2025-26</p>
      </div>

      {/* ========================================== */}
      {/* 4. RESULT SUMMARY TABLE (WITH EDITABLE TEACHERS) */}
      {/* ========================================== */}
      <div className="mb-14 flex flex-col items-center">
        <h4 className="text-xl font-semibold underline decoration-1 underline-offset-4 mb-3 uppercase tracking-wider">
          Result Summary
        </h4>
        <table className="w-full border-collapse border-2 border-black max-w-5xl text-center text-sm shadow-sm">
          <thead>
            <tr className={`${tableHeaderColor} text-xs tracking-tight`}>
              <th className="border border-black p-2 font-bold w-24">
                SUBJECT
              </th>
              <th className="border border-black p-2 font-bold w-48">
                NAME OF TEACHER
              </th>
              <th className="border border-black p-2 font-bold w-24">
                APPEARED
              </th>
              <th className="border border-black p-2 font-bold w-24">PASSED</th>
              <th className="border border-black p-2 font-bold w-24">PASS %</th>
              <th className="border border-black p-2 font-bold w-20 bg-[#aed4f5]">
                40-50 MARKS
              </th>
              <th className="border border-black p-2 font-bold w-20 bg-[#aed4f5]">
                51-59 MARKS
              </th>
              <th className="border border-black p-2 font-bold w-24 bg-[#aed4f5]">
                60+ MARKS
              </th>
            </tr>
          </thead>
          <tbody>
            {analysis.subjectAnalysis.map((sub, idx) => {
              const displayName = cleanSubjectNames[sub.subject] || sub.subject;

              return (
                <tr key={idx} className="hover:bg-gray-50 group">
                  <td className="border border-black p-2 font-bold">
                    {displayName}
                  </td>
                  <td className="border border-black p-0 text-left relative">
                    <input
                      type="text"
                      value={teachers[sub.subject] || ""}
                      onChange={(e) =>
                        handleTeacherChange(sub.subject, e.target.value)
                      }
                      className="w-full h-full px-3 py-2 bg-transparent focus:outline-none focus:bg-yellow-50 font-medium text-gray-900 transition-colors placeholder-gray-400 print:placeholder-transparent"
                      placeholder="Click to type name..."
                    />
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {sub.appeared}
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {sub.passed}
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {sub.passPercentage}%
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {sub.marks40to50 || 0}
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {sub.marks51to59 || 0}
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {sub.marks60Plus || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========================================== */}
      {/* 5. CHARTS SECTION */}
      {/* ========================================== */}
      <div className="flex flex-col items-center gap-16 mb-16 print:mt-10">
        {/* Chart 1 */}
        <div className="w-full max-w-4xl border-l-[20px] border-b-[20px] border-[#4f81bd] p-8 relative bg-white shadow-md print:border-l-[10px] print:border-b-[10px] print:shadow-none print:break-inside-avoid">
          <h4 className="text-center font-bold text-xl mb-6 text-gray-800">
            Result Analysis
          </h4>
          <div className="absolute -left-12 top-1/2 -rotate-90 font-bold text-gray-700 tracking-widest uppercase text-xs print:text-black">
            Number of Students
          </div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 font-bold text-gray-700 tracking-widest uppercase text-xs print:text-black">
            Name of Subject
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontWeight: "bold", fontSize: 13 }}
              />
              <YAxis
                tick={{ fontWeight: "bold", fontSize: 12 }}
                tickCount={5}
                allowDecimals={false}
                domain={[0, "dataMax + 5"]}
              />
              <Tooltip cursor={{ fill: "#f4f4f4" }} />
              <Legend
                verticalAlign="top"
                align="right"
                layout="vertical"
                wrapperStyle={{ paddingBottom: "20px", fontWeight: "bold" }}
              />
              <Bar
                dataKey="appeared"
                fill="#4f81bd"
                name="Total no of Students Appeared"
                barSize={30}
              />
              <Bar
                dataKey="passed"
                fill="#c0504d"
                name="Total No of Students Passed"
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 */}
        <div className="w-full max-w-4xl border-l-[20px] border-b-[20px] border-[#4f81bd] p-8 relative bg-white shadow-md print:border-l-[10px] print:border-b-[10px] print:shadow-none print:break-before-page print:mt-10">
          <h4 className="text-center font-bold text-xl mb-6 text-gray-800">
            Subjectwise Statistical Analysis
          </h4>
          <div className="absolute -left-12 top-1/2 -rotate-90 font-bold text-gray-700 tracking-widest uppercase text-xs print:text-black">
            Number of Marks
          </div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 font-bold text-gray-700 tracking-widest uppercase text-xs print:text-black">
            Name of Subject
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontWeight: "bold", fontSize: 13 }}
              />
              <YAxis
                tick={{ fontWeight: "bold", fontSize: 12 }}
                tickCount={5}
                allowDecimals={false}
                domain={[0, "dataMax + 5"]}
              />
              <Tooltip cursor={{ fill: "#f4f4f4" }} />
              <Legend
                verticalAlign="top"
                align="right"
                layout="vertical"
                wrapperStyle={{ paddingBottom: "20px", fontWeight: "bold" }}
              />
              <Bar
                dataKey="marks40to50"
                fill="#8064a2"
                name="40-50 MARKS"
                barSize={20}
              />
              <Bar
                dataKey="marks51to59"
                fill="#4bacc6"
                name="51-59 MARKS"
                barSize={20}
              />
              <Bar
                dataKey="marks60Plus"
                fill="#f79646"
                name="60+ MARKS"
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Sem5Analysis;
