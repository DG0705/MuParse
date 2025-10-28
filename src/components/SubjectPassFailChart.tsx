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

export function SubjectPassFailChart({ students, subjectConfig }: Props) {
  const chartData = useMemo(() => {
    if (!students.length || !subjectConfig.length) {
      return [];
    }

    return subjectConfig.map((subject) => {
      let passCount = 0;
      let failCount = 0;

      const passingMark = PASSING_MARKS_MAP[subject.key];

      students.forEach((student) => {
        const marks = student[subject.key];
        if (
          typeof marks === "number" &&
          !isNaN(marks) &&
          typeof passingMark === "number"
        ) {
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
      };
    });
  }, [students, subjectConfig]);

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
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(5px)",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey="Pass" fill="#1E3A8A" />
        <Bar dataKey="Fail" fill="#E11D48" />
      </BarChart>
    </ResponsiveContainer>
  );
}
