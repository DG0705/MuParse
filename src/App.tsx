import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Year1 from "./pages/Year1";
import Year2 from "./pages/Year2";
import Year3 from "./pages/Year3";
import Year4 from "./pages/Year4";
import Sem1Converter from "./pages/Sem1Converter";
import Sem2Converter from "./pages/Sem2Converter";
import Sem7Converter from "./pages/Sem7Converter";
import Sem1Analysis from "./pages/Sem1Analysis";
import Sem2Analysis from "./pages/Sem2Analysis";
import Sem3Analysis from "./pages/Sem3Analysis";
import MultiSemester from "./pages/MultiSemester";
import AdvancedAnalysis from "./pages/AdvancedAnalysis";
import NotFound from "./pages/NotFound";

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
          <Route path="/sem1-analysis" element={<Sem1Analysis />} />
          <Route path="/sem2-analysis" element={<Sem2Analysis />} />
          <Route path="/sem7-analysis" element={<Sem3Analysis />} />
          <Route path="/multi-semester" element={<MultiSemester />} />
          <Route path="/advanced-analysis" element={<AdvancedAnalysis />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
