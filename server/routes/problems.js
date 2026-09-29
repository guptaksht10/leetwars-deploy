const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const authMiddleware = require('../middleware/auth');
const { searchProblemsOnLeetCode } = require('../services/leetcodeService');


router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { query, difficulty, tags, page = 1, limit = 20 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        console.log('\n Problem Search Request:');
        console.log('   Query:', query || 'none');
        console.log('   Difficulty:', difficulty || 'none');
        console.log('   Tags:', tags || 'none');
        console.log('   Page:', pageNum, '| Limit:', limitNum);

        
        let filter = {};

        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { title_slug: { $regex: query, $options: 'i' } }
            ];
        }

        if (difficulty) {
            filter.difficulty = difficulty;
        }

        if (tags) {
            const tagArray = tags.split(',').map(t => t.trim());
            filter.tags = { $in: tagArray };
        }

        console.log('   DB Filter:', JSON.stringify(filter));
        
        
        const totalCount = await Problem.countDocuments(filter);
        
        
        let problems = await Problem.find(filter)
            .skip(skip)
            .limit(limitNum)
            .sort({ questionId: 1 });
            
        console.log(`Found ${problems.length} problems (Page ${pageNum}/${Math.ceil(totalCount / limitNum)}, Total: ${totalCount})`);

        
        if (problems.length === 0 && pageNum === 1) {
            console.log('No local results, searching LeetCode API...');
            
            try {
                const leetcodeResults = await searchProblemsOnLeetCode({
                    difficulty,
                    tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
                    searchKeywords: query,
                    limit: limitNum
                });

                console.log(`LeetCode API returned ${leetcodeResults.length} problems`);

                
                if (leetcodeResults.length > 0) {
                    console.log(`Caching ${leetcodeResults.length} problems to database...`);
                    
                    setImmediate(async () => {
                        try {
                            let cached = 0;
                            for (const problem of leetcodeResults) {
                                await Problem.findOneAndUpdate(
                                    { title_slug: problem.title_slug },
                                    problem,
                                    { upsert: true, new: true }
                                );
                                cached++;
                            }
                            console.log(`Successfully cached ${cached} problems`);
                        } catch (error) {
                            console.error('Error caching problems:', error.message);
                        }
                    });
                }

                problems = leetcodeResults;
            } catch (error) {
                console.error('LeetCode API search failed:', error.message);
                console.error('   Full error:', error);
                
                return res.json({ 
                    problems: [], 
                    source: 'none',
                    message: 'No results found in local database and LeetCode API search failed',
                    error: error.message,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    }
                });
            }
        }

        const totalPages = Math.ceil(totalCount / limitNum);
        const hasMore = pageNum < totalPages;

        console.log(`Returning ${problems.length} problems\n`);
        res.json({ 
            problems,
            source: problems.length > 0 ? (problems[0]._id ? 'database' : 'leetcode') : 'none',
            count: problems.length,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages,
                hasMore
            }
        });

    } catch (error) {
        console.error('Problem search error:', error);
        res.status(500).json({ 
            message: 'Server error searching problems',
            error: error.message
        });
    }
});


router.get('/:slug', authMiddleware, async (req, res) => {
    try {
        const problem = await Problem.findOne({ title_slug: req.params.slug });

        if (!problem) {
            return res.status(404).json({ 
                message: 'Problem not found' 
            });
        }

        res.json({ problem });

    } catch (error) {
        console.error('Get problem error:', error);
        res.status(500).json({ 
            message: 'Server error fetching problem' 
        });
    }
});

module.exports = router;
