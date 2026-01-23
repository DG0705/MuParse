import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  const years = [
    {
      year: 1,
      title: "First Year",
      description: "Semester 1 & 2 - PDF Conversion and Result Analysis",
      available: true,
      icon: BookOpen,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      year: 2,
      title: "Second Year",
      description: "Semester 3 & 4 - PDF Conversion and Result Analysis",
      available: true,
      icon: Users,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      year: 3,
      title: "Third Year",
      description: "Semester 5 & 6 - PDF Conversion and Result Analysis",
      available: true,
      icon: TrendingUp,
      gradient: "from-orange-500 to-red-500"
    },
    {
      year: 4,
      title: "Fourth Year",
      description: "Semester 7 & 8 - PDF Conversion and Result Analysis",
      available: true,
      icon: GraduationCap,
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Academic Insights Portal</h1>
              <p className="text-muted-foreground mt-1">
                Select your year to access analysis tools
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Choose Your Academic Year</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Access specialized tools for result conversion and comprehensive analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-scale-in">
          {years.map((item, index) => (
            <Link
              key={item.year}
              to={item.available ? `/year${item.year}` : "#"}
              className={`${!item.available && 'pointer-events-none'}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card className={`h-full hover:shadow-xl transition-all duration-300 ${
                item.available 
                  ? 'hover:-translate-y-2 cursor-pointer' 
                  : 'opacity-60'
              } border-2 hover:border-primary/50`}>
                <CardHeader>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                  <CardDescription className="text-base mt-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant={item.available ? "default" : "secondary"} 
                    className="w-full"
                    disabled={!item.available}
                  >
                    {item.available ? 'Access Tools' : 'Coming Soon'}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-16 p-8 bg-muted/50 rounded-xl backdrop-blur-sm animate-fade-in">
          <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Available Features
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-base">PDF Converters</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Extract result data from PDF documents</li>
                <li>• Convert to structured CSV format</li>
                <li>• Batch processing support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-base">Result Analysis</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Comprehensive statistical analysis</li>
                <li>• Visual charts and graphs</li>
                <li>• Downloadable PDF reports</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
