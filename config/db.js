const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Use the provided MongoDB connection string
        const connectionString = process.env.MONGODB_URI;
        
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('MongoDB connected successfully to voters database');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;