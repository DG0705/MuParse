const mongoose = require("mongoose");

const CollegeStudentDetailsSchema = new mongoose.Schema(
  {
    prn: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    Sem1: { type: Boolean, default: false },
    Sem2: { type: Boolean, default: false },
    Sem3: { type: Boolean, default: false },
    Sem4: { type: Boolean, default: false },
    Sem5: { type: Boolean, default: false },
    Sem6: { type: Boolean, default: false },
    Sem7: { type: Boolean, default: false },
    Sem8: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "CollegeStudentDetails",
  CollegeStudentDetailsSchema,
);
