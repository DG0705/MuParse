import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const Landing = () => {
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showContent) {
      const autoNavigate = setTimeout(() => {
        navigate("/home");
      }, 3000);
      return () => clearTimeout(autoNavigate);
    }
  }, [showContent, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary/80 flex items-center justify-center overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden bg-blue-500">
        <div className="absolute top-20 left-20 w-72 h-72  rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className={`transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-8 inline-block">
            <GraduationCap className="w-24 h-24 text-primary-foreground animate-scale-in" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in leading-tight">
            Data-Driven Academic Insights:
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-foreground to-primary-foreground/70">
              A Result Analysis Tool
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 animate-slide-in font-light">
            Transform academic results into actionable insights
          </p>

          <div className="mt-12 flex justify-center">
            <div className="w-16 h-1 bg-primary-foreground/50 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
