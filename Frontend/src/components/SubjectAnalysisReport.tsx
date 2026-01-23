import React from "react";
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

const SubjectAnalysisReport: React.FC<{ analysisData: AnalysisData }> = ({
  analysisData,
}) => {
  const chartData = Object.entries(analysisData).map(([subject, stats]) => ({
    subject: subject
      .split(" ")
      .map((s) => s.substring(0, 3))
      .join(" "),
    Appeared: stats.totalAppeared,
    Passed: stats.totalPassed,
    "40-50 Marks": stats.marks40_50,
    "51-59 Marks": stats.marks51_59,
    "60+ Marks": stats.marks60_Above,
  }));

  const maxBarValue = Math.max(
    ...Object.values(analysisData).map((s) => s.totalAppeared),
    1
  );
  const chartDomainMax = Math.ceil(maxBarValue / 10) * 10;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border border-gray-400 text-xs shadow-lg">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 border border-gray-400 mt-8">
      <h2 className="text-xl font-bold text-center mb-4">RESULT SUMMARY</h2>

      <div className="overflow-x-auto mx-auto mb-8">
        <table className="min-w-full border border-black text-xs">
          <thead>
            <tr className="bg-blue-50">
              <th rowSpan={2} className="p-2 border border-black font-bold">
                SUBJECT
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                NAME OF TEACHER
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                TOTAL NO OF STUDENTS APPEARED
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                TOTAL NO. OF STUDENTS PASSED
              </th>
              <th rowSpan={2} className="p-2 border border-black font-bold">
                PASS PERCENTAGE IN EACH SUBJECT
              </th>
              <th colSpan={3} className="p-2 border border-black font-bold">
                CANDIDATES GETTING
              </th>
            </tr>
            <tr className="bg-blue-50">
              <th className="p-2 border border-black font-bold">40-50 MARKS</th>
              <th className="p-2 border border-black font-bold">51-59 MARKS</th>
              <th className="p-2 border border-black font-bold">
                60 & ABOVE 60 MARKS
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analysisData).map(([subject, stats]) => (
              <tr key={subject} className="even:bg-gray-50">
                <td className="p-2 border border-black font-semibold">
                  {subject}
                </td>
                <td className="p-2 border border-black">{stats.teacher}</td>
                <td className="p-2 border border-black">
                  {stats.totalAppeared}
                </td>
                <td className="p-2 border border-black">{stats.totalPassed}</td>
                <td className="p-2 border border-black font-bold text-green-700">
                  {stats.passPercentage}
                </td>
                <td className="p-2 border border-black">{stats.marks40_50}</td>
                <td className="p-2 border border-black">{stats.marks51_59}</td>
                <td className="p-2 border border-black">
                  {stats.marks60_Above}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <div className="border border-gray-400 p-4 pt-10 h-[400px]">
          <h4 className="text-center font-bold mb-4">Result Analysis</h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barCategoryGap="10%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, chartDomainMax]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="Appeared"
                fill="#3B82F6"
                name="Total Students Appeared"
              />
              <Bar
                dataKey="Passed"
                fill="#EF4444"
                name="Total Students Passed"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-gray-400 p-4 pt-10 h-[400px]">
          <h4 className="text-center font-bold mb-4">
            Subjectwise Statistical Analysis
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, chartDomainMax]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="horizontal" verticalAlign="top" align="center" />
              <Bar dataKey="40-50 Marks" fill="#6B7280" name="40-50 MARKS" />
              <Bar dataKey="51-59 Marks" fill="#3B82F6" name="51-59 MARKS" />
              <Bar
                dataKey="60+ Marks"
                fill="#F59E0B"
                name="60 & ABOVE 60 MARKS"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SubjectAnalysisReport;
