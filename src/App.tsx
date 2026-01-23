import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { StudentDashboard } from "./components/StudentDashboard";
import Landing from "./components/Landing";
import Home from "./components/Home";
import Year1 from "./components/Year1";
import Year2 from "./components/Year2";
import Year3 from "./components/Year3";
import Year4 from "./components/Year4";
import Dummy from "./components/Dummy";
import Sem7, { Sem7Converter1 } from "./components/Sem7Converter1";

import Dummy1 from "./components/Dummy1";
import ResultUploaderAndViewer from "./components/sem-1Analysis";
import ResultUploaderAndViewer2 from "./components/ResultUploaderAndViewer2";
import ResultUploaderAndViewer3 from "./components/ResultUploaderAndViewer3";
import PdfResultConverter from "./components/PdfResultConverter";
import ResultUploaderAndViewer4 from "./components/sem-8Analysis";
import Sem1Converter from "./components/Sem1Converter";
import Sem2Converter from "./components/Sem2Converter";
import Sem7Converter from "./components/Sem7Converter";
import Sem8Converter from "./components/Sem8Converter";
import SimplePdfConverter, { Sem3Converter } from "./components/Sem3Converter";
import SimplePdfConverter4, { Sem4Converter } from "./components/Sem4Converter";
import SimplePdfConverter5, { Sem5Converter } from "./components/Sem5Converter";
import SimplePdfConverter6, { Sem6Converter } from "./components/Sem6Converter";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/year1" element={<Year1 />} />
          <Route path="/year2" element={<Year2 />} />
          <Route path="/year3" element={<Year3 />} />
          <Route path="/year4" element={<Year4 />} />
          <Route path="/sem1-converter" element={<Sem1Converter />} />
          <Route path="/sem2-converter" element={<Sem2Converter />} />
          <Route path="/sem7-converter" element={<Sem7Converter />} />
          <Route path="/sem8-converter" element={<Sem8Converter />} />
          <Route path="/sem3-converter" element={<Sem3Converter title="Semester 3 - PDF to CSV Converter" description="Convert result PDFs to structured CSV format"/>} />
          <Route path="/sem4-converter" element={<Sem4Converter title="Semester 4 - PDF to CSV Converter" description="Convert result PDFs to structured CSV format"/>} />
          <Route path="/sem5-converter" element={<Sem5Converter title="Semester 5 - PDF to CSV Converter" description="Convert result PDFs to structured CSV format"/>} />
          <Route path="/sem6-converter" element={<Sem6Converter title="Semester 6 - PDF to CSV Converter" description="Convert result PDFs to structured CSV format"/>} />



          <Route path="/sem7-converter" element={<Sem7Converter1 />} />
          <Route path="/sem8-converter" element={<PdfResultConverter/>} />







          <Route path="/sem1-analysis" element={<ResultUploaderAndViewer />} />
          <Route path="/sem2-analysis" element={<ResultUploaderAndViewer2 />} />
          <Route path="/sem7-analysis" element={<ResultUploaderAndViewer3 />} />
          <Route path="/sem8-analysis" element={<ResultUploaderAndViewer4 />} />




          <Route path="/1" element={<Index />} />
          <Route path="/Student" element={<StudentDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
