const mongoose = require('mongoose');
const User = require('../models/User');
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const MONGO_URI = "mock_mongo_connection_string";

const dbService = {
    connect: async (uri) => {
        try {
            await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('MongoDB connected successfully');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    },

    saveUser: async (user) => {
        try {
            // First check if user already exists
            const existingUser = await User.findOne({ voterIdNumber: user.voterIdNumber });
            if (existingUser) {
                throw new Error(`User with voter ID ${user.voterIdNumber} already exists`);
            }
            
            // Save the user if no duplicate found
            await user.save();
            return {
                success: true,
                voterId: user.voterIdNumber,
                message: "User data stored successfully"
            };
        } catch (error) {
            console.error('Error saving user to database:', error);
            throw error;
        }
    },

    findUserById: async (id) => {
        try {
            const user = await User.findById(id);
            return user;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    },

    findUserByVoterId: async (voterId) => {
        try {
            const user = await User.findOne({ voterIdNumber: voterId });
            return user;
        } catch (error) {
            console.error('Error finding user by voter ID:', error);
            throw error;
        }
    }
};

module.exports = dbService;