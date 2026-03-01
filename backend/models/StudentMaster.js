import mongoose from 'mongoose';

const studentMasterSchema = new mongoose.Schema({
  prn: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  batch: { type: String, default: null }, // Stores "2021", "2022", etc.
  gender: { type: String, default: null },
  motherName: { type: String, default: null },
  category: { 
    type: String, 
    enum: ['Regular', 'Regular with KT', 'Regular with Drop', 'Unknown'],
    default: 'Regular'
  }
}, { timestamps: true });

export default mongoose.model('StudentMaster', studentMasterSchema);