import mongoose from 'mongoose';

const semester4Schema = new mongoose.Schema({
  seatNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  prn: { type: String, default: null },
  semester: { type: Number, default: 4 },
  results: {
    sgpi: { type: String, default: "0" },
    totalMarks: { type: String, default: "0" },
    finalResult: { type: String, default: "" }
  },
  subjects: { type: Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('Semester4', semester4Schema);