import React, { useEffect, useState, useRef } from "react";
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
  const [selectedBatch, setSelectedBatch] = useState(""); // Catches smart server default
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedBatch = useRef(null);

  // Mapped strictly to Sem 5 T.E. IT Theory & Elective Subjects
  const [teachers, setTeachers] = useState({
    IP_TOT_Marks: "",
    CNS_TOT_Marks: "",
    EEB_TOT_Marks: "",
    SE_TOT_Marks: "",
    ADMT_TOT_Marks: "",
    ADSA_TOT_Marks: "",
  });

  useEffect(() => {
    if (lastFetchedBatch.current === selectedBatch && selectedBatch !== "")
      return;

    setIsLoading(true);
    const queryParam = selectedBatch
      ? `?batch=${encodeURIComponent(selectedBatch)}`
      : "";

    fetch(`http://localhost:5000/api/students/sem/5${queryParam}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        if (res.selectedBatch) {
          lastFetchedBatch.current = res.selectedBatch;
          setSelectedBatch(res.selectedBatch);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [selectedBatch]);

  const handleTeacherChange = (subjectKey, newName) => {
    setTeachers((prev) => ({ ...prev, [subjectKey]: newName }));
  };

  if (isLoading && !data) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="p-10 text-center text-blue-600 font-bold text-xl animate-pulse">
          Loading Official Gazette (Sem 5)...
        </div>
      </div>
    );
  }

  const isErrorState = !data || !data.success || !data.analysis;
  const availableBatches = data?.availableBatches || [];
  const tableHeaderColor = "bg-[#9bc2e6]";

  // Clean UI mapping for official T.E. Semester V (IT)
  const cleanSubjectNames = {
    IP_TOT_Marks: "Internet Programming (IP)",
    CNS_TOT_Marks: "Network Security (CNS)",
    EEB_TOT_Marks: "E-Business (EEB)",
    SE_TOT_Marks: "Software Engg (SE)",
    ADMT_TOT_Marks: "Adv Data Mgmt (ADMT)",
    ADSA_TOT_Marks: "Adv Data Struct (ADSA)",
  };

  const chartData =
    data?.analysis?.subjectAnalysis?.map((sub) => ({
      name: cleanSubjectNames[sub.subject] || sub.subject,
      appeared: sub.appeared,
      passed: sub.passed,
      marks40to50: sub.marks40to50 || 0,
      marks51to59: sub.marks51to59 || 0,
      marks60Plus: sub.marks60Plus || 0,
    })) || [];

  const genderStats = data?.analysis?.overall?.gender || {
    male: { passed: "--", failed: "--", total: "--" },
    female: { passed: "--", failed: "--", total: "--" },
  };

  return (
    <div className="max-w-5xl mx-auto p-10 bg-white text-black min-h-screen font-sans border-4 border-blue-900 m-8 shadow-2xl print:m-0 print:border-none print:shadow-none print:p-8">
      <style>{`@media print { @page { margin: 0mm; } }`}</style>

      {/* CONTROL BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-300 mb-8 shadow-inner print:hidden gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label
            htmlFor="batch-select"
            className="font-extrabold text-sm text-slate-700 uppercase tracking-wider"
          >
            Target Batch:
          </label>
          <select
            id="batch-select"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            disabled={isLoading || availableBatches.length === 0}
            className="bg-white border-2 border-blue-900 text-blue-950 font-bold text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-sm min-w-[140px]"
          >
            {availableBatches.map((b) => (
              <option key={b} value={b}>
                Batch {b}
              </option>
            ))}
          </select>
          {isLoading && (
            <span className="text-xs font-bold text-blue-600 animate-pulse">
              Switching...
            </span>
          )}
        </div>

        <button
          onClick={() => window.print()}
          disabled={isErrorState || isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          Save as Official PDF
        </button>
      </div>

      {isErrorState ? (
        <div className="p-10 text-center text-red-600 font-bold text-xl bg-red-50 rounded-lg border border-red-200 my-12">
          No records found for Batch: "{selectedBatch || "Unknown"}"
          <span className="text-sm font-medium text-red-500 mt-2 block">
            {data?.message ||
              "Please select a valid batch from the dropdown menu above."}
          </span>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="text-center mb-8 leading-tight">
            <img
              src="IT New logo.png"
              alt="IT New logo"
              className="align-middle mb-4 object-contain mx-auto"
            />
            <h3 className="text-xl font-bold text-slate-900">
              RESULT ANALYSIS T.E. SEMESTER V (BATCH: {selectedBatch})
            </h3>
            <p className="text-lg font-medium mt-1">Academic Year 2025-26</p>
          </div>

          {/* TOPPER IN OVERALL (TOP 10) */}
          <div className="mb-10 flex flex-col items-center">
            <h4 className="text-xl font-semibold underline decoration-1 underline-offset-4 mb-3 uppercase tracking-wider">
              TOPPER IN OVERALL (TOP 10)
            </h4>
            <table className="w-3/4 border-collapse border-2 border-black shadow-sm">
              <thead>
                <tr className={`${tableHeaderColor} text-sm`}>
                  <th className="border border-black p-2 w-24">RANK</th>
                  <th className="border border-black p-2">
                    NAME OF THE STUDENT
                  </th>
                  <th className="border border-black p-2 w-32">SGPI (10)</th>
                </tr>
              </thead>
              <tbody>
                {data.analysis.topOverall.map((topper, idx) => (
                  <tr key={idx} className="text-xs hover:bg-slate-50">
                    <td className="border border-black p-1 text-center font-bold">
                      {topper.rank}
                    </td>
                    <td className="border border-black p-1 pl-4 uppercase font-medium">
                      {topper.name}
                    </td>
                    <td className="border border-black p-1 text-center font-bold">
                      {topper.sgpi.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOPPER IN SUBJECT */}
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
                {data.analysis.subjectAnalysis.map((sub, idx) => {
                  const displayName =
                    cleanSubjectNames[sub.subject] || sub.subject;
                  return sub.topScorers.map((scorer, i) => (
                    <tr
                      key={`${idx}-${i}`}
                      className="text-xs hover:bg-slate-50"
                    >
                      <td className="border border-black p-1.5 text-center font-bold bg-white text-slate-800">
                        {displayName}
                      </td>
                      <td className="border border-black p-1 text-center font-semibold">
                        {i + 1}
                      </td>
                      <td className="border border-black p-1 pl-4 uppercase font-medium">
                        {scorer.name}
                      </td>
                      <td className="border border-black p-1 text-center font-bold text-blue-900">
                        {scorer.marks}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* FOOTER STATS & GENDER TABLE */}
          <div className="flex justify-between items-end mb-20 max-w-4xl mx-auto print:break-inside-avoid print:mt-16">
            <div className="font-bold text-base leading-relaxed tracking-wide text-slate-900">
              <p>
                TOTAL NO. OF STUDENTS :- {data.analysis.overall.totalStudents}
              </p>
              <p>
                TOTAL NO. OF STUDENTS PASSED:-{" "}
                {data.analysis.overall.totalPassed}
              </p>
              <p>OVERALL RESULT :- {data.analysis.overall.passPercentage}%</p>
            </div>
            <table className="border-collapse border-2 border-black text-sm font-bold text-center shadow-sm">
              <thead>
                <tr>
                  <th className="border border-black p-2 bg-white w-48"></th>
                  <th className="border border-black p-2 px-6 bg-slate-50">
                    Male
                  </th>
                  <th className="border border-black p-2 px-6 bg-slate-50">
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
                <tr className="bg-slate-100">
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

          {/* SIGNATURES */}
          <div className="flex justify-between items-center px-4 pt-10 mt-10 font-bold text-base max-w-4xl mx-auto text-slate-900 print:break-inside-avoid">
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

          {/* PAGE 2 HEADER */}
          <div className="text-center mb-8 leading-tight print:break-before-page print:pt-4">
            <img
              src="IT New logo.png"
              alt="IT New logo"
              className="align-middle mb-4 object-contain mx-auto"
            />
            <h3 className="text-xl font-bold text-slate-900">
              RESULT ANALYSIS T.E. SEMESTER V (BATCH: {selectedBatch})
            </h3>
            <p className="text-lg font-medium mt-1">Academic Year 2025-26</p>
          </div>

          {/* RESULT SUMMARY TABLE */}
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
                  <th className="border border-black p-2 font-bold w-24">
                    PASSED
                  </th>
                  <th className="border border-black p-2 font-bold w-24">
                    PASS %
                  </th>
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
                {data.analysis.subjectAnalysis.map((sub, idx) => {
                  const displayName =
                    cleanSubjectNames[sub.subject] || sub.subject;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 group">
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
                          className="w-full h-full px-3 py-2 bg-transparent focus:outline-none focus:bg-yellow-50 font-medium text-slate-900 transition-colors placeholder-slate-400 print:placeholder-transparent"
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

          {/* CHARTS SECTION (DUAL CHARTS) */}
          <div className="flex flex-col items-center gap-16 mb-16 print:mt-10">
            {/* Chart 1: Appeared vs Passed */}
            <div className="w-full max-w-4xl border-l-[20px] border-b-[20px] border-[#4f81bd] p-8 relative bg-white shadow-md print:border-l-[10px] print:border-b-[10px] print:shadow-none print:break-inside-avoid">
              <h4 className="text-center font-bold text-xl mb-6 text-slate-800">
                Result Analysis
              </h4>
              <div className="absolute -left-12 top-1/2 -rotate-90 font-bold text-slate-700 uppercase text-xs">
                Students
              </div>
              <ResponsiveContainer width="100%" height={250}>
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
                    allowDecimals={false}
                    domain={[0, "dataMax + 5"]}
                  />
                  <Tooltip cursor={{ fill: "#f4f4f4" }} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: "20px", fontWeight: "bold" }}
                  />
                  <Bar
                    dataKey="appeared"
                    fill="#4f81bd"
                    name="Appeared"
                    barSize={30}
                  />
                  <Bar
                    dataKey="passed"
                    fill="#c0504d"
                    name="Passed"
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Statistical Mark Distribution */}
            <div className="w-full max-w-4xl border-l-[20px] border-b-[20px] border-[#4f81bd] p-8 relative bg-white shadow-md print:border-l-[10px] print:border-b-[10px] print:shadow-none print:break-before-page print:mt-10">
              <h4 className="text-center font-bold text-xl mb-6 text-slate-800">
                Subjectwise Statistical Analysis
              </h4>
              <div className="absolute -left-12 top-1/2 -rotate-90 font-bold text-slate-700 uppercase text-xs">
                Number of Marks
              </div>
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 font-bold text-slate-700 uppercase text-xs">
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
                    allowDecimals={false}
                    domain={[0, "dataMax + 5"]}
                  />
                  <Tooltip cursor={{ fill: "#f4f4f4" }} />
                  <Legend
                    verticalAlign="top"
                    align="right"
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
        </>
      )}
    </div>
  );
};

export default Sem5Analysis;
