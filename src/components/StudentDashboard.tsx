import React, { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { SubjectPassFailChart } from "./SubjectPassFailChart";

// Ensure these keys match your CSV headers exactly!
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
  const [dbSemester, setDbSemester] = useState("1");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // --- DATABASE FETCHING LOGIC ---
  const fetchFromDatabase = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      console.log(`Fetching from: http://localhost:5000/api/students?semester=${dbSemester}`);
      
      const response = await fetch(`http://localhost:5000/api/students?semester=${dbSemester}`);
      
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} ${response.statusText}`);
      }
      
      const dbData = await response.json();
      console.log("Raw DB Data:", dbData);

      if (!Array.isArray(dbData)) {
        throw new Error("Invalid data format received from server");
      }

      if (dbData.length === 0) {
        setErrorMsg("No students found in database for this semester. Please upload CSV first.");
        setStudents([]);
        setIsLoading(false);
        return;
      }

      // Map MongoDB structure to Dashboard structure
      const flattenedData = dbData.map((doc: any) => {
        const flatStudent: any = {
           "Seat No": doc.seatNo || doc["Seat No"],
           Name: doc.name || doc["Name"],
           PRN: doc.prn || doc["PRN"],
           Result: doc.results?.finalResult || doc["Result"] || "N/A",
           SGPI: parseFloat(doc.results?.sgpi || doc["SGPI"]) || 0,
           Gender: "N/A", 
        };

        // Flatten the 'subjects' map from MongoDB
        if (doc.subjects) {
          Object.entries(doc.subjects).forEach(([key, val]) => {
             flatStudent[key] = parseInt(String(val), 10) || 0;
          });
        }
        return flatStudent;
      });

      console.log("Processed Data:", flattenedData);
      setStudents(flattenedData);
      
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setErrorMsg(error.message || "Failed to connect to backend.");
    } finally {
      setIsLoading(false);
    }
  };
  // -----------------------------

  const handleFileProcess = (file) => {
    if (!file || file.type !== "text/csv") {
      alert("Please upload a valid CSV file.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = (results.data as any[]).map((row) => {
          const studentData: any = {
            "Seat No": row["Seat No"]?.replace(/="/g, "").replace(/"/g, "") || "",
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
        setErrorMsg("Error parsing CSV: " + error.message);
      },
    });
  };

  const handleFileChange = (e) => handleFileProcess(e.target.files[0]);
  const handleThemeToggle = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  // --- DERIVED METRICS ---
  const successfulStudents = useMemo(() => students.filter((s) => s.Result === "Successful" || s.Result === "P"), [students]);
  const unsuccessfulStudents = useMemo(() => students.filter((s) => s.Result === "Unsuccessful" || s.Result === "F"), [students]);
  const maleStudents = useMemo(() => students.filter((s) => s.Gender === "Male"), [students]);
  const femaleStudents = useMemo(() => students.filter((s) => s.Gender === "Female"), [students]);
  const sgpiSortedStudents = useMemo(() => [...students].sort((a, b) => b.SGPI - a.SGPI), [students]);
  
  const topPerformers = useMemo(() => {
    if (!successfulStudents.length) return [];
    return [...successfulStudents]
      .filter((student) => student[selectedSubject] > 0)
      .sort((a, b) => b[selectedSubject] - a[selectedSubject] || a.Name.localeCompare(b.Name))
      .slice(0, 10)
      .map((student, index) => ({
        Rank: index + 1, Name: student.Name, PRN: student.PRN, Marks: student[selectedSubject],
      }));
  }, [successfulStudents, selectedSubject]);

  const marksDistribution = useMemo(() => {
    const distribution = Object.fromEntries(markRanges.map((range) => [range, { students: [] }]));
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
    const summary = Object.fromEntries(markRanges.map((range) => [range, Object.fromEntries(subjects.map((subject) => [subject, 0]))]));
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

  return (
    <div className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 font-sans min-h-screen">
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-[#1E3A8A] dark:text-gray-100">GradeWise.</h1>
          <button onClick={handleThemeToggle} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition">
            Toggle {theme === "light" ? "Dark" : "Light"} Mode
          </button>
        </div>

        {/* --- LOAD DATA SECTION --- */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
           <h2 className="text-xl font-bold mb-4 text-[#1E3A8A] dark:text-gray-200">Load Data Source</h2>
           
           {errorMsg && (
             <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm font-semibold">
               {errorMsg}
             </div>
           )}

           <div className="flex flex-col md:flex-row gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Semester</label>
                <input 
                  type="number" 
                  value={dbSemester}
                  onChange={(e) => setDbSemester(e.target.value)}
                  className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full md:w-32"
                />
              </div>
              <button 
                onClick={fetchFromDatabase}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition font-medium w-full md:w-auto"
                disabled={isLoading}
              >
                {isLoading ? "Fetching..." : "Fetch from Database"}
              </button>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                 <span className="text-sm text-gray-500">OR</span>
                 <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition inline-block text-center w-full md:w-auto">
                    Upload CSV File
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                 </label>
              </div>
           </div>
           
           {students.length > 0 && (
             <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-sm">
               <strong>Success:</strong> Loaded {students.length} student records.
             </div>
           )}
        </div>

        {/* --- DASHBOARD CONTENT --- */}
        <div className="counts mb-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard title="Total Successful" count={successfulStudents.length} color="text-[#1E3A8A] dark:text-yellow-400" />
          <StatCard title="Total Unsuccessful" count={unsuccessfulStudents.length} color="text-red-600 dark:text-red-500" />
          <StatCard title="Total Male" count={maleStudents.length} color="text-blue-600 dark:text-blue-400" />
          <StatCard title="Total Female" count={femaleStudents.length} color="text-pink-600 dark:text-pink-400" />
        </div>

        <div className="space-y-8">
          <DetailsCard title="Visual Analytics">
             {students.length > 0 ? (
               <div className="relative h-96 w-full">
                 <SubjectPassFailChart students={students} subjectConfig={SUBJECT_CONFIG} />
               </div>
             ) : (
               <p className="text-center text-gray-500">Load data to view analytics.</p>
             )}
          </DetailsCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableCard title="Successful Students" data={successfulStudents} columns={["Seat No", "Name", "PRN", "SGPI"]} />
            <TableCard title="Unsuccessful Students" data={unsuccessfulStudents} columns={["Seat No", "Name", "PRN", "SGPI"]} />
          </div>

          <DetailsCard title={`Top 10 Performers in ${subjectNameMap[selectedSubject]}`}>
             <SubjectSelector subjectsConfig={filteredSubjectsConfig} selectedSubject={selectedSubject} onSelectSubject={setSelectedSubject} />
             <SimpleTable data={topPerformers} columns={["Rank", "Name", "PRN", "Marks"]} />
          </DetailsCard>
          
          <TableCard title="All Students" data={students} columns={["Seat No", "Name", "Gender", "PRN", "Result", "SGPI"]} />
        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatCard({ title, count, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
      <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-4xl font-bold mt-2 ${color}`}>{count}</p>
    </div>
  );
}

function DetailsCard({ title, children }) {
  return (
    <details className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
      <summary className="cursor-pointer text-2xl font-bold text-[#1E3A8A] dark:text-gray-100 mb-4">{title}</summary>
      {children}
    </details>
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
            selectedSubject === subject.key ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
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
    <DetailsCard title={title}>
      <SimpleTable data={data} columns={columns} />
    </DetailsCard>
  );
}

function SimpleTable({ data, columns }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>{columns.map((col) => <th key={col} className="px-6 py-3">{col}</th>)}</tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                {columns.map((col) => <td key={col} className="px-6 py-4">{row[col]}</td>)}
              </tr>
            ))
          ) : (
            <tr><td colSpan={columns.length} className="text-center py-4">No data available.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}