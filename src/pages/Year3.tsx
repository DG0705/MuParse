import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import { Link } from "react-router-dom";

const Year3 = () => {
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
            <h1 className="text-2xl font-bold">Third Year - BE Engineering</h1>
            <p className="text-sm text-muted-foreground">Semester 5 & 6 Tools</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center animate-fade-in">
          <div className="inline-block p-6 bg-muted rounded-full mb-6">
            <Construction className="w-16 h-16 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Tools for Third Year (Semester 5 & 6) are currently under development. 
            We're working hard to bring you comprehensive PDF conversion and result analysis features.
          </p>
          <Link to="/home">
            <Button size="lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Year3;
