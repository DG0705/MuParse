// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
// import { Users, AlertCircle, TrendingDown } from 'lucide-react';

// export const AnalyticsDashboard = () => {
//     const [data, setData] = useState<any>(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const fetchAnalytics = async () => {
//             try {
//                 // Adjust port if your Node backend is on 8080
//                 // To this:
// const response = await axios.get('http://localhost:5000/api/students/analytics/batch');
//                 if (response.data.success) {
//                     setData(response.data.data);
//                 }
//             } catch (error) {
//                 console.error("Failed to load analytics", error);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchAnalytics();
//     }, []);

//     if (loading) return <div className="p-8 text-center text-lg font-bold text-slate-500 animate-pulse">Aggregating Batch Data...</div>;
//     if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics.</div>;

//     return (
//         <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
//             <div className="flex items-center justify-between mb-8">
//                 <div>
//                     <h1 className="text-3xl font-bold text-slate-800">Batch Analytics Dashboard</h1>
//                     <p className="text-slate-500">High-level AI overview of student performance</p>
//                 </div>
//                 <Card className="bg-blue-50 border-blue-200">
//                     <CardContent className="p-4 flex items-center gap-4">
//                         <Users className="h-8 w-8 text-blue-600" />
//                         <div>
//                             <p className="text-sm font-semibold text-blue-600 uppercase">Total Students</p>
//                             <p className="text-3xl font-bold text-blue-900">{data.totalStudents}</p>
//                         </div>
//                     </CardContent>
//                 </Card>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 {/* PERSONA DISTRIBUTION CHART */}
//                 <Card className="shadow-md">
//                     <CardHeader>
//                         <CardTitle className="flex items-center gap-2">
//                             <Users className="h-5 w-5 text-slate-500" />
//                             AI Persona Distribution
//                         </CardTitle>
//                     </CardHeader>
//                     <CardContent className="h-[300px]">
//                         <ResponsiveContainer width="100%" height="100%">
//                             <PieChart>
//                                 <Pie 
//                                     data={data.personaDistribution} 
//                                     innerRadius={80} 
//                                     outerRadius={110} 
//                                     paddingAngle={5}
//                                     dataKey="value"
//                                 >
//                                     {data.personaDistribution.map((entry: any, index: number) => (
//                                         <Cell key={`cell-${index}`} fill={entry.fill} />
//                                     ))}
//                                 </Pie>
//                                 <Tooltip />
//                             </PieChart>
//                         </ResponsiveContainer>
//                         <div className="flex justify-center gap-4 text-sm mt-4">
//                             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Consistent</span>
//                             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Mid-Tier</span>
//                             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> At Risk</span>
//                         </div>
//                     </CardContent>
//                 </Card>

//                {/* SUBJECT BOTTLENECKS CHART */}
//                 <Card className="shadow-md">
//                     <CardHeader>
//                         <CardTitle className="flex items-center gap-2">
//                             <TrendingDown className="h-5 w-5 text-slate-500" />
//                             Top Subject Bottlenecks (KTs)
//                         </CardTitle>
//                     </CardHeader>
                    
//                     {/* ADDED: overflow-y-auto to create a scrollbar! */}
//                     <CardContent className="h-[350px] overflow-y-auto pr-2">
                        
//                         {/* ADDED: Dynamic height based on how many subjects there are */}
//                         <div style={{ height: Math.max(300, data.bottlenecks.length * 45) }}>
//                             <ResponsiveContainer width="100%" height="100%">
//                                 <BarChart data={data.bottlenecks} layout="vertical" margin={{ left: 0, right: 20 }}>
//                                     <XAxis type="number" />
//                                     {/* Interval={0} forces it to show EVERY subject name without skipping */}
//                                     <YAxis dataKey="subject" type="category" width={160} tick={{fontSize: 11}} interval={0} />
//                                     <Tooltip cursor={{fill: '#f1f5f9'}} />
//                                     {/* Set barSize so the bars don't get too thick */}
//                                     <Bar dataKey="KTs" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
//                                 </BarChart>
//                             </ResponsiveContainer>
//                         </div>

//                     </CardContent>
//                 </Card>
//             </div>
//         </div>
//     );
// };







import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingDown, Download, Filter } from 'lucide-react'; 

export const AnalyticsDashboard = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // NEW: State to track which semester is selected
    const [selectedSemester, setSelectedSemester] = useState<string>('All');

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                // NEW: Send the selected semester to the backend!
                const response = await axios.get('http://localhost:5000/api/students/analytics/batch', {
                    params: { semester: selectedSemester }
                });
                
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [selectedSemester]); // Re-run this whenever the dropdown changes!

    const handleExportCSV = () => {
        if (!data || !data.atRiskExport || data.atRiskExport.length === 0) {
            alert("Great news: There are no at-risk students to export!");
            return;
        }

        let csvContent = "PRN,Latest SGPI,AI Risk Status\n";
        data.atRiskExport.forEach((student: any) => {
            csvContent += `${student.prn},${student.sgpi},${student.status}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        // Appends the semester to the file name!
        link.setAttribute("download", `Critical_Intervention_Sem_${selectedSemester}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && !data) return <div className="p-8 text-center text-lg font-bold text-slate-500 animate-pulse">Aggregating Batch Data...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics.</div>;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Batch Analytics Dashboard</h1>
                    <p className="text-slate-500">High-level AI overview of student performance</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    
                    {/* NEW: THE SEMESTER DROPDOWN FILTER */}
                    <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select 
                            value={selectedSemester} 
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
                        >
                            <option value="All">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                <option key={num} value={num}>Semester {num}</option>
                            ))}
                        </select>
                    </div>

                    <Button onClick={handleExportCSV} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 shadow-sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export At-Risk
                    </Button>

                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-3 flex items-center gap-4">
                            <Users className="h-6 w-6 text-blue-600" />
                            <div>
                                <p className="text-xs font-semibold text-blue-600 uppercase">Total Students</p>
                                <p className="text-xl font-bold text-blue-900">{data.totalStudents}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-slate-500" />
                            AI Persona Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.personaDistribution} innerRadius={90} outerRadius={120} paddingAngle={5} dataKey="value">
                                    {data.personaDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-sm mt-4">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Consistent</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Mid-Tier</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> At Risk</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-slate-500" />
                            Top Subject Bottlenecks (KTs)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px] overflow-y-auto pr-2">
                        <div style={{ height: Math.max(300, data.bottlenecks.length * 45) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.bottlenecks} layout="vertical" margin={{ left: 0, right: 20 }}>
                                    <XAxis type="number" />
                                    <YAxis dataKey="subject" type="category" width={160} tick={{fontSize: 11}} interval={0} />
                                    <Tooltip cursor={{fill: '#f1f5f9'}} />
                                    <Bar dataKey="KTs" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};





