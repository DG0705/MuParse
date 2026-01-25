import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PdfResultConverter from "./PdfResultConverter";

const Sem1Converter = () => {








  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/year4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Year 4
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Semester 8 - PDF to CSV Converter
            </h1>
            <p className="text-sm text-muted-foreground">
              Convert result PDFs to structured CSV format
            </p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <PdfResultConverter />
      </main>
    </div>
  );
};

export default Sem1Converter;
