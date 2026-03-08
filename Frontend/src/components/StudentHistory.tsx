import { useState } from "react";
import { Search, AlertTriangle, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
  subjects: Record<string, string>; // Strictly expects strings
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
      const response = await fetch(`http://localhost:5000/api/students/history/${prn}`);
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
                    
                    {/* UPDATED: Dynamic Badge Color based on Dropper status */}
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

            <Separator />

            <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6" /> Semester Breakdown</h2>

            <div className="grid gap-6">
              {Object.entries(data.academicHistory || {}).map(([semName, records]) => {
                const record = records?.[0];
                if (!record) return null;
                return (
                <Card key={semName} className={`overflow-hidden border-l-4 ${record.hasKT ? 'border-l-red-500' : 'border-l-green-500'}`}>
                  <CardHeader className="bg-muted/30 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>{semName}</CardTitle>
                      {record.hasKT ? (<Badge variant="destructive">Has KT</Badge>) : (<Badge variant="secondary" className="text-green-600 bg-green-100">Pass</Badge>)}
                    </div>
                    <CardDescription>Seat No: {record.seatNo}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                      <div className="p-2 bg-secondary/20 rounded"><div className="text-xs text-muted-foreground">SGPI</div><div className="font-bold">{record.sgpi}</div></div>
                      <div className="p-2 bg-secondary/20 rounded"><div className="text-xs text-muted-foreground">Total Marks</div><div className="font-bold">{record.totalMarks}</div></div>
                      <div className="p-2 bg-secondary/20 rounded"><div className="text-xs text-muted-foreground">Result</div><div className={`font-bold ${record.hasKT ? 'text-red-500' : 'text-green-600'}`}>{record.result}</div></div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Subject Performance:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(record.subjects || {}).map(([subject, marksStr]) => {
                           const isSubjectFail = marksStr.includes('F') || marksStr === "0"; 
                           return (
                            <div key={subject} className={`flex justify-between items-center text-sm p-2 rounded border ${isSubjectFail ? 'bg-red-50 border-red-200' : 'bg-background'}`}>
                              <span className="truncate pr-2" title={subject}>{subject}</span>
                              <span className="font-mono font-medium">{marksStr}</span>
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