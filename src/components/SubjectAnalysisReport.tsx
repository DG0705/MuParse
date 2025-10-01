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
      .join(""),
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
        <div className="p-2 bg-card border border-border text-xs shadow-lg">
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
    <div className="p-4 border border-border mt-8 bg-card">
      <h2 className="text-xl font-bold text-center mb-4">
        SUBJECT-WISE RESULT SUMMARY
      </h2>

      <div className="overflow-x-auto mx-auto mb-8">
        <table className="min-w-full border border-border text-xs text-center">
          <thead>
            <tr className="bg-secondary">
              <th rowSpan={2} className="p-2 border border-border font-bold">
                SUBJECT
              </th>
              <th rowSpan={2} className="p-2 border border-border font-bold">
                NAME OF TEACHER
              </th>
              <th rowSpan={2} className="p-2 border border-border font-bold">
                TOTAL STUDENTS APPEARED
              </th>
              <th rowSpan={2} className="p-2 border border-border font-bold">
                TOTAL STUDENTS PASSED
              </th>
              <th rowSpan={2} className="p-2 border border-border font-bold">
                PASS PERCENTAGE
              </th>
              <th colSpan={3} className="p-2 border border-border font-bold">
                CANDIDATES SCORING
              </th>
            </tr>
            <tr className="bg-secondary">
              <th className="p-2 border border-border font-bold">40-50 MARKS</th>
              <th className="p-2 border border-border font-bold">51-59 MARKS</th>
              <th className="p-2 border border-border font-bold">
                60 & ABOVE MARKS
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analysisData).map(([subject, stats]) => (
              <tr key={subject} className="even:bg-muted/50">
                <td className="p-2 border border-border font-semibold">
                  {subject}
                </td>
                <td className="p-2 border border-border">{stats.teacher}</td>
                <td className="p-2 border border-border">
                  {stats.totalAppeared}
                </td>
                <td className="p-2 border border-border">{stats.totalPassed}</td>
                <td className="p-2 border border-border font-bold text-green-700">
                  {stats.passPercentage}
                </td>
                <td className="p-2 border border-border">{stats.marks40_50}</td>
                <td className="p-2 border border-border">{stats.marks51_59}</td>
                <td className="p-2 border border-border">
                  {stats.marks60_Above}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <div className="border border-border p-4 pt-10 h-[400px]">
          <h4 className="text-center font-bold mb-4">
            Result Analysis (Appeared vs. Passed)
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
                fill="#10B981"
                name="Total Students Passed"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="border border-border p-4 pt-10 h-[400px]">
          <h4 className="text-center font-bold mb-4">
            Subject-wise Statistical Analysis (Marks Breakdown)
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, chartDomainMax]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="40-50 Marks"
                fill="#EAB308"
                name="40-50 Marks"
              />
              <Bar
                dataKey="51-59 Marks"
                fill="#F97316"
                name="51-59 Marks"
              />
              <Bar
                dataKey="60+ Marks"
                fill="#22C55E"
                name="60+ Marks"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SubjectAnalysisReport;
