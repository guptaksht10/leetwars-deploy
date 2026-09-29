const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
    unique_code: {
        type: String,
        required: true
        
    },
    name: {
        type: String,
        required: true
    },
    creator_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    start_time: {
        type: Date,
        required: true
    },
    end_time: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, 
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false 
    },
    problems: [{
        problem_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Problem'
        },
        slug: String,
        points: {
            type: Number,
            default: 1
        }
    }],
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    last_bulk_sync: {
        type: Date,
        default: null
    },
    finalized: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Contest', contestSchema);
