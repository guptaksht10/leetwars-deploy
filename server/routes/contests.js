const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');
const Problem = require('../models/Problem');
const authMiddleware = require('../middleware/auth');
const { nanoid } = require('nanoid');


router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { name, start_time, duration, problems, isPublic = false } = req.body;

        
        if (!name || !start_time || !duration || !problems || problems.length === 0) {
            return res.status(400).json({ 
                message: 'All fields are required and at least one problem must be selected' 
            });
        }

        const durationNum = parseInt(duration);
        if (isNaN(durationNum) || durationNum < 20 || durationNum > 180) {
            return res.status(400).json({
                message: 'Contest duration must be between 20 and 180 minutes (3 hours)'
            });
        }

        
        let unique_code;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            unique_code = nanoid(8);
            
            
            const existingContest = await Contest.findOne({
                unique_code,
                end_time: { $gt: new Date() } 
            });
            
            if (!existingContest) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({
                message: 'Failed to generate unique contest code. Please try again.'
            });
        }

        console.log(`Generated unique code: ${unique_code} (attempts: ${attempts})`);

        const startDate = new Date(start_time);
        
        
        const now = new Date();
        if (startDate < now) {
            return res.status(400).json({
                message: 'Contest start time cannot be in the past'
            });
        }
        
        const endDate = new Date(startDate.getTime() + duration * 60000);

        console.log('payload:', JSON.stringify(req.body));

        
        const processedProblems = [];
        for (const p of problems) {
            let problemId;
            
            
            if (typeof p.problem_id === 'object' && p.problem_id !== null) {
                problemId = p.problem_id._id;
            } else {
                problemId = p.problem_id;
            }

            
            if (!problemId) {
                try {
                    
                    let existingProblem = await Problem.findOne({ title_slug: p.slug });
                    
                    if (existingProblem) {
                        problemId = existingProblem._id;
                    } else {
                        
                        const newProblem = new Problem({
                            title: p.title,
                            title_slug: p.slug,
                            difficulty: p.difficulty || 'Medium',
                            tags: []
                        });
                        await newProblem.save();
                        problemId = newProblem._id;
                        console.log(`Created new problem: ${p.title} (${problemId})`);
                    }
                } catch (error) {
                    console.error(`Failed to create problem ${p.title}:`, error);
                    continue; 
                }
            }

            processedProblems.push({
                problem_id: problemId,
                slug: p.slug,
                points: p.points || 1
            });
        }

        if (processedProblems.length === 0) {
            return res.status(400).json({
                message: 'No valid problems could be processed'
            });
        }

        
        const contest = new Contest({
            unique_code,
            name,
            creator_id: req.user._id,
            start_time: startDate,
            end_time: endDate,
            duration,
            isPublic,
            problems: processedProblems,
            participants: []
        });

        await contest.save();

        res.status(201).json({
            message: 'Contest created successfully',
            contest: {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                start_time: contest.start_time,
                end_time: contest.end_time,
                duration: contest.duration,
                isPublic: contest.isPublic,
                problems: contest.problems
            }
        });

    } catch (error) {
        console.error('Contest creation error:', error);
        res.status(500).json({ 
            message: 'Server error during contest creation' 
        });
    }
});


router.post('/enroll/:code', authMiddleware, async (req, res) => {
    try {
        const { code } = req.params;
        
        console.log('Enrollment attempt for code:', code);

        
        const contest = await Contest.findOne({ 
            unique_code: { $regex: new RegExp(`^${code}$`, 'i') },
            end_time: { $gt: new Date() } 
        });
        
        console.log('Contest found:', contest ? contest.name : 'NOT FOUND');

        if (!contest) {
            
            const endedContest = await Contest.findOne({ 
                unique_code: { $regex: new RegExp(`^${code}$`, 'i') }
            });
            
            if (endedContest) {
                console.log('Contest exists but has ended:', endedContest.end_time);
                return res.status(400).json({ 
                    message: 'This contest has already ended' 
                });
            }
            
            return res.status(404).json({ 
                message: 'Contest not found. Please check the code and try again.' 
            });
        }

        
        if (contest.participants.includes(req.user._id)) {
            return res.status(400).json({ 
                message: 'You are already enrolled in this contest' 
            });
        }

        contest.participants.push(req.user._id);
        await contest.save();

        
        const participation = new Participation({
            contest_id: contest._id,
            user_id: req.user._id,
            leetcode_username: req.user.leetcode_username,
            problem_progress: contest.problems.map(p => ({
                slug: p.slug,
                status: 'PENDING',
                fail_count: 0
            }))
        });

        await participation.save();

        res.json({
            message: 'Successfully enrolled in contest',
            contest: {
                id: contest._id,
                name: contest.name,
                start_time: contest.start_time,
                end_time: contest.end_time
            }
        });

    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ 
            message: 'Server error during enrollment' 
        });
    }
});


router.get('/:code', authMiddleware, async (req, res) => {
    try {
        const { code } = req.params;

        
        let contest = await Contest.findOne({ 
            unique_code: code,
            end_time: { $gt: new Date() }
        })
            .populate('creator_id', 'username')
            .populate('problems.problem_id', 'title difficulty');

        
        
        if (!contest) {
            contest = await Contest.findOne({ unique_code: code })
                .populate('creator_id', 'username')
                .populate('problems.problem_id', 'title difficulty');
            
            
            if (contest && new Date() > contest.end_time) {
                const isEnrolled = contest.participants.includes(req.user._id);
                if (!isEnrolled) {
                    return res.status(404).json({ 
                        message: 'Contest not found or has ended' 
                    });
                }
            }
        }

        if (!contest) {
            return res.status(404).json({ 
                message: 'Contest not found' 
            });
        }

        
        const isEnrolled = contest.participants.includes(req.user._id);
        const isCreator = contest.creator_id._id.toString() === req.user._id.toString();
        
        
        const now = new Date();
        const contestStarted = now >= new Date(contest.start_time);
        const contestEnded = now > new Date(contest.end_time);
        
        
        
        
        const canSeeProblems = isCreator || (contestStarted && isEnrolled);

        
        let syncAllCooldown = 0;
        if (contest.last_bulk_sync) {
            const timeSinceLastSync = Date.now() - new Date(contest.last_bulk_sync).getTime();
            const tenMinutes = 10 * 60 * 1000;
            if (timeSinceLastSync < tenMinutes) {
                syncAllCooldown = Math.ceil((tenMinutes - timeSinceLastSync) / 1000);
            }
        }

        res.json({
            contest: {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                creator: contest.creator_id.username,
                isCreator,
                start_time: contest.start_time,
                end_time: contest.end_time,
                duration: contest.duration,
                
                problems: canSeeProblems ? contest.problems : [],
                problemCount: contest.problems.length,
                isEnrolled,
                participantCount: contest.participants.length,
                status: contestEnded ? 'ended' : contestStarted ? 'live' : 'upcoming',
                syncAllCooldown 
            }
        });

    } catch (error) {
        console.error('Get contest error:', error);
        res.status(500).json({ 
            message: 'Server error fetching contest' 
        });
    }
});


router.get('/my/enrolled', authMiddleware, async (req, res) => {
    try {
        const contests = await Contest.find({ 
            participants: req.user._id 
        }).populate('creator_id', 'username');

        res.json({ contests });

    } catch (error) {
        console.error('Get enrolled contests error:', error);
        res.status(500).json({ 
            message: 'Server error fetching enrolled contests' 
        });
    }
});


router.get('/my/created', authMiddleware, async (req, res) => {
    try {
        const contests = await Contest.find({ 
            creator_id: req.user._id 
        });

        res.json({ contests });

    } catch (error) {
        console.error('Get created contests error:', error);
        res.status(500).json({ 
            message: 'Server error fetching created contests' 
        });
    }
});


router.get('/public/all', authMiddleware, async (req, res) => {
    try {
        const contests = await Contest.find({ 
            isPublic: true 
        })
        .populate('creator_id', 'username')
        .sort({ start_time: -1 }); 

        
        const now = new Date();
        const upcoming = [];
        const live = [];
        const past = [];

        contests.forEach(contest => {
            const start = new Date(contest.start_time);
            const end = new Date(contest.end_time);
            const isEnrolled = contest.participants.includes(req.user._id);

            const contestData = {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                creator: contest.creator_id.username,
                start_time: contest.start_time,
                end_time: contest.end_time,
                duration: contest.duration,
                problemCount: contest.problems.length,
                participantCount: contest.participants.length,
                isEnrolled
            };

            if (now < start) {
                upcoming.push(contestData);
            } else if (now >= start && now <= end) {
                live.push(contestData);
            } else {
                past.push(contestData);
            }
        });

        res.json({ 
            upcoming,
            live,
            past
        });

    } catch (error) {
        console.error('Get public contests error:', error);
        res.status(500).json({ 
            message: 'Server error fetching public contests' 
        });
    }
});


router.post('/enroll-by-id/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        
        const contest = await Contest.findById(contestId);

        if (!contest) {
            return res.status(404).json({ 
                message: 'Contest not found' 
            });
        }

        
        if (!contest.isPublic) {
            return res.status(403).json({ 
                message: 'This contest is private. Please use the contest code to join.' 
            });
        }

        
        if (contest.participants.includes(req.user._id)) {
            return res.status(400).json({ 
                message: 'You are already enrolled in this contest' 
            });
        }

        if (new Date() > contest.end_time) {
            return res.status(400).json({ 
                message: 'This contest has already ended' 
            });
        }

        
        contest.participants.push(req.user._id);
        await contest.save();

        const participation = new Participation({
            contest_id: contest._id,
            user_id: req.user._id,
            leetcode_username: req.user.leetcode_username,
            problem_progress: contest.problems.map(p => ({
                slug: p.slug,
                status: 'PENDING',
                fail_count: 0
            }))
        });

        await participation.save();

        res.json({
            message: 'Successfully enrolled in contest',
            contest: {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                start_time: contest.start_time,
                end_time: contest.end_time
            }
        });

    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ 
            message: 'Server error during enrollment' 
        });
    }
});

module.exports = router;
