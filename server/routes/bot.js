const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getUserProfile, getUserSolvedByTags, getUserContestHistory } = require('../services/leetcodeService');
const { analyzeProgress, generateRoast, chatWithBot, getImprovementSuggestions } = require('../services/deepseekService');


router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message) {
            return res.status(400).json({
                message: 'Message is required'
            });
        }

        
        const leetcodeUsername = req.user.leetcode_username;
        const [profile, tagStats, contestData] = await Promise.all([
            getUserProfile(leetcodeUsername),
            getUserSolvedByTags(leetcodeUsername),
            getUserContestHistory(leetcodeUsername)
        ]);

        const userStats = {
            solvedStats: profile.solvedStats,
            totalProblems: profile.totalProblems,
            tagStats,
            contestRanking: contestData.contestRanking
        };

        
        const reply = await chatWithBot(message, userStats, conversationHistory);

        res.json({
            reply,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Bot chat error:', error);
        res.status(500).json({
            message: 'Failed to chat with bot',
            error: error.message
        });
    }
});


router.get('/analyze', authMiddleware, async (req, res) => {
    try {
        const leetcodeUsername = req.user.leetcode_username;
        
        console.log(`Analyzing progress for: ${leetcodeUsername}`);

        const [profile, tagStats, contestData] = await Promise.all([
            getUserProfile(leetcodeUsername),
            getUserSolvedByTags(leetcodeUsername),
            getUserContestHistory(leetcodeUsername)
        ]);

        const userStats = {
            solvedStats: profile.solvedStats,
            totalProblems: profile.totalProblems,
            tagStats,
            contestRanking: contestData.contestRanking
        };

        const analysis = await analyzeProgress(userStats);

        res.json({
            analysis,
            stats: userStats,
            generatedAt: new Date()
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            message: 'Failed to analyze progress',
            error: error.message
        });
    }
});


router.get('/roast', authMiddleware, async (req, res) => {
    try {
        const { severity = 'medium' } = req.query;
        const leetcodeUsername = req.user.leetcode_username;

        console.log(`Roasting user: ${leetcodeUsername} (severity: ${severity})`);

        const [profile, tagStats, contestData] = await Promise.all([
            getUserProfile(leetcodeUsername),
            getUserSolvedByTags(leetcodeUsername),
            getUserContestHistory(leetcodeUsername)
        ]);

        const userStats = {
            solvedStats: profile.solvedStats,
            totalProblems: profile.totalProblems,
            tagStats,
            contestRanking: contestData.contestRanking
        };

        const roast = await generateRoast(userStats, severity);

        res.json({
            roast,
            severity,
            roastedAt: new Date(),
            stats: {
                totalSolved: profile.solvedStats.easy + profile.solvedStats.medium + profile.solvedStats.hard,
                contestRating: contestData.contestRanking?.rating || 0
            }
        });

    } catch (error) {
        console.error('Roast error:', error);
        res.status(500).json({
            message: 'Failed to generate roast',
            error: error.message
        });
    }
});


router.get('/suggestions', authMiddleware, async (req, res) => {
    try {
        const leetcodeUsername = req.user.leetcode_username;

        const [profile, tagStats] = await Promise.all([
            getUserProfile(leetcodeUsername),
            getUserSolvedByTags(leetcodeUsername)
        ]);

        const userStats = {
            solvedStats: profile.solvedStats,
            totalProblems: profile.totalProblems,
            tagStats
        };

        const suggestions = await getImprovementSuggestions(userStats);

        res.json({
            suggestions,
            generatedAt: new Date()
        });

    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({
            message: 'Failed to get suggestions',
            error: error.message
        });
    }
});

module.exports = router;
