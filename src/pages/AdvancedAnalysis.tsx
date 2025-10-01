import ResultUploaderAndViewer4 from "@/components/ResultUploaderAndViewer4";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const AdvancedAnalysis = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Advanced Result Analysis</h1>
            <p className="text-sm text-muted-foreground">Comprehensive analysis with detailed statistics</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <ResultUploaderAndViewer4 />
      </main>
    </div>
  );
};

export default AdvancedAnalysis;
