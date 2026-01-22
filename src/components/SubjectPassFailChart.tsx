import React, { useMemo } from "react";
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

type SubjectConfigItem = {
  key: string;
  displayName: string;
};

type Student = {
  [key: string]: any;
};

type Props = {
  students: Student[];
  subjectConfig: SubjectConfigItem[];
};

// Known passing marks (optional overrides)
const PASSING_MARKS_MAP: { [key: string]: number } = {
  Eng_Maths_I_Marks: 32,
  Eng_Physics_I_Marks: 10,
  Eng_Chem_I_Marks: 30,
  Eng_Mechanics_Marks: 10,
  Basic_Elec_Eng_Marks: 30,
  Eng_Physics_I_TW_Marks: 10,
  Eng_Chem_I_TW_Marks: 32,
  Eng_Mechanics_TW_Marks: 20,
  Basic_Elec_Eng_TW_Marks: 32,
  Workshop_I_Marks: 20,
  Eng_Maths_I_TW_Marks: 20,
};

// Default passing mark for unknown subjects
const DEFAULT_PASS_MARK = 40; 

export function SubjectPassFailChart({ students, subjectConfig }: Props) {
  const chartData = useMemo(() => {
    if (!students.length || !subjectConfig.length) {
      return [];
    }

    return subjectConfig.map((subject) => {
      let passCount = 0;
      let failCount = 0;

      // Use specific passing mark if known, otherwise default to 40
      const passingMark = PASSING_MARKS_MAP[subject.key] ?? DEFAULT_PASS_MARK;

      students.forEach((student) => {
        const marks = student[subject.key];
        
        // Check if marks exist and are a valid number
        if (typeof marks === "number" && !isNaN(marks)) {
          if (marks >= passingMark) {
            passCount++;
          } else {
            failCount++;
          }
        }
      });

      return {
        name: subject.displayName,
        Pass: passCount,
        Fail: failCount,
        // Optional: Include passing criteria in the data for tooltip usage if needed
        passingMark
      };
    });
  }, [students, subjectConfig]);

  if (!chartData.length) {
     return <div className="h-full flex items-center justify-center text-gray-400">No Chart Data Available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-15}
          textAnchor="end"
          height={60}
          interval={0}
          fontSize={12}
        />
        <YAxis
          label={{
            value: "Number of Students",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(5px)",
            border: "1px solid #ccc",
            borderRadius: "8px",
            color: "#333"
          }}
          formatter={(value: number, name: string) => [value, name]}
          labelStyle={{ fontWeight: "bold", marginBottom: "5px" }}
        />
        <Legend />
        <Bar dataKey="Pass" fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Fail" fill="#dc2626" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}