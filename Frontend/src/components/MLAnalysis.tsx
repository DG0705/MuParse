import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, Users } from "lucide-react";

export default function MLAnalysis() {
  // Inside your component
  const [anomalies, setAnomalies] = useState<any[]>([]); // Initialize as empty array

  useEffect(() => {
    fetch("http://localhost:5000/api/students/ml-analysis")
      .then((res) => res.json())
      .then((data) => {
        // Safety check: ensure 'data' is an array
        if (Array.isArray(data)) {
          setAnomalies(data);
        } else {
          setAnomalies([]);
        }
      })
      .catch((err) => {
        console.error(err);
        setAnomalies([]); // Prevent crash on network error
      });
  }, []);

  // In your JSX, use optional chaining or check length
  {
    Array.isArray(anomalies) && anomalies.length > 0 ? (
      anomalies.map((item, idx) => <TableRow key={idx}>...</TableRow>)
    ) : (
      <TableRow>
        <TableCell colSpan={6}>
          No anomalies detected or error loading data.
        </TableCell>
      </TableRow>
    );
  }

  const getRiskColor = (level) => {
    switch (level) {
      case "Critical":
        return "bg-red-500 hover:bg-red-600";
      case "Warning":
        return "bg-orange-500 hover:bg-orange-600";
      case "Peer Lag":
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" />
            Advanced Academic Anomaly Detection
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            Total Insights: {anomalies.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student PRN</TableHead>
              <TableHead>Sem</TableHead>
              <TableHead>SGPI</TableHead>
              <TableHead>Peer Z-Score</TableHead>
              <TableHead>Drop</TableHead>
              <TableHead>Risk Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomalies.map((item, idx) => (
              <TableRow
                key={idx}
                className={item.risk_level === "Critical" ? "bg-red-50/50" : ""}
              >
                <TableCell className="font-mono">{item.prn}</TableCell>
                <TableCell>{item.semester}</TableCell>
                <TableCell className="font-bold">{item.sgpi}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users size={14} className="text-slate-400" />
                    {item.z_score.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell className="text-red-600">
                  <div className="flex items-center gap-1">
                    <TrendingDown size={14} />-{item.drop.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getRiskColor(item.risk_level)}>
                    {item.risk_level}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
