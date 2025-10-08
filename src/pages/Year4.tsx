import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const Year4 = () => {
  const tools = [
    {
      title: "Semester 7 - PDF Converter",
      description: "Convert Semester 7 result PDFs to structured CSV format",
      icon: FileText,
      path: "/sem7-converter",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Semester 8 - PDF Converter",
      description: "Convert Semester 8 result PDFs to structured CSV format",
      icon: FileText,
      path: "/sem8-converter",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Semester 7 - Result Analysis",
      description: "Upload CSV and generate comprehensive result analysis",
      icon: BarChart3,
      path: "/sem7-analysis",
      color: "from-orange-500 to-amber-500"
    },
    {
      title: "Semester 8 - Result Analysis",
      description: "Upload CSV and generate comprehensive result analysis (Coming Soon)",
      icon: BarChart3,
      path: "#",
      color: "from-amber-500 to-yellow-500",
      disabled: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/home">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Fourth Year - BE Engineering</h1>
            <p className="text-sm text-muted-foreground">Semester 7 & 8 Tools</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool, index) => (
            tool.disabled ? (
              <Card key={tool.title} className="h-full opacity-60 border-2 animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <tool.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{tool.title}</CardTitle>
                  <CardDescription className="mt-2">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Link key={tool.path} to={tool.path} className="animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 hover:border-primary/50">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <tool.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                    <CardDescription className="mt-2">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      Open Tool →
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          ))}
        </div>
      </main>
    </div>
  );
};

export default Year4;
