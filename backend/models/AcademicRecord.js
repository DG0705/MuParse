const mongoose = require("mongoose");

const academicRecordSchema = new mongoose.Schema(
  {
    prn: { type: String, required: true, ref: "StudentMaster" },
    seatNo: { type: String, required: true },
    semester: { type: Number, required: true },
    sgpi: { type: String, default: "0" },
    totalMarks: { type: String, default: "0" },
    finalResult: { type: String, default: "Unsuccessful" },
    isKT: { type: Boolean, default: false },
    isNEP: { type: Boolean, default: false }, // Crucial for data isolation
    subjects: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

academicRecordSchema.index({ prn: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("AcademicRecord", academicRecordSchema);