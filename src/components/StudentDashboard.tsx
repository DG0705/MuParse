import React, { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { SubjectPassFailChart } from "./SubjectPassFailChart";

const SUBJECT_CONFIG = [
  { key: "Eng_Maths_I_Marks", displayName: "Engineering Maths I" },
  { key: "Eng_Physics_I_Marks", displayName: "Engineering Physics I" },
  { key: "Eng_Chem_I_Marks", displayName: "Engineering Chemistry I" },
  { key: "Eng_Mechanics_Marks", displayName: "Engineering Mechanics" },
  { key: "Basic_Elec_Eng_Marks", displayName: "Basic Electrical Eng" },
  { key: "Eng_Physics_I_TW_Marks", displayName: "Physics I (TW)" },
  { key: "Eng_Chem_I_TW_Marks", displayName: "Chemistry I (TW)" },
  { key: "Eng_Mechanics_TW_Marks", displayName: "Mechanics (TW)" },
  { key: "Basic_Elec_Eng_TW_Marks", displayName: "Electrical Eng (TW)" },
  { key: "Workshop_I_Marks", displayName: "Workshop I" },
  { key: "Eng_Maths_I_TW_Marks", displayName: "Maths I (TW)" },
];

export function StudentDashboard() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  const [selectedSubject, setSelectedSubject] = useState(SUBJECT_CONFIG[0].key);
  const subjects = useMemo(() => SUBJECT_CONFIG.map((s) => s.key), []);
  const subjectNameMap = useMemo(
    () => Object.fromEntries(SUBJECT_CONFIG.map((s) => [s.key, s.displayName])),
    []
  );

  const filteredSubjectsConfig = useMemo(
    () => [
      SUBJECT_CONFIG[0],
      SUBJECT_CONFIG[1],
      SUBJECT_CONFIG[2],
      SUBJECT_CONFIG[3],
      SUBJECT_CONFIG[4],
    ],
    []
  );

  const markRanges = ["81-100", "61-80", "41-60", "21-40", "0-20"];

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === "light" ? "dark" : "light");
    root.classList.add(theme);
  }, [theme]);

  const successfulStudents = useMemo(
    () => students.filter((s) => s.Result === "Successful"),
    [students]
  );
  const unsuccessfulStudents = useMemo(
    () => students.filter((s) => s.Result === "Unsuccessful"),
    [students]
  );
  const maleStudents = useMemo(
    () => students.filter((s) => s.Gender === "Male"),
    [students]
  );
  const femaleStudents = useMemo(
    () => students.filter((s) => s.Gender === "Female"),
    [students]
  );
  const sgpiSortedStudents = useMemo(
    () => [...students].sort((a, b) => b.SGPI - a.SGPI),
    [students]
  );
  const successfulMaleCount = useMemo(
    () => successfulStudents.filter((s) => s.Gender === "Male").length,
    [successfulStudents]
  );
  const successfulFemaleCount = useMemo(
    () => successfulStudents.filter((s) => s.Gender === "Female").length,
    [successfulStudents]
  );
  const unsuccessfulMaleCount = useMemo(
    () => unsuccessfulStudents.filter((s) => s.Gender === "Male").length,
    [unsuccessfulStudents]
  );
  const unsuccessfulFemaleCount = useMemo(
    () => unsuccessfulStudents.filter((s) => s.Gender === "Female").length,
    [unsuccessfulStudents]
  );
  const topPerformers = useMemo(() => {
    if (!successfulStudents.length) return [];
    return [...successfulStudents]
      .filter((student) => student[selectedSubject] > 0)
      .sort(
        (a, b) =>
          b[selectedSubject] - a[selectedSubject] ||
          a.Name.localeCompare(b.Name)
      )
      .slice(0, 10)
      .map((student, index) => ({
        Rank: index + 1,
        Name: student.Name,
        PRN: student.PRN,
        Marks: student[selectedSubject],
      }));
  }, [successfulStudents, selectedSubject]);
  const marksDistribution = useMemo(() => {
    const distribution = Object.fromEntries(
      markRanges.map((range) => [range, { students: [] }])
    );
    if (!successfulStudents.length) return distribution;
    successfulStudents.forEach((student) => {
      const marks = student[selectedSubject];
      if (marks >= 81) distribution["81-100"].students.push(student);
      else if (marks >= 61) distribution["61-80"].students.push(student);
      else if (marks >= 41) distribution["41-60"].students.push(student);
      else if (marks >= 21) distribution["21-40"].students.push(student);
      else if (marks >= 0) distribution["0-20"].students.push(student);
    });
    return distribution;
  }, [successfulStudents, selectedSubject, markRanges]);
  const subjectDistributionSummary = useMemo(() => {
    const summary = Object.fromEntries(
      markRanges.map((range) => [
        range,
        Object.fromEntries(subjects.map((subject) => [subject, 0])),
      ])
    );
    if (!students.length) return summary;
    students.forEach((student) => {
      subjects.forEach((subject) => {
        const marks = student[subject];
        if (marks >= 81) summary["81-100"][subject]++;
        else if (marks >= 61) summary["61-80"][subject]++;
        else if (marks >= 41) summary["41-60"][subject]++;
        else if (marks >= 21) summary["21-40"][subject]++;
        else if (marks >= 0) summary["0-20"][subject]++;
      });
    });
    return summary;
  }, [students, subjects, markRanges]);

  const handleFileProcess = (file) => {
    if (!file || file.type !== "text/csv") {
      alert("Please upload a valid CSV file.");
      return;
    }
    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = (results.data as any[]).map((row) => {
          const studentData: any = {
            "Seat No":
              row["Seat No"]?.replace(/="/g, "").replace(/"/g, "") || "",
            Name: row["Name"]?.trim() || "",
            PRN: row["PRN"]?.replace(/="/g, "").replace(/"/g, "") || "",
            Result: row["Result"]?.trim() || "",
            SGPI: parseFloat(row["SGPI"]) || 0,
            Gender: row["Gender"]?.trim() || "N/A",
          };
          subjects.forEach((subjectKey) => {
            studentData[subjectKey] = parseInt(row[subjectKey], 10) || 0;
          });
          return studentData;
        });
        setStudents(parsedData);
        setSelectedSubject(SUBJECT_CONFIG[0].key);
        setIsLoading(false);
      },
      error: (error) => {
        setIsLoading(false);
        alert("Error parsing CSV file: " + error.message);
      },
    });
  };

  const handleFileChange = (e) => handleFileProcess(e.target.files[0]);
  const handleThemeToggle = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <div className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 font-sans min-h-screen">
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-[#1E3A8A] dark:text-gray-100">
            GradeWise.
          </h1>
          <button
            onClick={handleThemeToggle}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition"
          >
            Toggle {theme === "light" ? "Dark" : "Light"} Mode
          </button>
        </div>
        <div className="mb-8">
          <div className="border-2 border-dashed border-gray-400 dark:border-gray-600 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-center">
            <label
              htmlFor="csvFileInput"
              className="cursor-pointer flex flex-col items-center justify-center text-gray-500 dark:text-gray-400"
            >
              <svg
                className="w-12 h-12 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <span className="text-xl font-medium">
                Upload CSV File or Click Here
              </span>
            </label>
            <input
              type="file"
              id="csvFileInput"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {isLoading && (
              <div
                className="w-8 h-8 border-4 border-t-blue-600 dark:border-t-yellow-400 rounded-full animate-spin mx-auto mt-4"
                role="status"
              >
                <span className="sr-only">Loading...</span>
              </div>
            )}
          </div>
        </div>

        <div className="counts mb-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              Total Successful
            </p>
            <p className="text-4xl font-bold text-[#1E3A8A] dark:text-yellow-400 mt-2">
              {successfulStudents.length}
            </p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
              Male: {successfulMaleCount} | Female: {successfulFemaleCount}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              Total Unsuccessful
            </p>
            <p className="text-4xl font-bold text-red-600 dark:text-red-500 mt-2">
              {unsuccessfulStudents.length}
            </p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
              Male: {unsuccessfulMaleCount} | Female: {unsuccessfulFemaleCount}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              Total Male
            </p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {maleStudents.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              Total Female
            </p>
            <p className="text-4xl font-bold text-pink-600 dark:text-pink-400 mt-2">
              {femaleStudents.length}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <details className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <summary className="cursor-pointer text-2xl font-bold text-[#1E3A8A] dark:text-gray-100">
              Visual Analytics
            </summary>
            <div className="mt-4">
              {students.length > 0 ? (
                <div className="relative h-96 w-full">
                  <SubjectPassFailChart
                    students={students}
                    subjectConfig={SUBJECT_CONFIG}
                  />
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Upload a file to see the chart.
                </p>
              )}
            </div>
          </details>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableCard
              title="Successful Students"
              data={successfulStudents}
              columns={["Seat No", "Name", "PRN", "SGPI"]}
            />
            <TableCard
              title="Unsuccessful Students"
              data={unsuccessfulStudents}
              columns={["Seat No", "Name", "PRN", "SGPI"]}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableCard
              title="Male Students"
              data={maleStudents}
              columns={["Seat No", "Name", "PRN", "SGPI"]}
            />
            <TableCard
              title="Female Students"
              data={femaleStudents}
              columns={["Seat No", "Name", "PRN", "SGPI"]}
            />
          </div>
          <details className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <summary className="cursor-pointer text-2xl font-bold text-[#1E3A8A] dark:text-gray-100">
              Subject-wise Distribution Summary
            </summary>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 sticky left-0 bg-gray-50 dark:bg-gray-700"
                    >
                      Mark Range
                    </th>
                    {subjects.map((subjectKey) => (
                      <th
                        key={subjectKey}
                        scope="col"
                        className="px-6 py-3 text-center"
                      >
                        {subjectNameMap[subjectKey]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(subjectDistributionSummary).map(
                    ([range, counts]) => (
                      <tr
                        key={range}
                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white sticky left-0 bg-white dark:bg-gray-800">
                          {range}
                        </td>
                        {subjects.map((subjectKey) => (
                          <td
                            key={subjectKey}
                            className="px-6 py-4 text-center"
                          >
                            {counts[subjectKey]}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </details>
          <TableCard
            title="All Students"
            data={students}
            columns={["Seat No", "Name", "Gender", "PRN", "Result", "SGPI"]}
          />
          <TableCard
            title="Students by SGPI (Descending)"
            data={sgpiSortedStudents}
            columns={["Seat No", "Name", "Gender", "PRN", "SGPI"]}
          />

          <details className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <summary className="cursor-pointer text-2xl font-bold text-[#1E3A8A] dark:text-gray-100">
              Top 10 Performers in{" "}
              <span className="text-amber-500">
                {subjectNameMap[selectedSubject]}
              </span>
            </summary>
            <div className="mt-4">
              <SubjectSelector
                subjectsConfig={filteredSubjectsConfig}
                selectedSubject={selectedSubject}
                onSelectSubject={setSelectedSubject}
              />
              <SimpleTable
                data={topPerformers}
                columns={["Rank", "Name", "PRN", "Marks"]}
              />
            </div>
          </details>
          <details className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
            <summary className="cursor-pointer text-2xl font-bold text-[#1E3A8A] dark:text-gray-100">
              Distribution for{" "}
              <span className="text-amber-500">
                {subjectNameMap[selectedSubject]}
              </span>
            </summary>
            <div className="mt-4">
              <SubjectSelector
                subjectsConfig={filteredSubjectsConfig}
                selectedSubject={selectedSubject}
                onSelectSubject={setSelectedSubject}
              />
              <div className="mt-4 space-y-2">
                {Object.entries(marksDistribution).map(([range, data]) => (
                  <details
                    key={range}
                    className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <summary className="cursor-pointer font-semibold text-md text-gray-700 dark:text-gray-200">
                      Marks: {range}{" "}
                      <span className="font-normal text-gray-500 dark:text-gray-400 ml-2">
                        (Count: {data.students.length})
                      </span>
                    </summary>
                    <div className="mt-2">
                      {data.students.length > 0 ? (
                        <SimpleTable
                          data={data.students}
                          columns={["Seat No", "Name", "PRN", "SGPI"]}
                        />
                      ) : (
                        <p className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                          No students in this range.
                        </p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function SubjectSelector({ subjectsConfig, selectedSubject, onSelectSubject }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {subjectsConfig.map((subject) => (
        <button
          key={subject.key}
          onClick={() => onSelectSubject(subject.key)}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 text-sm ${
            selectedSubject === subject.key
              ? "bg-amber-500 text-white"
              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          {subject.displayName}
        </button>
      ))}
    </div>
  );
}
function TableCard({ title, data, columns }) {
  return (
    <details
      open
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]"
    >
      <summary className="cursor-pointer text-2xl font-bold text-[#1E3A8A] dark:text-gray-100">
        {title}
      </summary>
      <div className="mt-4">
        <SimpleTable data={data} columns={columns} />
      </div>
    </details>
  );
}
function SimpleTable({ data, columns }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {columns.map((col) => (
              <th key={col} scope="col" className="px-6 py-3">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <tr
                key={row.PRN || row["Mark Range"] || index}
                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {columns.map((col) => (
                  <td key={col} className="px-6 py-4">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center py-4">
                No data available. Please upload a file.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
