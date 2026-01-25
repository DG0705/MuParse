import mongoose from 'mongoose';

const semester3Schema = new mongoose.Schema({
  seatNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  // Optional: Frontend doesn't currently extract PRN for these sems, so strictly not required yet
  prn: { type: String, default: null }, 
  semester: { type: Number, default: 3 },
  results: {
    sgpi: { type: String, default: "0" }, // Maps to 'SGPA' from your CSV
    totalMarks: { type: String, default: "0" },
    finalResult: { type: String, default: "" }
  },
  // Stores all subject columns (e.g., "DSA_ESE_Marks": "80")
  subjects: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

export default mongoose.model('Semester3', semester3Schema);