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

  // NEW: Store teacher names in React State so they can be edited
  const [teachers, setTeachers] = useState({
    Blockchain_DLT_Marks: "Dr. Anushree Deshmukh",
    Big_Data_Marks: "Prof. Ankush Hutke",
    Knowledge_Mgmt_Marks: "Dr. S.B.Wankhade",
    ERP_Marks: "Prof. A.E.Patil",
    Project_Mgmt_Marks: "Prof. Atul Londhekar",
    // Default placeholders for Sem 7 just in case
    AI_DS_II_Marks: "Enter Teacher Name",
    IoE_Marks: "Enter Teacher Name",
    Data_Science_Lab_Marks: "Enter Teacher Name",
    Major_Project_I_Marks: "Enter Teacher Name",
    Mgmt_Info_Sys_Marks: "Enter Teacher Name",
    Infra_Security_Marks: "Enter Teacher Name",
    Info_Retrieval_Sys_Marks: "Enter Teacher Name",
    Cyber_Security_Laws_Marks: "Enter Teacher Name",
    Software_Testing_QA_Marks: "Enter Teacher Name",
  });

  useEffect(() => {
    // Change /sem/8 to /sem/7 or whichever semester you are viewing
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

  // Clean Subject Names Mapping
  const cleanSubjectNames = {
    Blockchain_DLT_Marks: "BC & DLT",
    Big_Data_Marks: "BDA",
    Knowledge_Mgmt_Marks: "KM",
    ERP_Marks: "ERP",
    Project_Mgmt_Marks: "PM",
    AI_DS_II_Marks: "AI & DS II",
    IoE_Marks: "IoE",
    Data_Science_Lab_Marks: "DS Lab",
    Major_Project_I_Marks: "Major Project I",
    Mgmt_Info_Sys_Marks: "MIS",
    Infra_Security_Marks: "Infra Security",
    Info_Retrieval_Sys_Marks: "IRS",
    Cyber_Security_Laws_Marks: "CSL",
    Software_Testing_QA_Marks: "STQA",
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
    <div className="max-w-5xl mx-auto p-10 bg-white text-black min-h-screen font-sans border-4 border-blue-900 m-8 shadow-2xl print:m-0 print:border-none print:shadow-none print:p-0">
      {/* ========================================== */}
      {/* 1. REPORT HEADER */}
      {/* ========================================== */}
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
          RESULT ANALYSIS T.E. SEMESTER {analysis.semester}
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
      <br />
      <br />
      <br />
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
          RESULT ANALYSIS T.E. SEMESTER {analysis.semester}
        </h3>
        <p className="text-lg font-medium mt-1">Academic Year 2025-26</p>
      </div>
      {/* ========================================== */}
      {/* 4. RESULT SUMMARY TABLE (WITH EDITABLE TEACHERS) */}
      {/* ========================================== */}
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

                  {/* EDITABLE TEACHER FIELD */}
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

      {/* ========================================== */}
      {/* 5. CHARTS SECTION */}
      {/* ========================================== */}
      <div className="flex flex-col items-center gap-16 mb-16 print:mt-10">
        {/* Chart 1 */}
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
                tick={{ fontWeight: "bold", fontSize: 9 }}
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
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontWeight: "bold", fontSize: 11 }}
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

      {/* ========================================== */}
      {/* 6. FOOTER STATISTICS & MALE/FEMALE TABLE */}
      {/* ========================================== */}
    </div>
  );
};

export default Sem5Analysis;
