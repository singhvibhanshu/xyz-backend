const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    voterIdNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    facePhoto: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'users' }); // Explicitly set collection name

const User = mongoose.model('User', userSchema);

module.exports = User;