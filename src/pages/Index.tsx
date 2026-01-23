import Dummy from "@/components/Dummy";
import Dummy1 from "@/components/Dummy1";
import PdfResultConverter from "@/components/PdfResultConverter";
import Sem7 from "@/components/Sem7Converter1";
import ResultUploaderAndViewer from "@/components/sem-1Analysis";
import ResultUploaderAndViewer2 from "@/components/ResultUploaderAndViewer2";
import ResultUploaderAndViewer3 from "@/components/ResultUploaderAndViewer3";
import ResultUploaderAndViewer4 from "@/components/sem-8Analysis";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b">
        <div className="container py-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            TXT to CSV Converter for Student Marks (11 Papers)
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Upload TXT files from university results and export clean CSV with
            CR, GR, GP, and C*G for all 11 papers per student.
          </p>
        </div>
      </header>
      <main className="container py-10 space-y-10">
        <div className="w-full space-y-6">
          <Dummy></Dummy>
          <Dummy1></Dummy1>
          <Sem7></Sem7>
          <PdfResultConverter></PdfResultConverter>
          <ResultUploaderAndViewer></ResultUploaderAndViewer>
          <ResultUploaderAndViewer2></ResultUploaderAndViewer2>
          <ResultUploaderAndViewer3></ResultUploaderAndViewer3>
          <ResultUploaderAndViewer4></ResultUploaderAndViewer4>
        </div>
      </main>
    </div>
  );
};

export default Index;
