const mongoose = require("mongoose");

const semester3Schema = new mongoose.Schema(
  {
    seatNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    // Optional PRN (as per your current frontend extraction)
    prn: { type: String },
    semester: { type: Number, default: 3 },
    results: {
      sgpi: { type: String, default: "0" }, // Maps to SGPA
      totalMarks: { type: String, default: "0" },
      finalResult: { type: String, default: "" },
    },
    // Dynamic subject fields
    subjects: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

// ⚠️ Recommended fix (instead of unique: true on seatNo)
semester3Schema.index({ seatNo: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Semester3", semester3Schema);
