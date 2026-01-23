import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";

const Year2 = () => {
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
            <h1 className="text-2xl font-bold">Second Year - BE Engineering</h1>
            <p className="text-sm text-muted-foreground">Semester 3 & 4 Tools</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Semester 3 Converter</CardTitle>
              <CardDescription>
                Convert Semester 3 PDF results to Excel format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/sem3-converter">
                <Button className="w-full">Open Converter</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Semester 4 Converter</CardTitle>
              <CardDescription>
                Convert Semester 4 PDF results to Excel format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/sem4-converter">
                <Button className="w-full">Open Converter</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Year2;