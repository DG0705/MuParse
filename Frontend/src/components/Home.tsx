import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  TrendingUp, 
  Search, 
  AlertTriangle,
  Users2,
  ChevronRight 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// --- Interfaces for Student Data ---
interface StudentData {
  type?: "single";
  profile: {
    name: string;
    prn: string;
    category: string;
  };
  summary: {
    totalSemestersAppeared: number;
    activeKTs: string;
    ktCount: number;
  };
  academicHistory: Record<string, SemesterRecord[]>;
}

interface MultipleMatches {
  type: "multiple";
  count: number;
  students: {
    name: string;
    prn: string;
    category: string;
    batch?: string;
  }[];
}

interface SemesterRecord {
  seatNo: string;
  sgpi: string;
  totalMarks: string;
  result: string;
  hasKT: boolean;
  subjects: Record<string, string>;
}

interface KTDetail {
  semester: string;
  subject: string;
  value: string;
}

const Home = () => {
  const years = [
    { year: 1, title: "First Year", description: "Semester 1 & 2 - PDF Conversion and Result Analysis", available: true, icon: BookOpen, gradient: "from-blue-500 to-cyan-500" },
    { year: 2, title: "Second Year", description: "Semester 3 & 4 - PDF Conversion and Result Analysis", available: true, icon: Users, gradient: "from-purple-500 to-pink-500" },
    { year: 3, title: "Third Year", description: "Semester 5 & 6 - PDF Conversion and Result Analysis", available: true, icon: TrendingUp, gradient: "from-orange-500 to-red-500" },
    { year: 4, title: "Fourth Year", description: "Semester 7 & 8 - PDF Conversion and Result Analysis", available: true, icon: GraduationCap, gradient: "from-green-500 to-emerald-500" }
  ];

  // --- Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [batchQuery, setBatchQuery] = useState("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [multipleMatches, setMultipleMatches] = useState<MultipleMatches | null>(null);
  const [batchResults, setBatchResults] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [error, setError] = useState("");

  // --- Helper: Extract KTs and associated Marks ---
  const getAllKts = (data: StudentData | null): KTDetail[] => {
    if (!data) return [];
    const kts: KTDetail[] = [];
    Object.entries(data.academicHistory).forEach(([sem, records]) => {
      const record = records[0]; 
      if (record && record.subjects) {
        Object.entries(record.subjects).forEach(([key, val]) => {
          const valStr = val.toString().trim();
          const isFail = valStr === "F" || valStr.includes(" F") || valStr.includes("KT");
          if (isFail) {
            let displayValue = valStr;
            let displaySubject = key;
            if (key.endsWith("_GR")) {
               const correspondingMarksKey = key.replace("_GR", "_Marks");
               if (record.subjects[correspondingMarksKey]) {
                 displayValue = record.subjects[correspondingMarksKey];
                 displaySubject = correspondingMarksKey;
               }
            }
            kts.push({ semester: sem, subject: displaySubject, value: displayValue });
          }
        });
      }
    });
    return kts;
  };

  const currentKts = getAllKts(studentData);

// --- Handle Individual Search (Name or PRN) ---
  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || searchQuery;
    if (!query) return;
    setLoading(true);
    setError("");
    setStudentData(null);
    setMultipleMatches(null);
    setShowSelectionDialog(false);

    try {
      const response = await fetch(`http://localhost:5000/api/students/history/${query}`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Student not found");
      }
      
      const backendData = await response.json();

      if (backendData.type === "multiple") {
        setMultipleMatches(backendData);
        setShowSelectionDialog(true);
      } else {
        // --- FIX: Transform the backend data into the format the frontend expects ---
        const formattedData: StudentData = {
          profile: {
            name: backendData.student.name,
            prn: backendData.student.prn,
            category: backendData.student.status || "Regular"
          },
          summary: {
            totalSemestersAppeared: backendData.records.length,
            activeKTs: "", 
            ktCount: backendData.records.filter((r: any) => r.isKT).length
          },
          academicHistory: {}
        };

        // Group the records by semester
        backendData.records.forEach((record: any) => {
          formattedData.academicHistory[`Semester ${record.semester}`] = [{
            seatNo: record.seatNo,
            sgpi: record.sgpi,
            totalMarks: record.totalMarks,
            result: record.finalResult,
            hasKT: record.isKT,
            subjects: record.subjects || {}
          }];
        });

        setStudentData(formattedData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Handle Batch Search ---
  const handleBatchSearch = async () => {
    if (!batchQuery) return;
    setBatchLoading(true);
    setBatchResults(null);
    setError("");

    try {
      const response = await fetch(`http://localhost:5000/api/students/batch/${batchQuery}`);
      if (!response.ok) throw new Error("No students found for this batch");
      const result = await response.json();
      setBatchResults(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Academic Insights Portal</h1>
              <p className="text-muted-foreground mt-1">Search by Batch, Name, or PRN</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        
        {/* --- SECTION 1: BATCH SEARCH --- */}
        <div className="mb-8 max-w-4xl mx-auto animate-fade-in">
           <Card className="w-full border-dashed border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-primary" /> Batch Search
                </CardTitle>
                <CardDescription>Enter the first 4 digits of PRN to view the entire batch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input 
                    placeholder="Enter Batch (e.g. 2023)" 
                    value={batchQuery}
                    onChange={(e) => setBatchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBatchSearch()}
                  />
                  <Button variant="outline" onClick={handleBatchSearch} disabled={batchLoading}>
                    {batchLoading ? "..." : "View Batch"}
                  </Button>
                </div>

                {batchResults && (
                  <div className="mt-6 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-sm font-semibold text-muted-foreground">Found {batchResults.count} Students</span>
                      <Badge variant="secondary">Batch {batchResults.batch}</Badge>
                    </div>
                    {batchResults.students.map((student: any) => (
                      <div 
                        key={student.prn} 
                        // ACTION: Click triggers full academic search using PRN
                        className="flex items-center justify-between p-3 rounded-md border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors border-primary/10 hover:border-primary/40"
                        onClick={() => handleSearch(student.prn)}
                      >
                        <div>
                          <p className="font-bold text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{student.prn}</p>
                        </div>
                        <Badge variant="outline">Batch: {student.batch}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
           </Card>
        </div>

        {/* --- SECTION 2: INDIVIDUAL SEARCH --- */}
        <div className="mb-16 max-w-4xl mx-auto">
           <Card className="w-full shadow-md border-primary/20">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Input 
                    placeholder="Enter PRN or Student Name" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="text-lg h-12"
                  />
                  <Button onClick={() => handleSearch()} disabled={loading} size="lg" className="h-12 px-8">
                    {loading ? "..." : <><Search className="w-5 h-5 mr-2" /> Search</>}
                  </Button>
                </div>
              </CardContent>
           </Card>

           {error && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

           {/* --- SELECTION DIALOG (For Multiple Matches) --- */}
           <Dialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog}>
             <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
               <DialogHeader>
                 <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Multiple Matches Found</DialogTitle>
                 <DialogDescription>Select the correct student matching "{searchQuery}".</DialogDescription>
               </DialogHeader>
               <div className="grid gap-3 mt-4">
                 {multipleMatches?.students.map((student, idx) => (
                   <div 
                     key={student.prn} 
                     // ACTION: Click triggers full academic search using PRN
                     className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-all hover:border-primary/50" 
                     onClick={() => handleSearch(student.prn)}
                   >
                     <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{idx + 1}</div>
                       <div><h4 className="font-bold">{student.name}</h4><p className="text-sm text-muted-foreground font-mono">PRN: {student.prn}</p></div>
                     </div>
                     <Badge variant="secondary">Select <ChevronRight className="w-3 h-3 ml-1" /></Badge>
                   </div>
                 ))}
               </div>
             </DialogContent>
           </Dialog>

           {/* --- STUDENT DATA DISPLAY --- */}
           {studentData && (
             <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2 bg-muted/20">
                      <CardTitle className="text-lg">Student Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-semibold">{studentData.profile.name}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">PRN</span>
                        <span className="font-mono">{studentData.profile.prn}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="outline">{studentData.profile.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 bg-muted/20">
                      <CardTitle className="text-lg">Academic Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Semesters Appeared</span>
                        <span className="font-bold text-2xl">{studentData.summary.totalSemestersAppeared}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total KTs</span>
                        {currentKts.length > 0 ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Badge variant="destructive" className="text-sm px-3 py-1 cursor-pointer animate-pulse">{currentKts.length} Active KT(s)</Badge>
                            </DialogTrigger>
                            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-destructive">
                                  <AlertTriangle className="w-5 h-5" /> KT Breakdown
                                </DialogTitle>
                                <DialogDescription>Subjects failed across all semesters.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 mt-2">
                                {currentKts.map((kt, i) => (
                                   <div key={i} className="flex justify-between items-center p-3 rounded-lg border bg-card hover:bg-muted/50">
                                      <div className="space-y-1">
                                        <p className="font-medium text-sm truncate w-[200px]">{kt.subject}</p>
                                        <Badge variant="outline" className="text-xs">{kt.semester}</Badge>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-muted-foreground mb-1">Marks</div>
                                        <Badge variant="secondary" className="text-red-600 bg-red-50">{kt.value}</Badge>
                                      </div>
                                   </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Badge className="bg-green-600 text-white">All Clear</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator className="my-6" />
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Semester Breakdown
                </h3>
                <div className="grid gap-6">
                  {Object.entries(studentData.academicHistory).map(([semName, records]) => {
                    const semKts = records[0].subjects ? Object.values(records[0].subjects).filter(v => { const valStr = v.toString().trim(); return valStr === "F" || valStr.includes(" F") || valStr.includes("KT"); }).length : 0;
                    return (
                    <Card key={semName} className={`overflow-hidden border-l-4 ${records[0].hasKT || semKts > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
                      <CardHeader className="bg-muted/30 py-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">{semName}</CardTitle>
                          <div className="flex gap-2 items-center">
                             <Badge variant="outline">Seat: {records[0].seatNo}</Badge>
                             {semKts > 0 ? <Badge variant="destructive">{semKts} KT</Badge> : <Badge variant="secondary" className="text-green-700 bg-green-100">Pass</Badge>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-4 mb-4 text-center justify-start">
                          <div className="p-2 bg-secondary/10 rounded border min-w-[100px] flex-1">
                            <div className="text-xs text-muted-foreground uppercase">SGPI</div>
                            <div className="font-bold text-lg">{records[0].sgpi}</div>
                          </div>
                          {records[0].totalMarks !== "0" && (
                            <div className="p-2 bg-secondary/10 rounded border min-w-[100px] flex-1">
                              <div className="text-xs text-muted-foreground uppercase">Total Marks</div>
                              <div className="font-bold text-lg">{records[0].totalMarks}</div>
                            </div>
                          )}
                          <div className="p-2 bg-secondary/10 rounded border min-w-[100px] flex-1">
                            <div className="text-xs text-muted-foreground uppercase">Result</div>
                            <div className={`font-bold text-lg ${records[0].hasKT ? 'text-red-500' : 'text-green-600'}`}>{records[0].result}</div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-semibold mb-2 text-muted-foreground">Subject Marks:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {Object.entries(records[0].subjects).map(([subject, marks]) => {
                               const marksStr = marks.toString().trim();
                               const isDirectFail = marksStr === "F" || marksStr.includes(" F") || marksStr.includes("KT");
                               let isRelatedFail = false;
                               if (subject.endsWith("_Marks")) {
                                 const gradeKey = subject.replace("_Marks", "_GR");
                                 if (records[0].subjects[gradeKey]?.toString().trim() === "F") isRelatedFail = true;
                               }
                               const shouldHighlight = isDirectFail || isRelatedFail;
                               return (
                                <div 
                                  key={subject} 
                                  className={`flex justify-between items-center text-sm p-2 rounded border transition-colors ${shouldHighlight ? 'bg-red-50 border-red-200 text-red-700 font-bold' : subject.includes("_GR") ? 'bg-slate-50 text-slate-500 font-mono' : 'bg-background'}`}
                                >
                                  <span className="truncate pr-2 font-medium">{subject}</span>
                                  <span className="font-mono">{marks}</span>
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

        {/* --- SECTION 3: YEAR CARDS --- */}
        <Separator className="my-12" />
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold mb-3">Academic Year Tools</h2>
          <p className="text-muted-foreground">Access specific PDF converters and analysis tools</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {years.map((item) => (
            <Link key={item.year} to={item.available ? `/year${item.year}` : "#"} className={!item.available ? 'pointer-events-none' : ''}>
              <Card className={`h-full hover:shadow-xl transition-all duration-300 ${item.available ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-60'} border-2 hover:border-primary/50`}>
                <CardHeader>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant={item.available ? "default" : "secondary"} className="w-full" disabled={!item.available}>
                    {item.available ? 'Access Tools' : 'Coming Soon'}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home;