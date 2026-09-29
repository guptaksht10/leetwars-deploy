const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');


router.put('/update-name', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user._id;

        if (!name || name.trim().length < 1) {
            return res.status(400).json({
                message: 'Name is required'
            });
        }

        if (name.trim().length > 100) {
            return res.status(400).json({
                message: 'Name must be less than 100 characters'
            });
        }

        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name: name.trim() },
            { new: true, select: '-password_hash' }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.json({
            message: 'Name updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                name: updatedUser.name,
                email: updatedUser.email,
                leetcode_username: updatedUser.leetcode_username
            }
        });

    } catch (error) {
        console.error('Update name error:', error);
        res.status(500).json({
            message: 'Failed to update name'
        });
    }
});

module.exports = router;
