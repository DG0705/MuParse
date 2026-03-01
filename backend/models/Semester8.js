const mongoose = require("mongoose");

const semester8Schema = new mongoose.Schema(
  {
    seatNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    prn: { type: String },
    semester: { type: Number, default: 8 },
    results: {
      sgpi: { type: String, default: "0" },
      totalMarks: { type: String, default: "0" },
      finalResult: { type: String, default: "" },
    },
    subjects: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

// ✅ Recommended compound index
semester8Schema.index({ seatNo: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Semester8", semester8Schema);
