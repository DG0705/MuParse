import { Dummy as Sem7Dummy } from "@/components/Sem7";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Sem7Converter = () => {
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
            <h1 className="text-2xl font-bold">Semester 7 - PDF to CSV Converter</h1>
            <p className="text-sm text-muted-foreground">Convert result PDFs to structured CSV format</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Sem7Dummy />
      </main>
    </div>
  );
};

export default Sem7Converter;
