const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Face++ API credentials
const FACE_API_KEY = '540ckxkJjsKKoZ5c5Op_HpAXBC28dCS3';
const FACE_API_SECRET = '65YoacYkEld4-KeG_kiLI91X03dQS72P';
const FACE_API_URL = 'https://api-us.faceplusplus.com/facepp/v3/compare';

// Test with local image files if available
async function testWithFiles() {
  try {
    console.log('Testing Face++ API with image files...');
    
    // Use form-data to properly format the request
    const formData = new FormData();
    formData.append('api_key', FACE_API_KEY);
    formData.append('api_secret', FACE_API_SECRET);
    
    // Append test images if they exist
    if (fs.existsSync('./test1.jpg') && fs.existsSync('./test2.jpg')) {
      formData.append('image_file1', fs.createReadStream('./test1.jpg'));
      formData.append('image_file2', fs.createReadStream('./test2.jpg'));
    } else {
      console.log('Test images not found, using URLs instead');
      // Use example URLs
      formData.append('image_url1', 'https://example.com/face1.jpg');
      formData.append('image_url2', 'https://example.com/face2.jpg');
    }
    
    const response = await axios.post(FACE_API_URL, formData, {
      headers: formData.getHeaders()
    });
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
testWithFiles()
  .then(result => {
    console.log('Test completed successfully');
  })
  .catch(error => {
    console.error('Test failed:', error.message);
  });
