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
import { Award, Download, GraduationCap } from "lucide-react"; //

export const GoldenStudentReport = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoldenStudents = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/students/analytics/golden",
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
    <Card className="border-t-4 border-t-emerald-600 shadow-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-emerald-50/30">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="text-emerald-600" />
          Golden Graduates (First-Attempt Clear)
        </CardTitle>
        <Button
          onClick={exportToCSV}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold">PRN</TableHead>
              <TableHead className="font-bold">Name</TableHead>
              {[
                "Sem 1",
                "Sem 2",
                "Sem 3",
                "Sem 4",
                "Sem 5",
                "Sem 6",
                "Sem 8",
              ].map((sem) => (
                <TableHead key={sem} className="text-center font-bold">
                  {sem}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow
                key={s.prn}
                className="hover:bg-emerald-50/20 transition-colors"
              >
                <TableCell className="font-mono text-xs">{s.prn}</TableCell>
                <TableCell className="font-medium text-slate-800">
                  {s.name}
                </TableCell>
                <TableCell className="text-center">
                  {s.semesterData.sem1SGPI?.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {s.semesterData.sem2SGPI?.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {s.semesterData.sem3SGPI?.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {s.semesterData.sem4SGPI?.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {s.semesterData.sem5SGPI?.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {s.semesterData.sem6SGPI?.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-bold text-emerald-700 bg-emerald-50/50">
                  {s.semesterData.sem8SGPI?.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
