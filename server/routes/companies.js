const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const GoogleSheetsAPIManager = require('../services/googleSheetsService');


router.get('/list', authMiddleware, async (req, res) => {
    try {
        console.log('\n Companies List Request');
        
        const companies = await GoogleSheetsAPIManager.getCompanies();
        
        
        const companiesWithCount = companies.map(company => ({
            name: company.name,
            displayName: company.displayName,
            problemCount: company.endRow - company.startRow + 1
        }));

        
        companiesWithCount.sort((a, b) => a.displayName.localeCompare(b.displayName));

        console.log(` Returning ${companiesWithCount.length} companies\n`);
        
        res.json({
            companies: companiesWithCount,
            count: companiesWithCount.length
        });

    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
            message: 'Failed to fetch companies',
            error: error.message
        });
    }
});


router.get('/:companyName/problems', authMiddleware, async (req, res) => {
    try {
        const { companyName } = req.params;
        const { difficulty } = req.query;

        console.log(`\n Company Problems Request: "${companyName}"`);
        if (difficulty) {
            console.log(`   Filter: Difficulty = ${difficulty}`);
        }

        
        let problems = await GoogleSheetsAPIManager.getCompanyProblems(companyName);

        
        if (difficulty && difficulty !== 'all') {
            const originalCount = problems.length;
            problems = problems.filter(p => p.difficulty === difficulty);
            console.log(`   Filtered: ${originalCount} -> ${problems.length} problems`);
        }

        console.log(` Returning ${problems.length} problems for "${companyName}"\n`);

        res.json({
            problems,
            count: problems.length,
            companyName: companyName
        });

    } catch (error) {
        console.error(` Error fetching problems for "${req.params.companyName}":`, error);
        
        
        const statusCode = error.message.includes('not found') ? 404 : 500;
        
        res.status(statusCode).json({
            message: error.message,
            error: error.message
        });
    }
});


router.post('/cache/clear', authMiddleware, async (req, res) => {
    try {
        console.log('\n  Cache Clear Request');
        
        GoogleSheetsAPIManager.clearCache();
        
        console.log(' Cache cleared successfully\n');
        
        res.json({
            message: 'Cache cleared successfully'
        });

    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            message: 'Failed to clear cache',
            error: error.message
        });
    }
});

module.exports = router;
