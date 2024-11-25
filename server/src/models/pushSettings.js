const mongoose = require('mongoose');

const pushSettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    like_comment: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    from_friends: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    requested_friend: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    suggested_friend: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    birthday: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    video: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    report: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    sound_on: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    notification_on: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    vibrant_on: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    },
    led_on: {
        type: String,
        enum: ['0', '1'],
        default: '1'
    }
}, {
    timestamps: true
});

const PushSettings = mongoose.model('PushSettings', pushSettingsSchema);
module.exports = { PushSettings };