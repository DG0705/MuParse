import mongoose from 'mongoose';

const semester1Schema = new mongoose.Schema({
  seatNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  prn: { type: String },
  semester: { type: Number, default: 1 },
  results: {
    sgpi: { type: String, default: "0" },
    totalMarks: { type: String, default: "0" },
    finalResult: { type: String, default: "" }
  },
  subjects: { type: Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('Semester1', semester1Schema);