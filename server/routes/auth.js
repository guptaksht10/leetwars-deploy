const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateLeetCodeUsername } = require('../services/leetcodeService');



router.post('/register', async (req, res) => {
    try {
        const { username, email, password, leetcode_username } = req.body;

        
        if (!username || !email || !password || !leetcode_username) {
            return res.status(400).json({ 
                message: 'All fields are required' 
            });
        }

        
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email or username already exists' 
            });
        }

        
        const isValidLC = await validateLeetCodeUsername(leetcode_username);
        if (!isValidLC) {
            return res.status(400).json({ 
                message: 'Invalid LeetCode username or profile is private' 
            });
        }

        
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        
        const user = new User({
            username,
            email,
            password_hash,
            leetcode_username
        });

        await user.save();

        
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                leetcode_username: user.leetcode_username
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Server error during registration' 
        });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                leetcode_username: user.leetcode_username
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login' 
        });
    }
});


router.post('/oauth-upsert', async (req, res) => {
    try {
        const { email, name, image } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        let user = await User.findOne({ email });

        if (!user) {
            
            
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(randomPassword, salt);

            
            const baseUsername = name ? name.replace(/\s+/g, '').toLowerCase() : email.split('@')[0];
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            user = new User({
                username,
                email,
                password_hash,
                leetcode_username: '' // To be filled during onboarding
            });

            await user.save();
        }

        res.json({
            message: 'User upserted successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                leetcode_username: user.leetcode_username
            }
        });
    } catch (error) {
        console.error('OAuth upsert error:', error);
        res.status(500).json({ message: 'Server error during OAuth upsert' });
    }
});


router.get('/user-by-email', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                name: user.username,
                leetcode_username: user.leetcode_username
            }
        });
    } catch (error) {
        console.error('User by email error:', error);
        res.status(500).json({ message: 'Server error fetching user by email' });
    }
});

module.exports = router;
