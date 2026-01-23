import mongoose from 'mongoose';

const semesterResultSchema = new mongoose.Schema({
  seatNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  prn: { type: String, required: true }, // References StudentMaster prn
  semester: { type: Number, required: true },
  results: {
    sgpi: { type: String },
    cgpi: { type: String },
    totalMarks: { type: String },
    finalResult: { type: String }, 
  },
  // Stores subject-wise marks
  subjects: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

export default mongoose.model('SemesterResult', semesterResultSchema);