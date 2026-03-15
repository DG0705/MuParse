import { useState } from "react";
import { Search, AlertTriangle, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { MLInsightCard } from "./MLInsightCard";

interface StudentData {
  profile: { name: string; prn: string; category: string; };
  summary: { totalSemestersAppeared: number; activeKTs: string; ktCount: number; };
  academicHistory: Record<string, SemesterRecord[]>;
}

interface SemesterRecord {
  seatNo: string;
  sgpi: string;
  totalMarks: string;
  result: string;
  hasKT: boolean;
  subjects: Record<string, string>;
}

const StudentHistory = () => {
  const [prn, setPrn] = useState("");
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!prn) return;
    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(`http://localhost:5000/api/students/history/${prn.trim()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to fetch data from server");
      }
      const backendData = await response.json();
      setData(backendData as StudentData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Student History Search</h1>
          <p className="text-muted-foreground">Enter a PRN to view complete academic track record</p>
        </div>

        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input placeholder="Enter PRN Number" value={prn} onChange={(e) => setPrn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
              <Button onClick={handleSearch} disabled={loading}>{loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}</Button>
            </div>
          </CardContent>
        </Card>

        {error && (<Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}

        {data && data.profile && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle>Student Profile</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium">{data.profile?.name || "N/A"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">PRN:</span><span className="font-medium">{data.profile?.prn || "N/A"}</span></div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant={data.profile?.category === "Dropper" ? "destructive" : "outline"}>
                        {data.profile?.category || "Regular"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle>Academic Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Semesters Appeared:</span><span className="font-bold text-lg">{data.summary?.totalSemestersAppeared || 0}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Active KTs:</span>
                      {data.summary?.ktCount > 0 ? (<Badge variant="destructive" className="text-base px-3">{data.summary.ktCount} Failed Subjects</Badge>) : (<Badge variant="default" className="bg-green-500 hover:bg-green-600 text-base px-3">All Clear</Badge>)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

<div className="my-6 w-full">
  {data?.profile?.prn && (
    <MLInsightCard prn={data.profile.prn} />

  )}
</div>

            <Separator />

            <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6" /> Semester Breakdown</h2>

            <div className="grid gap-6">
              {Object.entries(data.academicHistory || {}).map(([semName, records]) => {
                const record = records?.[0];
                if (!record) return null;

                let displaySgpi = String(record.sgpi || "0").trim();
                let displayTotal = String(record.totalMarks || "0").trim();
                let displayResult = String(record.result || "N/A").trim();
                let displayHasKT = record.hasKT;

                const actualSubjects: { name: string, marks: string }[] = [];

                if (record.subjects) {
                    for (const [key, val] of Object.entries(record.subjects)) {
                        const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        const stringVal = String(val).trim();

                        if (sanitizedKey.includes('SGP')) {
                            // NEW RULE: Only accept the value if it's NOT a dirty zero!
                            // This stops the old "0" from overwriting the real "9.74"
                            if (stringVal !== "0" && stringVal !== "0.00" && stringVal !== "-" && stringVal !== "") {
                                displaySgpi = stringVal; 
                            }
                        } 
                        else if (sanitizedKey.includes('TOTAL') || sanitizedKey.includes('GRAND')) {
                            if (stringVal !== "0" && stringVal !== "") {
                                displayTotal = stringVal;
                            }
                        } 
                        else if (sanitizedKey.includes('RESULT')) {
                            if (stringVal !== "N/A" && stringVal !== "") {
                                displayResult = stringVal;
                            }
                        } 
                        else {
                            // Actual subjects go into the list
                            actualSubjects.push({ name: key, marks: stringVal });
                        }
                    }
                }

                const upperRes = displayResult.toUpperCase();
                if (upperRes === 'F' || upperRes.includes('FAIL') || upperRes.includes('KT')) {
                    displayHasKT = true;
                } else if (upperRes === 'P' || upperRes.includes('PASS') || upperRes.includes('SUCCESSFUL')) {
                    displayHasKT = false;
                }

                // Final safety check to make sure empty values display correctly
                if (displaySgpi === "0" || displaySgpi === "0.00") displaySgpi = "N/A";
                if (displayTotal === "0") displayTotal = "N/A";

                return (
                <Card key={semName} className={`overflow-hidden border-l-4 ${displayHasKT ? 'border-l-red-500' : 'border-l-green-500'}`}>
                  <CardHeader className="bg-muted/30 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>{semName}</CardTitle>
                      {displayHasKT ? (<Badge variant="destructive">Has KT</Badge>) : (<Badge variant="secondary" className="text-green-600 bg-green-100">Pass</Badge>)}
                    </div>
                    <CardDescription>Seat No: {record.seatNo}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                      <div className="p-2 bg-secondary/20 rounded border border-indigo-100 shadow-sm">
                        <div className="text-xs text-muted-foreground font-semibold">SGPI</div>
                        <div className="font-bold text-lg text-indigo-700">{displaySgpi}</div>
                      </div>
                      <div className="p-2 bg-secondary/20 rounded">
                        <div className="text-xs text-muted-foreground">Total Marks</div>
                        <div className="font-bold text-lg">{displayTotal}</div>
                      </div>
                      <div className="p-2 bg-secondary/20 rounded">
                        <div className="text-xs text-muted-foreground">Result</div>
                        <div className={`font-bold text-lg ${displayHasKT ? 'text-red-600' : 'text-green-600'}`}>{displayResult}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Subject Performance:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {actualSubjects.map((sub, idx) => {
                           const isSubjectFail = sub.marks.includes('F') || sub.marks === "0" || sub.marks === "0.00" || sub.marks.includes('KT'); 
                           return (
                            <div key={idx} className={`flex justify-between items-center text-sm p-2 rounded border ${isSubjectFail ? 'bg-red-50 border-red-200' : 'bg-background'}`}>
                              <span className="truncate pr-2" title={sub.name}>{sub.name}</span>
                              <span className="font-mono font-medium">{sub.marks}</span>
                            </div>
                           );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentHistory;