const mongoose = require("mongoose");

const semester5Schema = new mongoose.Schema(
  {
    seatNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    prn: { type: String },
    semester: { type: Number, default: 5 },
    results: {
      sgpi: { type: String, default: "0" },
      totalMarks: { type: String, default: "0" },
      finalResult: { type: String, default: "" },
    },
    subjects: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

// ✅ Recommended index (prevents duplicate issues properly)
semester5Schema.index({ seatNo: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Semester5", semester5Schema);
