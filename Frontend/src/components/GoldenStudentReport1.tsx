// Frontend/src/components/GoldenStudentReport.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button"; //
import {
  Award,
  Badge,
  Download,
  GraduationCap,
  ShieldCheck,
} from "lucide-react"; //

export const GoldenStudentReport1 = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoldenStudents = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/students/analytics/golden1",
        );
        if (response.data.success) {
          setStudents(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching honors list:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGoldenStudents();
  }, []);

  const exportToCSV = () => {
    const headers = "PRN,Name,Sem 1,Sem 2,Sem 3,Sem 4,Sem 5,Sem 6,Sem 8\n";
    const rows = students
      .map((s) => {
        const d = s.semesterData;
        return `${s.prn},${s.name},${d.sem1SGPI || 0},${d.sem2SGPI || 0},${d.sem3SGPI || 0},${d.sem4SGPI || 0},${d.sem5SGPI || 0},${d.sem6SGPI || 0},${d.sem8SGPI || 0}`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Golden_Graduates_Excluding_Sem7.csv`;
    a.click();
  };

  if (loading)
    return (
      <div className="p-10 text-center animate-pulse">
        Filtering Perfect Records (Sems 1-6 & 8)...
      </div>
    );

  return (
    <Card className="border-t-4 border-t-emerald-600 shadow-2xl">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between bg-emerald-50/40 pb-6 border-b">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-emerald-900">
            <GraduationCap className="h-8 w-8 text-emerald-600" />
            Golden Graduates: Perfect First-Attempt
          </CardTitle>
          <p className="text-sm text-emerald-700 font-medium italic">
            Includes Regular (Sems 1-6, 8) and DSE (Sems 3-6, 8) with zero KT
            history.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1">
            {students.length} Honors Students
          </Badge>
          <Button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
          >
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/80">
              <TableRow>
                <TableHead className="w-[160px] font-bold text-slate-700">
                  PRN
                </TableHead>
                <TableHead className="font-bold text-slate-700">
                  Student Name
                </TableHead>
                <TableHead className="text-center font-bold text-slate-700">
                  Type
                </TableHead>
                {[
                  "Sem 1",
                  "Sem 2",
                  "Sem 3",
                  "Sem 4",
                  "Sem 5",
                  "Sem 6",
                  "Sem 8",
                ].map((sem) => (
                  <TableHead
                    key={sem}
                    className="text-center font-bold text-slate-700"
                  >
                    {sem}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => (
                  <TableRow
                    key={student.prn}
                    className="hover:bg-emerald-50/30 transition-all border-b"
                  >
                    <TableCell className="font-mono text-xs text-slate-500">
                      {student.prn}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {student.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                          student.studentType === "DSE"
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {student.studentType}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {student.semesterData.sem1SGPI?.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {student.semesterData.sem2SGPI?.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {student.semesterData.sem3SGPI?.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {student.semesterData.sem4SGPI?.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {student.semesterData.sem5SGPI?.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {student.semesterData.sem6SGPI?.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-center font-bold text-emerald-700 bg-emerald-50/60 border-l border-emerald-100">
                      <div className="flex items-center justify-center gap-1">
                        {student.semesterData.sem8SGPI?.toFixed(2)}
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-24 text-slate-400"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Award className="h-16 w-16 opacity-10" />
                      <p className="text-lg font-medium">
                        No students currently match the strict "Golden"
                        criteria.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
export default GoldenStudentReport1;
