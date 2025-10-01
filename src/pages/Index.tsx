import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, BarChart3, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const tools = [
    {
      title: "Semester 1 - PDF Converter",
      description: "Convert Semester 1 result PDFs to CSV format",
      icon: FileText,
      path: "/sem1-converter",
      color: "text-blue-600"
    },
    {
      title: "Semester 2 - PDF Converter",
      description: "Convert Semester 2 result PDFs to CSV format",
      icon: FileText,
      path: "/sem2-converter",
      color: "text-green-600"
    },
    {
      title: "Semester 7 - PDF Converter",
      description: "Convert Semester 7 result PDFs to CSV format",
      icon: FileText,
      path: "/sem7-converter",
      color: "text-purple-600"
    },
    {
      title: "Semester 1 - Result Analysis",
      description: "Upload CSV and generate detailed result analysis",
      icon: BarChart3,
      path: "/sem1-analysis",
      color: "text-orange-600"
    },
    {
      title: "Semester 2 - Result Analysis",
      description: "Upload CSV and generate detailed result analysis",
      icon: BarChart3,
      path: "/sem2-analysis",
      color: "text-red-600"
    },
    {
      title: "Semester 7 - Result Analysis",
      description: "Upload CSV and generate detailed result analysis",
      icon: BarChart3,
      path: "/sem7-analysis",
      color: "text-indigo-600"
    },
    {
      title: "Multi-Semester Converter",
      description: "Convert multi-semester result PDFs to CSV",
      icon: FileSpreadsheet,
      path: "/multi-semester",
      color: "text-teal-600"
    },
    {
      title: "Advanced Result Analysis",
      description: "Advanced analysis with detailed statistics",
      icon: Upload,
      path: "/advanced-analysis",
      color: "text-pink-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-primary">University Result Management System</h1>
          <p className="text-muted-foreground mt-2">
            Convert PDF results to CSV and generate comprehensive analysis reports
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link key={tool.path} to={tool.path}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <tool.icon className={`w-8 h-8 ${tool.color}`} />
                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Open Tool
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-3">How to Use</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>PDF Converters:</strong> Upload result PDFs to extract data and download as CSV files.</p>
            <p><strong>Result Analysis:</strong> Upload CSV files to generate comprehensive analysis reports with statistics, charts, and downloadable PDFs.</p>
            <p><strong>Multi-Semester:</strong> Process results spanning multiple semesters in one go.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
