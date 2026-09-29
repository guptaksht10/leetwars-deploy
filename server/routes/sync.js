const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');
const authMiddleware = require('../middleware/auth');
const { getRecentSubmissions } = require('../services/leetcodeService');


router.post('/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        
        let contest;
        if (contestId.match(/^[0-9a-fA-F]{24}$/)) {
            contest = await Contest.findById(contestId);
        }
        if (!contest) {
            contest = await Contest.findOne({ unique_code: contestId });
        }

        if (!contest) {
            return res.status(404).json({
                message: 'Contest not found'
            });
        }

        
        const participation = await Participation.findOne({
            contest_id: contest._id,
            user_id: req.user._id
        });

        if (!participation) {
            return res.status(404).json({
                message: 'You are not enrolled in this contest'
            });
        }

        
        if (participation.last_sync) {
            const timeSinceLastSync = Date.now() - new Date(participation.last_sync).getTime();
            if (timeSinceLastSync < 30000) {
                return res.status(429).json({
                    message: `Please wait ${Math.ceil((30000 - timeSinceLastSync) / 1000)} seconds before syncing again`
                });
            }
        }

        
        let submissions;
        try {
            submissions = await getRecentSubmissions(req.user.leetcode_username, 50);
        } catch (error) {
            return res.status(500).json({
                message: 'Failed to fetch submissions from LeetCode. Please ensure your profile is public.'
            });
        }

        
        const getScoreForDifficulty = (difficulty) => {
            if (difficulty === 'Easy') return 3;
            if (difficulty === 'Medium') return 4;
            if (difficulty === 'Hard') return 6;
            return 1; 
        };

        
        let scoreChanged = false;
        const contestStartTime = new Date(contest.start_time).getTime() / 1000;
        const contestEndTime = new Date(contest.end_time).getTime() / 1000;

        console.log('=== SYNC DEBUG ===');
        console.log('Contest:', contest.name);
        console.log('Contest time range:', new Date(contestStartTime * 1000), 'to', new Date(contestEndTime * 1000));
        console.log('Total submissions fetched:', submissions.length);
        console.log('Submissions:', submissions.map(s => ({ slug: s.titleSlug, status: s.statusDisplay, time: new Date(parseInt(s.timestamp) * 1000) })));

        
        // --- Compute updates in memory, then apply atomically ---
        let newScore = participation.score;
        let newTotalPenalty = participation.total_penalty;

        for (const problem of contest.problems) {
            const slug = problem.slug;

            console.log('Processing problem:', slug);

            
            const problemProgress = participation.problem_progress.find(p => p.slug === slug);

            if (!problemProgress) {
                console.log('  No progress entry for:', slug);
                continue;
            }

            
            if (problemProgress.status === 'ACCEPTED') {
                console.log('  Already solved:', slug);
                continue;
            }

            
            const problemSubmissions = submissions.filter(sub =>
                sub.titleSlug === slug &&
                parseInt(sub.timestamp) >= contestStartTime &&
                parseInt(sub.timestamp) <= contestEndTime
            );

            console.log('  Found', problemSubmissions.length, 'submissions for', slug);

            
            problemSubmissions.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

            
            let failCount = 0;
            let solvedAt = null;

            for (const sub of problemSubmissions) {
                if (sub.statusDisplay === 'Accepted') {
                    solvedAt = new Date(parseInt(sub.timestamp) * 1000);
                    break;
                } else {
                    failCount++;
                }
            }

            
            if (solvedAt) {
                
                const penalty = failCount * 5;

                
                const wasAlreadyAccepted = problemProgress.status === 'ACCEPTED';

                problemProgress.status = 'ACCEPTED';
                problemProgress.solved_at = solvedAt;
                problemProgress.fail_count = failCount;
                problemProgress.penalty = penalty;

                
                if (!wasAlreadyAccepted) {
                    
                    const fullProblem = await Contest.findById(contest._id).populate('problems.problem_id');
                    const problemWithDetails = fullProblem.problems.find(p => p.slug === slug);
                    const difficulty = problemWithDetails?.problem_id?.difficulty || 'Medium';

                    newScore += getScoreForDifficulty(difficulty);
                    newTotalPenalty += penalty;
                    scoreChanged = true;
                    console.log('  Score awarded for:', slug, 'difficulty:', difficulty, 'new score:', newScore);
                }
            } else if (failCount > 0) {
                problemProgress.fail_count = failCount;
                problemProgress.status = 'FAIL';
                console.log('  Updated FAIL status:', slug, 'fail_count:', failCount);
            }
        }

        console.log('=== SAVING PARTICIPATION (ATOMIC) ===');
        console.log('Score:', newScore);
        console.log('Total Penalty:', newTotalPenalty);
        console.log('Problem Progress:', participation.problem_progress.map(p => ({
            slug: p.slug,
            status: p.status,
            fail_count: p.fail_count
        })));

        
        
        const computeFinishTime = (participation, contestStartMs) => {
            const acceptedProblems = participation.problem_progress.filter(p => p.status === 'ACCEPTED');
            if (acceptedProblems.length === 0) return 0;
            const lastSolvedMs = Math.max(...acceptedProblems.map(p => new Date(p.solved_at).getTime()));
            const timeFromStartSecs = (lastSolvedMs - contestStartMs) / 1000;
            const failPenaltySecs = acceptedProblems.reduce((sum, p) => sum + (p.fail_count || 0), 0) * 5 * 60;
            return Math.floor(timeFromStartSecs + failPenaltySecs);
        };

        const newFinishTime = computeFinishTime(participation, new Date(contest.start_time).getTime());

        // Atomic update — overwrites all computed fields in a single operation
        await Participation.findOneAndUpdate(
            { _id: participation._id },
            {
                $set: {
                    problem_progress: participation.problem_progress,
                    score: newScore,
                    total_penalty: newTotalPenalty,
                    finish_time: newFinishTime,
                    last_sync: new Date()
                }
            }
        );

        console.log('Participation saved successfully (atomic)');

        
        if (scoreChanged) {
            const allParticipations = await Participation.find({ contest_id: contest._id })
                .sort({ score: -1, finish_time: 1 }); 

            for (let i = 0; i < allParticipations.length; i++) {
                const p = allParticipations[i];
                const newRank = i + 1;
                if (p.rank !== newRank) {
                    p.rank = newRank;
                    await p.save();
                }
            }
        }

        res.json({
            message: scoreChanged ? 'Score updated successfully!' : 'No new submissions found',
            participation: {
                score: participation.score,
                total_penalty: participation.total_penalty,
                problem_progress: participation.problem_progress
            }
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            message: 'Server error during sync'
        });
    }
});


router.get('/leaderboard/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        
        let contest;
        if (contestId.match(/^[0-9a-fA-F]{24}$/)) {
            contest = await Contest.findById(contestId);
        }
        if (!contest) {
            contest = await Contest.findOne({ unique_code: contestId });
        }

        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        
        const participations = await Participation.find({ contest_id: contest._id })
            .populate('user_id', 'username leetcode_username')
            .sort({ score: -1, finish_time: 1 }); 

        const leaderboard = participations.map((p, index) => {
            
            const acceptedProblems = p.problem_progress.filter(prob => prob.status === 'ACCEPTED');
            let totalTime = 0;

            if (acceptedProblems.length > 0) {
                
                const lastSolvedTime = Math.max(...acceptedProblems.map(prob =>
                    new Date(prob.solved_at).getTime()
                ));

                const contestStart = new Date(contest.start_time).getTime();
                const timeDiff = (lastSolvedTime - contestStart) / 1000; 
                const penaltyTime = p.total_penalty * 60; 

                totalTime = Math.floor(timeDiff + penaltyTime);
            }

            
            const totalAttempts = p.problem_progress.reduce((sum, prob) =>
                sum + (prob.fail_count || 0), 0
            );

            return {
                rank: index + 1,
                username: p.user_id?.username || 'Unknown',
                leetcode_username: p.user_id?.leetcode_username || 'Unknown',
                score: p.score,
                penalty: Math.round(p.total_penalty * 100) / 100,
                finish_time: p.finish_time || 0, 
                total_time: p.finish_time || 0,  
                solved: acceptedProblems.length,
                attempts: totalAttempts,
                problem_progress: p.problem_progress
            };
        });

        res.json({ leaderboard });

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({
            message: 'Server error fetching leaderboard'
        });
    }
});


router.post('/sync-all/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        
        let contest;
        if (contestId.match(/^[0-9a-fA-F]{24}$/)) {
            contest = await Contest.findById(contestId).populate('problems.problem_id');
        }
        if (!contest) {
            contest = await Contest.findOne({ unique_code: contestId }).populate('problems.problem_id');
        }

        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        
        if (contest.finalized) {
            return res.status(400).json({
                message: 'Contest has been finalized. Rankings are locked.'
            });
        }

        const now = Date.now();
        const contestEndTime = new Date(contest.end_time).getTime();
        const gracePeriodMs = 60 * 60 * 1000; 
        const isGracePeriod = now > contestEndTime && now <= (contestEndTime + gracePeriodMs);
        const isContestEnded = now > contestEndTime;
        const isPastGracePeriod = now > (contestEndTime + gracePeriodMs);

        
        if (isPastGracePeriod) {
            
            if (!contest.finalized) {
                contest.finalized = true;
                await contest.save();
            }
            return res.status(400).json({
                message: 'Grace period has ended. Rankings are now locked.'
            });
        }

        
        if (contest.last_bulk_sync) {
            const timeSinceLastSync = now - new Date(contest.last_bulk_sync).getTime();
            const cooldownMs = 10 * 60 * 1000; 

            if (timeSinceLastSync < cooldownMs) {
                const waitTime = Math.ceil((cooldownMs - timeSinceLastSync) / 1000);
                return res.status(429).json({
                    message: `Please wait ${waitTime} seconds before syncing all again`,
                    cooldown: waitTime,
                    isGracePeriod: isGracePeriod
                });
            }
        }

        
        const participations = await Participation.find({ contest_id: contest._id })
            .populate('user_id', 'leetcode_username');

        if (participations.length === 0) {
            return res.status(404).json({ message: 'No participants found' });
        }

        let syncedCount = 0;
        let errorCount = 0;
        const User = require('../models/User');

        
        const processParticipant = async (participation) => {
            try {
                const user = participation.user_id;
                if (!user || !user.leetcode_username) {
                    console.log(`Skipping participation - no LeetCode username`);
                    return { success: true, hasChanges: false };
                }

                
                const submissions = await getRecentSubmissions(user.leetcode_username, 50);

                const contestStartTime = new Date(contest.start_time).getTime() / 1000;
                const contestEndTime = new Date(contest.end_time).getTime() / 1000;

                let hasChanges = false;

                
                for (const problem of contest.problems) {
                    const slug = problem.slug;
                    const problemProgress = participation.problem_progress.find(p => p.slug === slug);

                    if (!problemProgress || problemProgress.status === 'ACCEPTED') continue;

                    const problemSubmissions = submissions.filter(sub =>
                        sub.titleSlug === slug &&
                        parseInt(sub.timestamp) >= contestStartTime &&
                        parseInt(sub.timestamp) <= contestEndTime
                    ).sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

                    let failCount = 0;
                    let solvedAt = null;

                    for (const sub of problemSubmissions) {
                        if (sub.statusDisplay === 'Accepted') {
                            solvedAt = new Date(parseInt(sub.timestamp) * 1000);
                            break;
                        } else {
                            failCount++;
                        }
                    }

                    if (solvedAt) {
                        const penalty = failCount * 5;
                        problemProgress.status = 'ACCEPTED';
                        problemProgress.solved_at = solvedAt;
                        problemProgress.fail_count = failCount;
                        problemProgress.penalty = penalty;

                        
                        const difficulty = problem.problem_id?.difficulty || 'Medium';
                        const points = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 6;
                        participation.score += points;
                        participation.total_penalty += penalty;
                        hasChanges = true;
                    } else if (failCount > 0) {
                        problemProgress.fail_count = failCount;
                        problemProgress.status = 'FAIL';
                        hasChanges = true;
                    }
                }

                if (hasChanges) {
                    
                    const acceptedProblems = participation.problem_progress.filter(p => p.status === 'ACCEPTED');
                    let newFinishTime = 0;
                    if (acceptedProblems.length > 0) {
                        const contestStartMs = new Date(contest.start_time).getTime();
                        const lastSolvedMs = Math.max(...acceptedProblems.map(p => new Date(p.solved_at).getTime()));
                        const timeFromStartSecs = (lastSolvedMs - contestStartMs) / 1000;
                        const failPenaltySecs = acceptedProblems.reduce((sum, p) => sum + (p.fail_count || 0), 0) * 5 * 60;
                        newFinishTime = Math.floor(timeFromStartSecs + failPenaltySecs);
                    }

                    // Atomic update — overwrites all computed fields in a single operation
                    await Participation.findOneAndUpdate(
                        { _id: participation._id },
                        {
                            $set: {
                                problem_progress: participation.problem_progress,
                                score: participation.score,
                                total_penalty: participation.total_penalty,
                                finish_time: newFinishTime,
                                last_sync: new Date()
                            }
                        }
                    );
                }

                return { success: true, hasChanges };
            } catch (error) {
                console.error(`Error syncing ${participation.user_id?.leetcode_username}:`, error.message);
                return { success: false, hasChanges: false };
            }
        };

        const BATCH_SIZE = 5;
        for (let i = 0; i < participations.length; i += BATCH_SIZE) {
            const batch = participations.slice(i, i + BATCH_SIZE);

            
            const results = await Promise.all(batch.map(p => processParticipant(p)));

            
            results.forEach(res => {
                if (!res.success) {
                    errorCount++;
                } else if (res.hasChanges) {
                    syncedCount++;
                }
            });

            
            if (i + BATCH_SIZE < participations.length) {
                const delay = 1500 + Math.random() * 1000; 
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        
        contest.last_bulk_sync = new Date();
        await contest.save();

        
        const allParticipations = await Participation.find({ contest_id: contest._id })
            .sort({ score: -1, finish_time: 1 }); 

        for (let i = 0; i < allParticipations.length; i++) {
            const participation = allParticipations[i];
            const newRank = i + 1;
            if (participation.rank !== newRank) {
                participation.rank = newRank;
                await participation.save();
            }
        }
        console.log(`Updated ranks for ${allParticipations.length} participants`);

        
        const nowAfterSync = Date.now();
        const endTimeCheck = new Date(contest.end_time).getTime();
        const gracePeriodCheck = 60 * 60 * 1000;
        const isInGracePeriod = nowAfterSync > endTimeCheck && nowAfterSync <= (endTimeCheck + gracePeriodCheck);
        const contestEnded = nowAfterSync > endTimeCheck;

        res.json({
            message: `Synced ${syncedCount} participants successfully`,
            synced: syncedCount,
            errors: errorCount,
            total: participations.length,
            isGracePeriod: isInGracePeriod,
            contestEnded: contestEnded,
            finalized: contest.finalized
        });

    } catch (error) {
        console.error('Sync all error:', error);
        res.status(500).json({ message: 'Server error during bulk sync' });
    }
});

module.exports = router;
