import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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
          <Route path="/" element={<Index />} />
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
