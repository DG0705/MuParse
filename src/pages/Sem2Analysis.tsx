import ResultUploaderAndViewer2 from "@/components/ResultUploaderAndViewer2";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Sem2Analysis = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/year1">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Year 1
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Semester 2 - Result Analysis</h1>
            <p className="text-sm text-muted-foreground">Upload CSV and generate comprehensive reports</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <ResultUploaderAndViewer2 />
      </main>
    </div>
  );
};

export default Sem2Analysis;
