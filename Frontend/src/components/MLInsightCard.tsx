// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress";
// import { Badge } from "@/components/ui/badge";
// import { AlertTriangle, CheckCircle } from 'lucide-react';

// interface MLInsightCardProps {
//   prn: string;
// }

// interface MLData {
//   student_id: string;
//   kt_risk_flag: boolean;
//   kt_probability_score: number;
//   message: string;
// }

// export const MLInsightCard: React.FC<MLInsightCardProps> = ({ prn }) => {
//   const [insight, setInsight] = useState<MLData | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchInsights = async () => {
//       if (!prn) {
//         setError("No PRN provided to the component.");
//         setLoading(false);
//         return;
//       }
      

//       try {
//         setLoading(true);
//         // Ensure this port matches your Node.js backend port exactly
//         const response = await axios.get(`http://localhost:5000/api/students/${prn}/ml-insights`);
//         if (response.data.success) {
//           setInsight(response.data.data);
//         } else {
//           setError("Backend returned false success flag.");
//         }
//       } catch (err: any) {
//         console.error("Failed to fetch ML insights", err);
//         setError(err.message || "Failed to connect to Node.js backend.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInsights();
//   }, [prn]);

//   // 1. FORCE VISIBLE: Loading State
//   if (loading) {
//     return (
//       <Card className="w-full h-32 bg-blue-50 border-blue-500 border-2 flex items-center justify-center">
//         <p className="text-blue-700 font-bold">LOADING AI DATA FOR PRN: {prn}...</p>
//       </Card>
//     );
//   }

//   // 2. FORCE VISIBLE: Error State
//   if (error) {
//     return (
//       <Card className="w-full p-4 bg-red-50 text-red-700 border-red-500 border-2">
//         <h3 className="font-bold">🚨 ML Component Error</h3>
//         <p>{error}</p>
//       </Card>
//     );
//   }

//   // 3. FORCE VISIBLE: Empty Data State
//   if (!insight) {
//     return (
//       <Card className="w-full p-4 bg-yellow-50 text-yellow-700 border-yellow-500 border-2">
//         <h3 className="font-bold">⚠️ ML Component Mounted, but Data is Empty</h3>
//         <p>The backend responded, but no insight data was found.</p>
//       </Card>
//     );
//   }

//   const isAtRisk = insight.kt_risk_flag;

//   // 4. THE ACTUAL SUCCESS CARD
//   return (
//     <Card className={`w-full border-l-4 shadow-sm ${isAtRisk ? 'border-l-red-500 bg-red-50/30' : 'border-l-emerald-500 bg-emerald-50/30'}`}>
//       <CardHeader className="pb-2 flex flex-row items-center justify-between">
//         <CardTitle className="text-lg flex items-center gap-2">
//           {isAtRisk ? (
//             <AlertTriangle className="h-5 w-5 text-red-500" />
//           ) : (
//             <CheckCircle className="h-5 w-5 text-emerald-500" />
//           )}
//           AI Performance Prediction
//         </CardTitle>
//         <Badge variant={isAtRisk ? "destructive" : "default"} className={!isAtRisk ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
//           {isAtRisk ? "High KT Risk" : "On Track"}
//         </Badge>
//       </CardHeader>
      
//       <CardContent>
//         <div className="space-y-3 mt-2">
//           <div className="flex justify-between text-sm">
//             <span className="font-medium text-slate-600">Calculated Failure Probability</span>
//             <span className="font-bold">{insight.kt_probability_score}%</span>
//           </div>
          
//           <Progress 
//             value={insight.kt_probability_score} 
//             className={`h-2 ${isAtRisk ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-400'}`}
//           />
          
//           <p className="text-sm text-slate-500 mt-2">
//             <strong>System Notes:</strong> {insight.message}. This model bases its predictions heavily on historical chokepoints like Engineering Maths and Automata Theory.
//           </p>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, UserCircle2 } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

interface MLInsightCardProps {
  prn: string;
}

// 1. Updated Interface to include the new Persona Data from Phase 6
interface MLData {
  student_id: string;
  kt_risk_flag: boolean;
  kt_probability_score: number;
  message: string;
  persona_data: {
    cluster_id: number;
    name: string;
    color: string;
  };
}

export const MLInsightCard: React.FC<MLInsightCardProps> = ({ prn }) => {
  const [insight, setInsight] = useState<MLData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!prn) {
        setError("No PRN provided to the component.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Ensure this port matches your Node.js backend port! (usually 5000 or 8080)
        const response = await axios.post(`http://localhost:5000/api/students/${prn}/ml-insights`);
        
        if (response.data.success) {
          setInsight(response.data.data);
        } else {
          setError("Backend returned false success flag.");
        }
      } catch (err: any) {
        console.error("Failed to fetch ML insights", err);
        setError(err.message || "Failed to connect to Node.js backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [prn]);

  // Debugging States (Kept active so you always know what's happening)
  if (loading) {
    return (
      <Card className="w-full h-32 bg-blue-50 border-blue-500 border-2 flex items-center justify-center animate-pulse">
        <p className="text-blue-700 font-bold">ANALYZING ACADEMIC PATTERNS...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full p-4 bg-red-50 text-red-700 border-red-500 border-2">
        <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5"/> ML Component Error</h3>
        <p>{error}</p>
      </Card>
    );
  }

  if (!insight) {
    return (
      <Card className="w-full p-4 bg-yellow-50 text-yellow-700 border-yellow-500 border-2">
        <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5"/> No AI Data Found</h3>
        <p>The backend responded, but the insight object was empty.</p>
      </Card>
    );
  }

  const isAtRisk = insight.kt_risk_flag;
  
  // Helper to dynamically color the persona badge based on the Python response
  const getPersonaColor = (colorName: string) => {
    switch(colorName) {
      case 'emerald': return 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600';
      case 'red': return 'bg-red-500 hover:bg-red-600 text-white border-red-600';
      case 'orange': return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600';
      default: return 'bg-slate-500 hover:bg-slate-600 text-white';
    }
  };

  // THE DUAL-THREAT AI CARD
  return (
    <Card className={`w-full border-l-4 shadow-md transition-all ${isAtRisk ? 'border-l-red-500 bg-red-50/20' : 'border-l-emerald-500 bg-emerald-50/20'}`}>
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        <div className="space-y-3">
          <CardTitle className="text-xl flex items-center gap-2">
            {isAtRisk ? (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            ) : (
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            )}
            AI Academic Analysis
          </CardTitle>
          
          {/* 2. THE NEW PERSONA SECTION */}
          {insight.persona_data && (
            <div className="flex items-center gap-2 bg-white/60 p-2 rounded-md border w-fit shadow-sm">
              <UserCircle2 className="h-5 w-5 text-slate-500" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Student Persona:</span>
              <Badge className={`ml-1 ${getPersonaColor(insight.persona_data.color)}`}>
                {insight.persona_data.name}
              </Badge>
            </div>
          )}
        </div>

        <Badge variant={isAtRisk ? "destructive" : "default"} className={`text-sm px-3 py-1 ${!isAtRisk ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}>
          {isAtRisk ? "High KT Risk Detected" : "Stable Trajectory"}
        </Badge>
        
      </CardHeader>
      
      <CardContent>
        <Separator className="my-2 mb-4" />
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600">Calculated Failure Probability</span>
            <span className="font-bold text-base">{insight.kt_probability_score}%</span>
          </div>
          
          <Progress 
            value={insight.kt_probability_score} 
            className={`h-2.5 shadow-inner ${isAtRisk ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-400'}`}
          />
          
          <p className="text-sm text-slate-500 mt-3 pt-2">
            <strong>System Notes:</strong> {insight.message}. 
            {insight.persona_data?.name === "Critical Attention Needed" && " This student matches the historical profile of dropouts or severe academic delay."}
            {insight.persona_data?.name === "Consistent Performer" && " This student shows strong foundational understanding across core subjects."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};