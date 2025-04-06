const User = require('../models/User');
const dbService = require('../services/dbService');
const geminiService = require('../services/geminiService');
const axios = require('axios');
const FormData = require('form-data');

exports.registerUser = async (req, res) => {
    const { voterId, facePhoto } = req.body;

    if (!voterId || !facePhoto) {
        return res.status(400).json({
            message: 'Both voter ID and face photo are required',
            success: false
        });
    }

    try {
        // Check if user already exists
        const existingUser = await dbService.findUserByVoterId(voterId);
        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this voter ID already exists',
                success: false
            });
        }

        // Create a new user instance
        const newUser = new User({
            voterIdNumber: voterId,
            facePhoto,
        });

        // Save user to the database
        const result = await dbService.saveUser(newUser);

        return res.status(201).json({ 
            message: 'User registered successfully', 
            voterId,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'An error occurred while registering the user: ' + error.message,
            success: false
        });
    }
};

exports.getUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await dbService.findUserByVoterId(id);

        if (!user) {
            return res.status(404).json({ 
                message: 'User not found.',
                success: false
            });
        }

        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'An error occurred while retrieving the user.',
            success: false
        });
    }
};

exports.uploadPhotos = async (req, res) => {
    const { voterIdPhoto, facePhoto } = req.body;

    // Validate input
    if (!facePhoto) {
        return res.status(400).json({
            message: 'Face photo is required',
            success: false
        });
    }

    try {
        let voterId;
        
        // If voter ID photo is provided, extract voter ID from it
        if (voterIdPhoto) {
            voterId = await geminiService.extractVoterId(voterIdPhoto);
            if (!voterId) {
                return res.status(400).json({ 
                    message: 'Failed to extract voter ID from the photo.',
                    success: false
                });
            }
        } else if (req.body.voterId) {
            // If voter ID is directly provided, use it
            voterId = req.body.voterId;
        } else {
            return res.status(400).json({ 
                message: 'Either voter ID or voter ID photo is required.',
                success: false
            });
        }

        // Check for existing user
        const existingUser = await dbService.findUserByVoterId(voterId);
        if (existingUser) {
            return res.status(400).json({ 
                message: `User with voter ID ${voterId} already exists`,
                success: false
            });
        }

        // Create and save the new user
        const newUser = new User({
            voterIdNumber: voterId,
            facePhoto,
        });

        const result = await dbService.saveUser(newUser);

        return res.status(201).json({ 
            message: 'Photos uploaded and user registered successfully', 
            voterId,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            message: 'An error occurred while uploading photos: ' + error.message,
            success: false
        });
    }
};

// Update the verification controller method with Face++ API integration
exports.verifyUser = async (req, res) => {
    try {
        const { voterId, facePhoto } = req.body;
        
        console.log('Received verification request for voter ID:', voterId);
        
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
        
        // Face++ API credentials from environment variables
        const FACE_API_KEY = process.env.FACE_API_KEY;
        const FACE_API_SECRET = process.env.FACE_API_SECRET;
        const FACE_API_ENDPOINT = process.env.FACE_API_ENDPOINT || 'https://api-us.faceplusplus.com/facepp/v3/compare';
        
        // Extract base64 data from data URLs
        const extractBase64 = (dataUrl) => {
            if (!dataUrl || typeof dataUrl !== 'string') {
                console.error('Invalid data URL');
                return '';
            }
            
            const parts = dataUrl.split(',');
            return parts.length > 1 ? parts[1] : '';
        };
        
        // Get base64 strings
        const storedImageBase64 = extractBase64(user.facePhoto);
        const newImageBase64 = extractBase64(facePhoto);
        
        console.log('Stored image base64 length:', storedImageBase64.length);
        console.log('New image base64 length:', newImageBase64.length);
        
        if (storedImageBase64.length === 0 || newImageBase64.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image data for comparison'
            });
        }
        
        // Create form parameters
        const formData = new URLSearchParams();
        formData.append('api_key', FACE_API_KEY);
        formData.append('api_secret', FACE_API_SECRET);
        formData.append('image_base64_1', storedImageBase64);
        formData.append('image_base64_2', newImageBase64);
        
        console.log('Sending request to Face++ API endpoint:', FACE_API_ENDPOINT);
        
        // Make API request to Face++
        const response = await axios.post(
            FACE_API_ENDPOINT,
            formData.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        // Log the full response for analysis
        console.log('Face++ API Response:', JSON.stringify(response.data, null, 2));
        
        // Sample Face++ API response structure:
        // {
        //   "confidence": 89.15,
        //   "request_id": "1624956427,f811590c-1c99-4b83-a8f5-c77ab92a06f1",
        //   "time_used": 382,
        //   "thresholds": {
        //     "1e-3": 62.327,
        //     "1e-4": 69.101,
        //     "1e-5": 73.975
        //   }
        // }
        
        // Extract confidence and determine if verified using a higher threshold for security
        const { confidence, thresholds } = response.data;
        // Using the 1e-5 threshold (1 in 100,000 false accept rate) for higher security
        const isVerified = confidence >= thresholds['1e-5'];
        
        return res.status(200).json({
            success: true,
            isVerified,
            confidence: confidence / 100, // Convert to 0-1 scale for frontend
            rawConfidence: confidence,     // Include the raw score
            threshold: thresholds['1e-5'], // Include the threshold used
            thresholds: thresholds,        // Include all thresholds for reference
            message: isVerified ? 'Face verification successful' : 'Face verification failed'
        });
    } catch (error) {
        console.error('Error in verification:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during verification: ' + (error.response?.data?.error_message || error.message)
        });
    }
};