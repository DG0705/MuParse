// const axios = require('axios');
// const AcademicRecord = require('../models/AcademicRecord'); // Adjust path if needed

// // The URL where your FastAPI server is running
// const PYTHON_ML_API_URL = 'http://127.0.0.1:8000/api/predict-kt';

// exports.getStudentMLInsights = async (req, res) => {
//   try {
//     const { prn } = req.params;

//     // 1. Fetch the student's historical records from MongoDB
//     const records = await AcademicRecord.find({ prn: prn });
    
//     if (!records || records.length === 0) {
//       return res.status(404).json({ message: "No academic records found for this student." });
//     }

//     // 2. Format the data into a single flat dictionary/object for the ML model
//     // We will extract their latest SGPI and flatten all their subjects
//     let mlFeatures = {};
//     let latestSgpi = 0;

//     records.forEach(record => {
//         // Keep updating latestSgpi, assuming records are sorted or we just want the highest/latest
//         if (parseFloat(record.sgpi) > 0) {
//             latestSgpi = parseFloat(record.sgpi);
//         }
        
//         // Unpack the Map of subjects into standard key-value pairs
//        if (record.subjects) {
//     record.subjects.forEach((marks, subjectName) => {
//         const cleanMark = parseFloat(marks.toString().replace(/[^\d.]/g, '')) || 0;
//         mlFeatures[subjectName] = cleanMark;
//     });
// }
//     });

//     mlFeatures['sgpi'] = latestSgpi;
// console.log("ML Features Sent:", mlFeatures);
//     // 3. Send the formatted data to your Python Microservice
//     const pythonResponse = await axios.post(PYTHON_ML_API_URL, {
//       student_id: prn,
//       features: mlFeatures
//     });

//     // 4. Send the AI prediction back to your React Frontend!
//     res.status(200).json({
//         success: true,
//         data: pythonResponse.data
//     });

//   } catch (error) {
//     console.error("ML Integration Error:", error.message);
//     res.status(500).json({ success: false, message: "Failed to generate ML insights." });
//   }
// };





// const axios = require('axios');
// const AcademicRecord = require('../models/AcademicRecord'); // Adjust path if needed

// // Define the base URL for the Python ML Engine
// const PYTHON_BASE_URL = 'http://127.0.0.1:8000/api';

// exports.getStudentMLInsights = async (req, res) => {
//   try {
//     const { prn } = req.params;

//     // 1. Fetch the student's historical records from MongoDB
//     const records = await AcademicRecord.find({ prn: prn });
    
//     if (!records || records.length === 0) {
//       return res.status(404).json({ message: "No academic records found for this student." });
//     }

//     // 2. Format the data into a single flat dictionary/object for the ML model
//     let mlFeatures = {};
//     let totalSgpi = 0;
//     let sgpiCount = 0;

//     records.forEach(record => {
//         // Calculate true average SGPI to catch overall performance drops
//         let currentSgpi = parseFloat(record.sgpi);
//         if (currentSgpi > 0) {
//             totalSgpi += currentSgpi;
//             sgpiCount++;
//         }
        
//         // Unpack the Map of subjects into standard key-value pairs
//         if (record.subjects) {
//             record.subjects.forEach((marks, subjectName) => {
//                 const cleanMark = parseFloat(marks.toString().replace(/[^\d.]/g, '')) || 0;
//                 mlFeatures[subjectName] = cleanMark;
//             });
//         }
//     });

//     // Send the mathematical average instead of just the latest score
//     mlFeatures['sgpi'] = sgpiCount > 0 ? (totalSgpi / sgpiCount) : 0;
//     console.log("ML Features Sent:", mlFeatures);

//     // 3. Send the formatted data to BOTH Python Microservice endpoints
//     const payload = {
//         student_id: prn,
//         features: mlFeatures
//     };

//     // Promise.all runs both requests simultaneously for maximum speed
//     const [ktResponse, personaResponse] = await Promise.all([
//         axios.post(`${PYTHON_BASE_URL}/predict-kt`, payload),
//         axios.post(`${PYTHON_BASE_URL}/predict-persona`, payload)
//     ]);

//     // Extract the raw data from Python
//     let ktData = ktResponse.data;
//     let personaData = personaResponse.data;

//     // --- THE STRICT OVERRIDE RULE ---
//     // If the KT Risk is 50% or higher, force the Persona to be Critical Risk!
//     if (ktData.kt_probability_score >= 50.0) {
//         console.log(`[ML Override] PRN ${prn} has ${ktData.kt_probability_score}% risk. Overriding Persona.`);
//         personaData.persona = "Critical Attention Needed";
//         personaData.color = "red";
//     }

//     // 4. Combine the AI predictions and send back to your React Frontend!
//     res.status(200).json({
//         success: true,
//         data: {
//             student_id: ktData.student_id,
//             kt_risk_flag: ktData.kt_risk_flag,
//             kt_probability_score: ktData.kt_probability_score,
//             message: ktData.message,
//             persona_data: {
//                 cluster_id: personaData.cluster_id,
//                 name: personaData.persona, // This will now use the Strict Override name if applicable
//                 color: personaData.color   // This will now use the Strict Override color if applicable
//             }
//         }
//     });

//   } catch (error) {
//     console.error("ML Integration Error:", error.message);
//     res.status(500).json({ success: false, message: "Failed to generate ML insights." });
//   }
// };




const axios = require('axios');
const AcademicRecord = require('../models/AcademicRecord');

const PYTHON_BASE_URL = 'http://127.0.0.1:8000/api';

exports.getStudentMLInsights = async (req, res) => {
  try {
    const { prn } = req.params;

    const records = await AcademicRecord.find({ prn: prn });
    
    if (!records || records.length === 0) {
      return res.status(404).json({ message: "No academic records found for this student." });
    }

   let mlFeatures = {};
    let totalSgpi = 0;
    let sgpiCount = 0;
    let totalKts = 0;

    records.forEach(record => {
        let currentSgpi = parseFloat(record.sgpi) || 0;
        let semesterKts = 0; // Track KTs just for this specific semester
        
        if (record.subjects) {
            record.subjects.forEach((marks, subjectName) => {
                // Get clean number for the Python AI
                const cleanMark = parseFloat(String(marks).replace(/[^\d.]/g, '')) || 0;
                mlFeatures[subjectName] = cleanMark;
                
                // --- THE ULTIMATE STRICT KT REGEX ---
                // Matches "12F", "05F", "F", "AB", or "ABSENT" exactly.
                // It will NEVER accidentally match "LAB", "SUCCESSFUL", or empty "0"s!
                const markStr = marks ? String(marks).toUpperCase().trim() : "";
                if (/^\d*F$|^AB$|^ABSENT$/i.test(markStr)) {
                    semesterKts++;
                    totalKts++;
                }
            });
        }

        // --- THE FUTURE-SEMESTER FIX ---
        // Only average this semester IF they actually attended it (SGPI > 0 or they failed something)
        // This stops empty future semesters (SGPI 0) from dragging down their true average!
        if (currentSgpi > 0 || semesterKts > 0) {
            totalSgpi += currentSgpi;
            sgpiCount++;
        }
    });

    const trueAverage = sgpiCount > 0 ? (totalSgpi / sgpiCount) : 0;
    mlFeatures['sgpi'] = trueAverage;
    
    console.log(`[ML Request] PRN: ${prn} | True Avg: ${trueAverage.toFixed(2)} | Active KTs: ${totalKts}`);

    const payload = {
        student_id: prn,
        features: mlFeatures
    };

    const [ktResponse, personaResponse] = await Promise.all([
        axios.post(`${PYTHON_BASE_URL}/predict-kt`, payload),
        axios.post(`${PYTHON_BASE_URL}/predict-persona`, payload)
    ]);

    // let finalPersonaName = personaResponse.data.persona;
    // let finalPersonaColor = personaResponse.data.color;

    // // --- THE GOLDEN OVERRIDE RULE ---
    // // If the ML Model predicts a 50%+ chance of failure, OR their true average is terrible,
    // // they CANNOT be a Consistent Performer, no matter what the Clustering AI says!
    // if (ktResponse.data.kt_probability_score >= 50.0 || trueAverage < 5.0 || totalKts > 2) {
    //     finalPersonaName = "Critical Attention Needed";
    //     finalPersonaColor = "red";
    // } else if (trueAverage >= 5.0 && trueAverage < 7.0 && finalPersonaName === "Consistent Performer") {
    //     finalPersonaName = "Mid-Tier / Struggling";
    //     finalPersonaColor = "orange";
    // }

    // res.status(200).json({
    //     success: true,
    //     data: {
    //         student_id: ktResponse.data.student_id,
    //         kt_risk_flag: ktResponse.data.kt_risk_flag,
    //         kt_probability_score: ktResponse.data.kt_probability_score,
    //         message: ktResponse.data.message,
    //         persona_data: {
    //             cluster_id: personaResponse.data.cluster_id,
    //             name: finalPersonaName, 
    //             color: finalPersonaColor 
    //         }
    //     }
    // });


    
    let finalPersonaName = personaResponse.data.persona;
    let finalPersonaColor = personaResponse.data.color;
    let finalKtScore = ktResponse.data.kt_probability_score;
    let finalKtFlag = ktResponse.data.kt_risk_flag;

    // --- 1. TOP PERFORMER IMMUNITY ---
    // High SGPI + 0 KTs = Always Green (Overrides AI Hallucinations)
    if (trueAverage >= 7.0 && totalKts === 0) {
        finalPersonaName = "Consistent Performer";
        finalPersonaColor = "emerald";
        finalKtFlag = false; 
        if (finalKtScore >= 50.0) finalKtScore = Math.min(finalKtScore, 12.5); 
    }
    // --- 2. CRITICAL RISK ---
    // Terrible SGPI OR too many KTs (3+) = Always Red
    else if (trueAverage < 5.0 || totalKts > 2) {
        finalPersonaName = "Critical Attention Needed";
        finalPersonaColor = "red";
        finalKtFlag = true;
    }
    // --- 3. MID-TIER / STRUGGLING ---
    // Average SGPI (5 to 7) OR they have 1-2 KTs = Orange
    else if ((trueAverage >= 5.0 && trueAverage < 7.0) || totalKts > 0) {
        finalPersonaName = "Mid-Tier / Struggling";
        finalPersonaColor = "orange";
        // Notice we don't force finalKtFlag to be false here. 
        // We let the AI keep the risk percentage high, but we keep her Persona Orange!
    }

    res.status(200).json({
        success: true,
        data: {
            student_id: ktResponse.data.student_id,
            kt_risk_flag: finalKtFlag,            
            kt_probability_score: finalKtScore,   
            message: ktResponse.data.message,
            persona_data: {
                cluster_id: personaResponse.data.cluster_id,
                name: finalPersonaName, 
                color: finalPersonaColor 
            }
        }
    });

  } catch (error) {
    console.error("ML Integration Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to generate ML insights." });
  }
};