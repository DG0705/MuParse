import React, { useState } from "react";
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

const NepAnalysisSem3 = () => {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [teachers, setTeachers] = useState({
    AMT_Marks: "",
    ADSA_Marks: "",
    DBMS_Marks: "",
    AT_Marks: "",
    OE_Marks: "",
  });

  const handleTeacherChange = (subjectKey, newName) => {
    setTeachers((prev) => ({ ...prev, [subjectKey]: newName }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a CSV file first!");

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file); // Must match backend 'upload.single("file")'

    try {
      // UPDATE THIS URL to match the new backend route you created above
      const response = await fetch(
        "http://localhost:5000/api/students/analyze-sem3-csv",
        {
          method: "POST",
          body: formData,
        },
      );
      const result = await response.json();

      if (result.success) setData(result);
      else setError(result.message || "Failed to analyze CSV.");
    } catch (err) {
      setError("Server error. Is the backend running?");
    }
    setLoading(false);
  };

  // UPLOAD SCREEN (Shows if data hasn't been generated yet)
  if (!data) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full border-2 border-blue-100">
          <h2 className="text-2xl font-extrabold text-blue-900 mb-6 text-center">
            Semester 3 Analyzer
          </h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-6">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 p-2 border-2 border-dashed border-gray-300 rounded-xl"
            />
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-semibold">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md disabled:bg-gray-400"
            >
              {loading ? "Analyzing..." : "Generate Official Report"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // REPORT SCREEN (Renders exactly like before once data is received)
  const { analysis } = data;
  const tableHeaderColor = "bg-[#9bc2e6]";

  const cleanSubjectNames = {
    AMT_Marks: "Applied Math III",
    ADSA_Marks: "Adv. Data Structures",
    DBMS_Marks: "Database Mgmt",
    AT_Marks: "Automata Theory",
    OE_Marks: "Open Elective",
  };

  const chartData = analysis.subjectAnalysis.map((sub) => ({
    name: cleanSubjectNames[sub.subject] || sub.subject,
    appeared: sub.appeared,
    passed: sub.passed,
    marks40to50: sub.marks40to50 || 0,
    marks51to59: sub.marks51to59 || 0,
    marks60Plus: sub.marks60Plus || 0,
  }));

  const genderStats = analysis.overall.gender;

  return (
    <div className="max-w-5xl mx-auto p-10 bg-white text-black min-h-screen font-sans border-4 border-blue-900 m-8 shadow-2xl print:m-0 print:border-none print:shadow-none print:p-0">
      {/* 1. REPORT HEADER */}
      <div className="text-center mb-8 leading-tight">
        {/* <h3 className="text-lg tracking-widest text-gray-700 mb-1">
          MANJARA CHARITABLE TRUST
        </h3>
        <h1 className="text-3xl font-extrabold uppercase tracking-wide mb-2 text-gray-900">
          Rajiv Gandhi Institute of Technology, Mumbai
        </h1>
        <h2 className="text-2xl font-bold underline decoration-2 underline-offset-4 mb-6 text-gray-800">
          Department of Information Technology
        </h2> */}
        <img
          src="IT New logo.png"
          alt="IT New logo"
          className="align-middle mb-4  object-contain mx-auto"
        />
        <h3 className="text-xl font-bold text-gray-900">
          RESULT ANALYSIS S.E. SEMESTER {analysis.semester}
        </h3>
        <p className="text-lg font-medium mt-1">Academic Year 2025-26</p>
      </div>

      {/* 2. TOPPER IN OVERALL TABLE */}
      <div className="mb-10 flex flex-col items-center">
        <h4 className="text-xl font-semibold underline decoration-1 underline-offset-4 mb-3 uppercase tracking-wider">
          TOPPER IN OVERALL
        </h4>
        <table className="w-3/4 border-collapse border-2 border-black shadow-sm">
          <thead>
            <tr className={`${tableHeaderColor} text-sm`}>
              <th className="border border-black p-2 w-24">RANK</th>
              <th className="border border-black p-2">NAME OF THE STUDENT</th>
              <th className="border border-black p-2 w-32">TOTAL (800)</th>
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
                  {topper.sgpi}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. TOPPER IN SUBJECT TABLE */}
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
      <hr className="border-0 h-[1px] bg-black my-4" />
      <div className="text-center mb-8 leading-tight">
        {/* <h3 className="text-lg tracking-widest text-gray-700 mb-1">
          MANJARA CHARITABLE TRUST
        </h3>
        <h1 className="text-3xl font-extrabold uppercase tracking-wide mb-2 text-gray-900">
          Rajiv Gandhi Institute of Technology, Mumbai
        </h1>
        <h2 className="text-2xl font-bold underline decoration-2 underline-offset-4 mb-6 text-gray-800">
          Department of Information Technology
        </h2> */}
        <img
          src="IT New logo.png"
          alt="IT New logo"
          className="align-middle mb-4  object-contain mx-auto"
        />
        <h3 className="text-xl font-bold text-gray-900">
          RESULT ANALYSIS S.E. SEMESTER {analysis.semester}
        </h3>
        <p className="text-lg font-medium mt-1">Academic Year 2025-26</p>
      </div>
      {/* 4. RESULT SUMMARY TABLE */}
      <div className="mb-14 flex flex-col items-center print:break-before-page">
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
                      className="w-full h-full px-3 py-2 bg-transparent focus:outline-none focus:bg-yellow-50 font-medium text-gray-900 transition-colors placeholder-gray-400"
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

      {/* 5. CHARTS SECTION */}
      <div className="flex flex-col items-center gap-16 mb-16 print:mt-10">
        <div className="w-full max-w-4xl border-l-[20px] border-b-[20px] border-[#4f81bd] p-8 relative bg-white shadow-md print:border-l-[10px] print:border-b-[10px] print:shadow-none">
          <h4 className="text-center font-bold text-xl mb-6 text-gray-800">
            Result Analysis
          </h4>
          <div className="absolute -left-12 top-1/2 -rotate-90 font-bold text-gray-700 tracking-widest uppercase text-xs print:text-black">
            Number of Students
          </div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 font-bold text-gray-700 tracking-widest uppercase text-xs print:text-black">
            Name of Subject
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontWeight: "bold", fontSize: 12 }}
              />
              <YAxis tick={{ fontWeight: "bold" }} />
              <Tooltip cursor={{ fill: "#f4f4f4" }} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                wrapperStyle={{ paddingLeft: "20px", fontWeight: "bold" }}
              />
              <Bar
                dataKey="appeared"
                fill="#4f81bd"
                name="Total no of Students Appeared"
                barSize={25}
              />
              <Bar
                dataKey="passed"
                fill="#c0504d"
                name="Total No of Students Passed"
                barSize={25}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

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
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontWeight: "bold", fontSize: 12 }}
              />
              <YAxis tick={{ fontWeight: "bold" }} />
              <Tooltip cursor={{ fill: "#f4f4f4" }} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                wrapperStyle={{ paddingLeft: "20px", fontWeight: "bold" }}
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

      {/* 6. FOOTER STATISTICS & MALE/FEMALE TABLE */}
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

      {/* 7. SIGNATURES */}
      <div className="flex justify-between items-center px-4 pt-10 mt-10 font-bold text-base max-w-4xl mx-auto text-gray-900 print:break-inside-avoid">
        <div className="text-center">
          <p>Dr. Anushree Deshmukh</p>
          <p>Result Committee Convener</p>
        </div>
        <div className="text-center">
          <p>Dr. S.B. Wankhade</p>
          <p>HOD</p>
        </div>
      </div>
    </div>
  );
};

export default NepAnalysisSem3;
