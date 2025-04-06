const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Existing routes
router.post('/register', userController.registerUser);
router.get('/users/:id', userController.getUser);
router.post('/upload', userController.uploadPhotos);

// Add the verification route
router.post('/verify', userController.verifyUser);

module.exports = router;