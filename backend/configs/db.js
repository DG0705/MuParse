import mongoose from 'mongoose';
const connectDB = async () => {
    try {
        // No quotes around process.env.MONGODB_URI
        const conn = await mongoose.connect('mongodb+srv://MuParseUser:kT2yki8ErcA3cq3d@cluster0.bq0sluh.mongodb.net/StudentDB');
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); 
    }
};

export default connectDB;