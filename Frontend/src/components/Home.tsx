import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  GraduationCap, BookOpen, Users, TrendingUp, Search, AlertTriangle, Users2, ChevronRight,
  FileJson, BarChart3, GitMerge, FileText, Database, RefreshCcw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";

// --- Interfaces ---
interface StudentData {
  type?: "single";
  // Added 'batch' to receive the scheme type from the backend
  profile: { name: string; prn: string; category: string; batch?: string; };
  summary: { totalSemestersAppeared: number; ktCount: number; };
  academicHistory: Record<string, SemesterRecord[]>;
}

interface MultipleMatches {
  type: "multiple";
  count: number;
  students: { name: string; prn: string; category: string; batch?: string; }[];
}

interface SemesterRecord {
  seatNo: string;
  sgpi: string;
  totalMarks: string;
  result: string;
  hasKT: boolean;
  subjects: Record<string, string>; 
}

interface KTDetail { semester: string; subject: string; value: string; }

const Home = () => {
  // --- Data Arrays ---
  const years = [
    { year: 1, title: "First Year", description: "Semester 1 & 2 Management", available: true, icon: BookOpen, gradient: "from-blue-500 to-cyan-500" },
    { year: 2, title: "Second Year", description: "Semester 3 & 4 Management", available: true, icon: Users, gradient: "from-purple-500 to-pink-500" },
    { year: 3, title: "Third Year", description: "Semester 5 & 6 Management", available: true, icon: TrendingUp, gradient: "from-orange-500 to-red-500" },
    { year: 4, title: "Fourth Year", description: "Semester 7 & 8 Management", available: true, icon: GraduationCap, gradient: "from-green-500 to-emerald-500" }
  ];

  const semesterTools = Array.from({ length: 8 }, (_, i) => ({
    num: i + 1,
    converter: `/sem${i + 1}-converter`,
    analysis: [1, 2, 7, 8].includes(i + 1) ? `/sem${i + 1}-analysis` : null
  }));

  // --- Original Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [batchQuery, setBatchQuery] = useState("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [multipleMatches, setMultipleMatches] = useState<MultipleMatches | null>(null);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [error, setError] = useState("");

  // --- NEP Upload States ---
  const [nepFile, setNepFile] = useState<File | null>(null);
  const [nepSemester, setNepSemester] = useState("");
  const [isNepProcessing, setIsNepProcessing] = useState(false);

  // --- Functions ---
  const getAllKts = (data: StudentData | null): KTDetail[] => {
    if (!data || !data.academicHistory) return [];
    const kts: KTDetail[] = [];
    Object.entries(data.academicHistory).forEach(([sem, records]) => {
      const record = records?.[0]; 
      if (record && record.subjects) {
        Object.entries(record.subjects).forEach(([key, val]) => {
          const k = key.toLowerCase().trim();
          const valStr = String(val).trim().toUpperCase();
          if (k.includes('tot') || k.includes('result') || k.includes('status')) return;
          if (valStr === "F" || valStr.includes("KT")) {
            let displayValue = valStr;
            let displaySubject = key;
            if (key.endsWith("_GR")) {
               const marksKey = key.replace("_GR", "_Marks");
               if (record.subjects[marksKey]) {
                 displayValue = String(record.subjects[marksKey]);
                 displaySubject = marksKey;
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

  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || searchQuery;
    if (!query) return;

    setLoading(true);
    setError("");
    setStudentData(null);
    if (!queryOverride) setMultipleMatches(null);

    try {
      const response = await fetch(`http://localhost:5000/api/students/history/${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error("Student not found");
      const backendData = await response.json();
      
      if (backendData.type === "multiple") {
        setMultipleMatches(backendData as MultipleMatches);
        setShowSelectionDialog(true);
      } else {
        setStudentData(backendData as StudentData);
        setShowSelectionDialog(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSearch = async () => {
    if (!batchQuery) return;
    setStudentData(null);
    setSearchQuery("");
    setBatchLoading(true);
    setBatchResults(null);
    setError("");

    try {
      const response = await fetch(`http://localhost:5000/api/students/batch/${batchQuery}`);
      if (!response.ok) throw new Error("No students found for this batch");
      const result = await response.json();
      setBatchResults(Array.isArray(result) ? { count: result.length, batch: batchQuery, students: result } : result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleMerge = async (sourcePrn: string, targetPrn: string) => {
    if (!window.confirm(`Merge all data from ${sourcePrn} into ${targetPrn}? This will delete the temporary profile.`)) return;
    try {
      const response = await fetch('http://localhost:5000/api/students/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePrn, targetPrn })
      });
      if (!response.ok) throw new Error("Merge failed");
      toast.success("Profiles merged successfully!");
      setShowSelectionDialog(false);
      handleSearch(targetPrn);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleNepUpload = async () => {
    if (!nepFile || !nepSemester) {
      toast.error("Please select a file and enter the semester number.");
      return;
    }
    setIsNepProcessing(true);
    const formData = new FormData();
    formData.append("file", nepFile);
    formData.append("semester", nepSemester);

    try {
      const response = await axios.post("http://localhost:5000/api/students/upload-nep-pdf", formData);
      toast.success(response.data.message || "NEP data processed successfully!");
      setNepFile(null);
      setNepSemester("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error uploading NEP PDF");
    } finally {
      setIsNepProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">MuParse Dashboard</h1>
              <p className="text-sm text-slate-500">Centralized Engineering Result Analysis</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="r19" className="w-full">
          
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 h-auto p-1 bg-slate-200/50 rounded-xl mb-8">
            <TabsTrigger value="r19" className="py-3 text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">R-19 Management</TabsTrigger>
            <TabsTrigger value="nep" className="py-3 text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">NEP 2024</TabsTrigger>
            <TabsTrigger value="search" className="py-3 text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Search & History</TabsTrigger>
            <TabsTrigger value="analysis" className="py-3 text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Analytics</TabsTrigger>
          </TabsList>

          {/* ==================== 1. R-19 TAB ==================== */}
          <TabsContent value="r19" className="space-y-8 animate-in fade-in-50">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">R-19 Engineering Scheme</h2>
              <p className="text-slate-500">Manage uploads and conversions for old scheme students.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {years.map((item) => (
                <Link key={item.year} to={item.available ? `/year${item.year}` : "#"} className={!item.available ? 'pointer-events-none' : ''}>
                  <Card className={`h-full hover:shadow-xl transition-all duration-300 ${item.available ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-60'} border-2 hover:border-blue-500/50`}>
                    <CardHeader>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-md`}><item.icon className="w-7 h-7 text-white" /></div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent><Button variant={item.available ? "default" : "secondary"} className="w-full" disabled={!item.available}>{item.available ? 'Open Year' : 'Coming Soon'}</Button></CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <Separator />
            
            
          </TabsContent>

          {/* ==================== 2. NEP TAB ==================== */}
          <TabsContent value="nep" className="animate-in fade-in-50 flex justify-center py-10">
            <Card className="w-full max-w-xl shadow-lg border-2 border-purple-100">
              <CardHeader className="text-center bg-purple-50/50 rounded-t-xl pb-6">
                <div className="w-16 h-16 mx-auto bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Database className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl font-bold text-purple-900">NEP Result Processor</CardTitle>
                <CardDescription>Upload NEP 2024 results to extract and store structured data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Semester Number</label>
                  <Input type="number" placeholder="e.g. 1" value={nepSemester} onChange={(e) => setNepSemester(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Upload NEP PDF</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-200 rounded-lg cursor-pointer bg-purple-50/30 hover:bg-purple-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileText className="w-8 h-8 mb-2 text-purple-400" />
                        <p className="text-sm text-purple-600 font-medium">{nepFile ? nepFile.name : "Click to select PDF"}</p>
                      </div>
                      <input type="file" className="hidden" accept="application/pdf" onChange={(e) => setNepFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>
                <Button className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-lg" onClick={handleNepUpload} disabled={isNepProcessing}>
                  {isNepProcessing ? <><RefreshCcw className="animate-spin mr-2" /> Processing Logic...</> : "Start Extraction"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== 3. SEARCH & HISTORY TAB ==================== */}
          <TabsContent value="search" className="animate-in fade-in-50">
            <div className="mb-8 max-w-4xl mx-auto">
              <Card className="w-full border-dashed border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2"><Users2 className="w-5 h-5 text-primary" /> Batch Search</CardTitle>
                    <CardDescription>View all students in a batch (e.g., 2021)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <Input placeholder="Enter Batch Year" value={batchQuery} onChange={(e) => setBatchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleBatchSearch()} />
                      <Button variant="outline" onClick={handleBatchSearch} disabled={batchLoading}>{batchLoading ? "..." : "View Batch"}</Button>
                    </div>
                    {batchResults && batchResults.students && (
                      <div className="mt-6 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-sm font-semibold text-muted-foreground">Found {batchResults.count} Students</span>
                        </div>
                        {batchResults.students.map((student: any, idx: number) => (
                          <div key={student.prn || idx} className="flex items-center justify-between p-3 rounded-md border bg-muted/30 hover:bg-muted/50 cursor-pointer border-primary/10" onClick={() => handleSearch(student.prn)}>
                            <div><p className="font-bold text-sm">{student.name}</p><p className="text-xs text-muted-foreground font-mono">{student.prn}</p></div>
                            <Badge variant="outline">View History</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
              </Card>
            </div>

            <div className="mb-16 max-w-4xl mx-auto">
              <Card className="w-full shadow-md border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <Input placeholder="Search Student Name or PRN/Seat No..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="text-lg h-12" />
                      <Button onClick={() => handleSearch()} disabled={loading} size="lg" className="h-12 px-8">{loading ? "..." : <><Search className="w-5 h-5 mr-2" /> Search</>}</Button>
                    </div>
                  </CardContent>
              </Card>

              {error && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

              {/* MULTIPLE MATCHES DIALOG (WITH SCHEME BADGE ADDED) */}
              <Dialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Multiple Matches Found</DialogTitle>
                    <DialogDescription>Select a student to view or merge temporary data into a real PRN.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 mt-4">
                    {multipleMatches?.students?.map((student, idx) => {
                      const isTemp = student.prn.startsWith("TEMP_");
                      const realTarget = multipleMatches.students.find(s => !s.prn.startsWith("TEMP_"));
                      
                      return (
                        <div key={student.prn || idx} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all cursor-pointer" onClick={() => { setShowSelectionDialog(false); handleSearch(student.prn); }}>
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{idx + 1}</div>
                            <div>
                              <h4 className="font-bold">{student.name}</h4>
                              <p className="text-sm text-muted-foreground font-mono mb-1">ID/Seat: {student.prn}</p>
                              {/* --- ADDED SMALL SCHEME BADGE --- */}
                              <Badge variant={student.batch?.includes("NEP") ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                                {student.batch || "R-19 Scheme"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isTemp && realTarget && (
                              <Button variant="outline" size="sm" className="text-orange-600 border-orange-200" onClick={(e) => { e.stopPropagation(); handleMerge(student.prn, realTarget.prn); }}>
                                <GitMerge className="w-4 h-4 mr-1" /> Merge
                              </Button>
                            )}
                            <Button size="sm">View</Button>
                          </div>
                        </div>
                    )})}
                  </div>
                </DialogContent>
              </Dialog>

              {/* STUDENT PROFILE & HISTORY */}
              {studentData && (
                <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* MAIN PROFILE CARD (WITH SCHEME BADGE ADDED) */}
                      <Card>
                        <CardHeader className="pb-2 bg-muted/20"><CardTitle className="text-lg">Student Profile</CardTitle></CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Name</span><span className="font-semibold">{studentData.profile?.name}</span></div>
                          <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">ID / Seat No</span><span className="font-mono">{studentData.profile?.prn}</span></div>
                          
                          {/* --- ADDED SCHEME ROW --- */}
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Scheme</span>
                            <Badge variant={studentData.profile?.batch?.includes("NEP") ? "default" : "secondary"}>
                              {studentData.profile?.batch || "R-19 Scheme"}
                            </Badge>
                          </div>

                          <div className="flex justify-between pt-1"><span className="text-muted-foreground">Status</span><Badge variant="outline">{studentData.profile?.category}</Badge></div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2 bg-muted/20"><CardTitle className="text-lg">Academic Summary</CardTitle></CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Semesters Appeared</span><span className="font-bold text-2xl">{studentData.summary?.totalSemestersAppeared}</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Total KTs</span>
                            {currentKts.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild><Badge variant="destructive" className="cursor-pointer">{currentKts.length} Active KT(s)</Badge></DialogTrigger>
                                <DialogContent>
                                  <DialogHeader><DialogTitle>KT Breakdown</DialogTitle></DialogHeader>
                                  <div className="space-y-2">
                                    {currentKts.map((kt, i) => (
                                      <div key={i} className="flex justify-between p-2 border rounded">
                                        <span>{kt.subject} ({kt.semester})</span><Badge variant="secondary">{kt.value}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (<Badge className="bg-green-600">All Clear</Badge>)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />
                    <h3 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Semester Breakdown</h3>
                    <div className="grid gap-6">
                      {Object.entries(studentData.academicHistory || {}).map(([semName, records]) => {
                        const record = records?.[0];
                        if (!record) return null;
                        const filteredSubjects = Object.entries(record.subjects).filter(([k]) => !k.toLowerCase().includes('tot') && !k.toLowerCase().includes('result'));

                        return (
                        <Card key={semName} className={`overflow-hidden border-l-4 ${record.result === "Dropper" ? 'border-l-red-500' : record.result === "KT" ? 'border-l-orange-500' : 'border-l-green-500'}`}>
                          <CardHeader className="bg-muted/30 py-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">{semName}</CardTitle>
                              <div className="flex gap-2 items-center">
                                <Badge variant="outline">Seat: {record.seatNo}</Badge>
                                <Badge variant={record.result === "Dropper" ? "destructive" : record.result === "KT" ? "default" : "secondary"}>{record.result}</Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="flex flex-wrap gap-4 mb-4">
                              <div className="p-2 bg-secondary/10 rounded border flex-1 text-center"><div className="text-xs text-muted-foreground">SGPI</div><div className="font-bold text-lg">{record.sgpi}</div></div>
                              <div className="p-2 bg-secondary/10 rounded border flex-1 text-center"><div className="text-xs text-muted-foreground">Status</div><div className="font-bold text-lg">{record.result}</div></div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {filteredSubjects.map(([subject, marks]) => (
                                <div key={subject} className={`flex justify-between p-2 rounded border text-sm ${String(marks).trim() === "F" ? "bg-red-50 text-red-700 border-red-200 font-bold" : "bg-background"}`}>
                                  <span className="truncate pr-2" title={subject}>{subject}</span><span>{marks}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )})}
                    </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ==================== 4. ANALYSIS TAB ==================== */}
          <TabsContent value="analysis" className="animate-in fade-in-50">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Performance Analytics</h2>
              <p className="text-slate-500">View subject-wise statistics and passing percentages.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {semesterTools.filter(t => t.analysis).map((tool) => (
                <Card key={tool.num} className="border-2 hover:border-blue-500/50 transition-all bg-white">
                  <CardHeader className="text-center bg-blue-50/30">
                    <BarChart3 className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                    <CardTitle className="text-xl">Semester {tool.num}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <Link to={tool.analysis!}>
                      <Button className="w-full flex justify-center gap-2" variant="default">
                        View Analytics <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Home;