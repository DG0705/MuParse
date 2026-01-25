import mongoose from 'mongoose';

const studentMasterSchema = new mongoose.Schema({
  prn: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  gender: { 
    type: String, 
    default: null 
  },
  motherName: { 
    type: String, 
    default: null 
  },
  // Stores the student's current academic status
  category: { 
    type: String, 
    enum: ['Regular', 'Regular with KT', 'Regular with Drop', 'Unknown'],
    default: 'Regular'
  }
}, { timestamps: true });

export default mongoose.model('StudentMaster', studentMasterSchema);