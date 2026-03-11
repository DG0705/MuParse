const mongoose = require("mongoose");

const nepAcademicRecordSchema = new mongoose.Schema(
  {
    seatNo: { type: String, required: true },
    name: { type: String, required: true },
    gender: { type: String, default: "Unknown" },
    collegeCode: { type: String },
    collegeName: { type: String },
    semester: { type: Number, required: true },
    sgpi: { type: String, default: "0" },
    totalMarks: { type: String, default: "0" },
    finalResult: { type: String, default: "N/A" },
    subjects: { type: Map, of: mongoose.Schema.Types.Mixed }, // Dynamically stores all subjects
  },
  { timestamps: true }
);

// Ensures a student can't have duplicate entries for the same semester
nepAcademicRecordSchema.index({ seatNo: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("NepAcademicRecord", nepAcademicRecordSchema);