const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    title_slug: {
        type: String,
        required: true,
        unique: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    tags: [{
        type: String
    }],
    questionId: {
        type: String
    }
});

module.exports = mongoose.model('Problem', problemSchema);
