const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Update to use the correct Gemini API URL and key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const captureVoterIdPhoto = async (imageData) => {
    try {
        console.log("Sending image to Gemini API...");

        // Ensure the image is properly formatted
        if (!imageData.startsWith('data:image/')) {
            throw new Error('Invalid image format. Please provide a valid base64 image.');
        }
        const imageDataEncoded = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

        const payload = {
            contents: [
                {
                    parts: [
                        { text: "Extract the voter ID number from this image. Only return the ID number, nothing else." },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: imageDataEncoded
                            }
                        }
                    ]
                }
            ]
        };

        console.log("Payload being sent to Gemini API:", payload);

        // Make API request
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            payload,
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log("Gemini API response received", response.data);

        // Extract text from response
        const extractedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!extractedText) {
            throw new Error('No voter ID detected in the image.');
        }

        return extractedText.trim();
    } catch (error) {
        console.error("Error in Gemini API:", error.response?.data || error.message);
        if (error.response?.status === 400) {
            console.error("Bad Request: Check the payload or API key.");
        }
        if (error.response?.status === 401) {
            throw new Error('Unauthorized: Please check your API key.');
        } else if (error.response?.status === 500) {
            throw new Error('Server Error: Gemini API is currently unavailable. Please try again later.');
        } else {
            throw new Error(error.response?.data?.message || 'Failed to process the voter ID image.');
        }
    }
};

const sendToGemini = async (imageData) => {
    try {
        // Convert base64 image to the format Gemini expects
        const imageDataEncoded = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

        // Make a request to Gemini API for advanced processing
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            { text: "Extract any text visible in this image, especially voter ID information." },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: imageDataEncoded
                                }
                            }
                        ]
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data,
            detectedText: response.data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        };
    } catch (error) {
        console.error('Error processing with Gemini:', error);
        return {
            success: false,
            error: error.message || 'Failed to process with Gemini API'
        };
    }
};

module.exports = {
    captureVoterIdPhoto,
    sendToGemini,
    extractVoterId: captureVoterIdPhoto // Alias for backward compatibility
};