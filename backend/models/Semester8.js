import mongoose from 'mongoose';

const semester8Schema = new mongoose.Schema({
  seatNo: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  prn: { 
    type: String, 
    required: true,
    ref: 'StudentMaster' // Optional: Link to the Master table
  },
  semester: { 
    type: Number, 
    required: true,
    default: 1 // Hardcoded default for this specific table
  },
  results: {
    sgpi: { type: String, default: "0" },
    cgpi: { type: String, default: "0" },
    totalMarks: { type: String, default: "0" },
    finalResult: { type: String, default: "" }, 
  },
  // Flexible map to store any subject columns found in the CSV
  subjects: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Export as 'Semester1' which creates the 'semester1' collection in MongoDB
export default mongoose.model('Semester8', semester8Schema);