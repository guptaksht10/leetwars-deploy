const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
    contest_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contest',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leetcode_username: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        default: 0
    },
    total_penalty: {
        type: Number,
        default: 0
    },
    rank: {
        type: Number,
        default: null
    },
    problem_progress: [{
        slug: String,
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'FAIL'],
            default: 'PENDING'
        },
        fail_count: {
            type: Number,
            default: 0
        },
        solved_at: Date,
        penalty: {
            type: Number,
            default: 0
        },
        processed_submission_ids: {
            type: [String],
            default: []
        }
    }],
    last_sync: {
        type: Date
    },
    finish_time: {
        type: Number,  
        default: 0
    }
});


participationSchema.index({ contest_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);
