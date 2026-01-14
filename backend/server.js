import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import studentRoutes from './routes/studentRoutes.js';

const app = express();

// Connect to Database
await connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/students', studentRoutes);

app.get('/', (req, res) => {
    res.send('MuParse Backend is running...');
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});