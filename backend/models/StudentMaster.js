import mongoose from 'mongoose';

const studentMasterSchema = new mongoose.Schema({
  prn: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  gender: { type: String, default: '' },
  motherName: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Regular', 'Regular with KT', 'Regular with Drop', 'Unknown'],
    default: 'Regular'
  }
}, { timestamps: true });

export default mongoose.model('StudentMaster', studentMasterSchema);