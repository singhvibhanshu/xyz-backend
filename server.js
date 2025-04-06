const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const cors = require('cors');
// const dotenv = require('dotenv');
const User = require('./models/User');
const axios = require('axios');

// dotenv.config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
    origin: '*', // For development, allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase JSON limit for base64 encoded images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
const MONGODB_URI =  'mongodb+srv://ishaanaga23:randomPassword@cluster0.ebkp9qd.mongodb.net/voters';

mongoose.connect(MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('MongoDB connected to voters database'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', userRoutes);

// Add a test route to check if server is running
app.get('/ping', (req, res) => {
    res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Direct registration endpoint without going through routes
app.post('/api/register', async (req, res) => {
    try {
        const { voterId, facePhoto } = req.body;
        
        console.log('Received registration request:');
        console.log('Voter ID:', voterId);
        console.log('Face photo length:', facePhoto ? facePhoto.length : 'No photo');
        
        if (!voterId || !facePhoto) {
            return res.status(400).json({
                success: false,
                message: 'Both voter ID and face photo are required'
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ voterIdNumber: voterId });
        if (existingUser) {
            console.log('User already exists with this voter ID');
            return res.status(400).json({
                success: false,
                message: 'User with this voter ID already exists'
            });
        }
        
        // Create a new user
        const newUser = new User({
            voterIdNumber: voterId,
            facePhoto
        });
        
        // Save to database
        await newUser.save();
        console.log('New user saved successfully');
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            voterId
        });
    } catch (error) {
        console.error('Error in /api/register:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
});

// Verification endpoint to verify voter by ID and face comparison
app.post('/api/verify', async (req, res) => {
    try {
        const { voterId, facePhoto } = req.body;
        
        console.log('Received verification request:');
        console.log('Voter ID:', voterId);
        console.log('Face photo received:', facePhoto ? 'Yes' : 'No');
        
        if (!voterId || !facePhoto) {
            return res.status(400).json({
                success: false,
                message: 'Both voter ID and face photo are required for verification'
            });
        }
        
        // Find user in database
        const user = await User.findOne({ voterIdNumber: voterId });
        
        if (!user) {
            console.log('User not found with voter ID:', voterId);
            return res.status(404).json({
                success: false,
                message: 'No user found with this voter ID'
            });
        }
        
        // Get stored face photo
        const storedFacePhoto = user.facePhoto;
        console.log('Found stored face photo for user');

        // Extract base64 data from data URLs - important: remove the data:image/jpeg;base64, prefix
        const extractBase64 = (dataUrl) => {
            if (!dataUrl || typeof dataUrl !== 'string') {
                return '';
            }
            const parts = dataUrl.split(',');
            return parts.length > 1 ? parts[1] : dataUrl;
        };
        
        const storedImageBase64 = extractBase64(storedFacePhoto);
        const newImageBase64 = extractBase64(facePhoto);
        
        if (!storedImageBase64 || !newImageBase64) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image data'
            });
        }

        console.log('Creating request for Face++ API...');
        console.log('Stored image base64 length:', storedImageBase64.length);
        console.log('New image base64 length:', newImageBase64.length);
        
        // Build the form data as x-www-form-urlencoded
        const formData = new URLSearchParams();
        formData.append('api_key', '540ckxkJjsKKoZ5c5Op_HpAXBC28dCS3');
        formData.append('api_secret', '65YoacYkEld4-KeG_kiLI91X03dQS72P');
        formData.append('image_base64_1', storedImageBase64);
        formData.append('image_base64_2', newImageBase64);
        
        console.log('Sending request to Face++ API...');
        
        const response = await axios({
            method: 'post',
            url: 'https://api-us.faceplusplus.com/facepp/v3/compare',
            data: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        // Log the complete API response for analysis
        console.log('Face++ API Raw Response:', response.data);
        console.log('Face++ API Response (formatted):', JSON.stringify(response.data, null, 2));
        
        /*
         * Sample Face++ API response:
         * {
         *   "confidence": 89.15,
         *   "request_id": "1624956427,f811590c-1c99-4b83-a8f5-c77ab92a06f1",
         *   "time_used": 382,
         *   "thresholds": {
         *     "1e-3": 62.327,
         *     "1e-4": 69.101,
         *     "1e-5": 73.975
         *   }
         * }
         */
        
        const { confidence, thresholds } = response.data;
        const isVerified = confidence >= thresholds['1e-3']; // Using 1 in 1000 false accept rate threshold
        
        console.log('Face comparison results:', {
            confidence,
            thresholds,
            isVerified
        });
        
        return res.status(200).json({
            success: true,
            isVerified,
            confidence: confidence / 100, // Convert to 0-1 scale for frontend display
            rawConfidence: confidence,  // Include raw confidence score
            thresholds: thresholds,     // Include all thresholds
            message: isVerified ? 'Face verification successful' : 'Face verification failed'
        });
    } catch (error) {
        console.error('Error in verification:', error);
        
        // Detailed error logging to help debug API issues
        if (error.response) {
            console.error('Face++ API error response:', error.response.data);
            console.error('Face++ API error status:', error.response.status);
            console.error('Face++ API error headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received from Face++ API');
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during verification: ' + (error.response?.data?.error_message || error.message)
        });
    }
});

// Error handling middleware
app.use(errorHandler);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    res.status(500).json({
        success: false,
        message: 'Server error: ' + (err.message || 'Unknown error')
    });
});

// Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
//     console.log('Available routes:');
//     console.log('- POST /api/register');
//     console.log('- GET /api/users/:id');
//     console.log('- POST /api/verify');
//     console.log('- GET /ping');
// });


module.exports = app;

