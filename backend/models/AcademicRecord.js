import mongoose from 'mongoose';

const academicRecordSchema = new mongoose.Schema({
  prn: { type: String, required: true, ref: 'StudentMaster' }, 
  seatNo: { type: String, required: true },
  semester: { type: Number, required: true }, 
  sgpi: { type: String, default: "0" },
  totalMarks: { type: String, default: "0" },
  finalResult: { type: String, default: "Unsuccessful" }, 
  isKT: { type: Boolean, default: false }, // Easily tell the frontend to show the KT Blink button
  subjects: { type: Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Compound index to ensure a student only has one record per semester and for fast lookups
academicRecordSchema.index({ prn: 1, semester: 1 }, { unique: true });

export default mongoose.model('AcademicRecord', academicRecordSchema);