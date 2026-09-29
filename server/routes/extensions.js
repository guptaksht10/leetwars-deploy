const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');

const getScoreForDifficulty = (difficulty) => {
  if (difficulty === 'Easy') return 3;
  if (difficulty === 'Medium') return 4;
  if (difficulty === 'Hard') return 6;
  return 1; 
};

const computeFinishTime = (participation, contestStartMs) => {
  const acceptedProblems = participation.problem_progress.filter(p => p.status === 'ACCEPTED');
  if (acceptedProblems.length === 0) return 0;
  const lastSolvedMs = Math.max(...acceptedProblems.map(p => new Date(p.solved_at).getTime()));
  const timeFromStartSecs = (lastSolvedMs - contestStartMs) / 1000;
  const failPenaltySecs = acceptedProblems.reduce((sum, p) => sum + (p.fail_count || 0), 0) * 5 * 60;
  return Math.floor(timeFromStartSecs + failPenaltySecs);
};



router.post('/submit-result', authMiddleware, async (req, res) => {

  try {
    const user = req.user;

    const {
      submissionId,
      submissionTimestampMs,
      statusMsg,
      statusCode,
      accepted,
      leetcodeUsername,
      questionId,
      titleSlug,
      payloadCheck,
      payloadDetails,
    } = req.body || {};

    const submissionIdStr = String(submissionId);

    console.log(`[EXTENSION] Received submission ${submissionId} for ${titleSlug} by ${leetcodeUsername}`);
    console.log(`[EXTENSION] Details: Accepted=${accepted}, statusCode=${statusCode}, subTime=${new Date(submissionTimestampMs).toLocaleString()}`);

    if (!submissionId || !titleSlug || !submissionTimestampMs) {
      console.log(`[EXTENSION] Rejected: Missing required fields`);
      return res.status(400).json({ message: 'submissionId, titleSlug, and submissionTimestampMs are required' });
    }

    
    if (user.leetcode_username && leetcodeUsername && user.leetcode_username.toLowerCase() !== leetcodeUsername.toLowerCase()) {
      console.log(`[EXTENSION] Ignored: Username mismatch (${user.leetcode_username} vs ${leetcodeUsername})`);
      return res.status(403).json({ message: 'Username mismatch', ignored: true });
    }

    // --- Dedup check: reject if this submissionId was already processed ---
    const alreadyProcessed = await Participation.findOne({
      user_id: user._id,
      'problem_progress': {
        $elemMatch: {
          slug: titleSlug,
          processed_submission_ids: submissionIdStr
        }
      }
    });
    if (alreadyProcessed) {
      console.log(`[EXTENSION] Duplicate: submission ${submissionId} already processed for ${titleSlug}`);
      return res.json({ ok: true, ignored: true, message: 'Submission already processed (duplicate)' });
    }

    const subTime = new Date(submissionTimestampMs);
    let processed = false;
    let ignoreReason = 'Not in any active contest';

    
    const activeParticipations = await Participation.find({ user_id: user._id }).populate('contest_id');
    console.log(`[EXTENSION] Found ${activeParticipations.length} total participations for user`);

    for (const participation of activeParticipations) {
      const contest = participation.contest_id;
      if (!contest) {
        console.log(`[EXTENSION] Skipping participation ${participation._id} because contest_id is null`);
        continue;
      }

      console.log(`[EXTENSION] Checking contest: "${contest.name}" (Code: ${contest.unique_code})`);

      
      if (subTime < new Date(contest.start_time) || subTime > new Date(contest.end_time)) {
        ignoreReason = `Submission time ${subTime.toLocaleString()} is outside contest window (${new Date(contest.start_time).toLocaleString()} to ${new Date(contest.end_time).toLocaleString()})`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      
      const problemIndex = contest.problems.findIndex(p => p.slug === titleSlug);
      if (problemIndex === -1) {
        ignoreReason = `Problem ${titleSlug} is not part of contest ${contest.name}`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      
      const problemProgress = participation.problem_progress.find(p => p.slug === titleSlug);
      if (!problemProgress) {
        ignoreReason = `No problem progress found for ${titleSlug} in contest ${contest.name}`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      
      if (problemProgress.status === 'ACCEPTED') {
        ignoreReason = `Already accepted in contest ${contest.name}`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      let scoreChanged = false;

      if (accepted) {
        // --- ACCEPTED: use atomic update with status guard ---
        const fullContest = await Contest.findById(contest._id).populate('problems.problem_id');
        const problemWithDetails = fullContest.problems.find(p => p.slug === titleSlug);
        const difficulty = problemWithDetails?.problem_id?.difficulty || 'Medium';

        const penalty = (problemProgress.fail_count || 0) * 5;
        const scoreIncrement = getScoreForDifficulty(difficulty);

        // Atomic update: only applies if status is NOT already ACCEPTED (prevents double-accept race)
        const acceptResult = await Participation.updateOne(
          {
            _id: participation._id,
            'problem_progress': {
              $elemMatch: {
                slug: titleSlug,
                status: { $ne: 'ACCEPTED' }
              }
            }
          },
          {
            $set: {
              'problem_progress.$.status': 'ACCEPTED',
              'problem_progress.$.solved_at': subTime,
              'problem_progress.$.penalty': penalty,
              last_sync: new Date()
            },
            $inc: {
              score: scoreIncrement,
              total_penalty: penalty
            },
            $push: {
              'problem_progress.$.processed_submission_ids': submissionIdStr
            }
          }
        );

        if (acceptResult.modifiedCount > 0) {
          scoreChanged = true;
          console.log(`[EXTENSION] Updated "${contest.name}": Marked ACCEPTED atomically. Penalty=${penalty}m, Score+=${scoreIncrement}`);
        } else {
          console.log(`[EXTENSION] Skipping "${contest.name}": Atomic ACCEPTED update matched 0 docs (likely already accepted by concurrent request)`);
          continue;
        }
      } else {
        // --- FAIL: use atomic $inc to prevent lost increments ---
        if (statusCode !== 20) {
          const failResult = await Participation.updateOne(
            {
              _id: participation._id,
              'problem_progress': {
                $elemMatch: {
                  slug: titleSlug,
                  status: { $ne: 'ACCEPTED' }  // don't increment fail_count after acceptance
                }
              }
            },
            {
              $inc: { 'problem_progress.$.fail_count': 1 },
              $set: {
                'problem_progress.$.status': 'FAIL',
                last_sync: new Date()
              },
              $push: {
                'problem_progress.$.processed_submission_ids': submissionIdStr
              }
            }
          );
          console.log(`[EXTENSION] Updated "${contest.name}": Marked FAIL atomically. modifiedCount=${failResult.modifiedCount}`);
        } else {
          // Compile error — still record the submissionId to prevent re-processing, but don't increment fail_count
          await Participation.updateOne(
            {
              _id: participation._id,
              'problem_progress.slug': titleSlug
            },
            {
              $push: {
                'problem_progress.$.processed_submission_ids': submissionIdStr
              }
            }
          );
          console.log(`[EXTENSION] Updated "${contest.name}": Ignored fail count (Compile Error, statusCode 20). Recorded submissionId.`);
        }
      }

      // Recompute finish_time after atomic update — need fresh data
      const updatedParticipation = await Participation.findById(participation._id);
      if (updatedParticipation) {
        const newFinishTime = computeFinishTime(updatedParticipation, new Date(contest.start_time).getTime());
        await Participation.updateOne(
          { _id: participation._id },
          { $set: { finish_time: newFinishTime } }
        );
      }

      processed = true;

      
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
        console.log(`[EXTENSION] Recalculated ranks for "${contest.name}"`);
      }
    }

    return res.json({
      ok: true,
      ignored: !processed,
      message: processed ? 'Submission processed for contest(s)' : `Submission ignored: ${ignoreReason}`,
    });
  } catch (error) {
    console.error('Extension submit-result error:', error);
    return res.status(500).json({ message: 'Server error during submit-result' });
  }
});



router.get('/active-contests', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const activeParticipations = await Participation.find({ user_id: user._id }).populate('contest_id');
    const now = new Date();

    const results = [];
    for (const p of activeParticipations) {
      const contest = p.contest_id;
      if (!contest) continue;

      
      if (now >= new Date(contest.start_time) && now <= new Date(contest.end_time)) {
        const acceptedCount = p.problem_progress.filter(prob => prob.status === 'ACCEPTED').length;
        
        const problemsList = contest.problems.map(prob => {
          const progress = p.problem_progress.find(pr => pr.slug === prob.slug);
          return {
            slug: prob.slug,
            status: progress ? progress.status : 'NOT_STARTED'
          };
        });

        results.push({
          id: contest._id,
          name: contest.name,
          score: p.score,
          total_penalty: p.total_penalty,
          accepted_count: acceptedCount,
          total_problems: contest.problems.length,
          end_time: contest.end_time,
          problems: problemsList
        });
      }
    }

    return res.json({ activeContests: results });
  } catch (error) {
    console.error('Extension active-contests error:', error);
    return res.status(500).json({ message: 'Server error fetching active contests' });
  }
});

module.exports = router;
