const axios = require('axios');


class GoogleSheetsAPIManager {
    static API_KEY = process.env.API_KEY;
    static SHEETS_ID = process.env.SHEETS_ID ;
    static CACHE_TTL = 24 * 60 * 60 * 1000; 

    
    static companiesCache = { data: null, timestamp: null };
    static problemsCache = new Map(); 

    
    static isCacheValid(timestamp) {
        if (!timestamp) return false;
        return Date.now() - timestamp < this.CACHE_TTL;
    }

    
    static async getCompanies() {
        
        if (this.isCacheValid(this.companiesCache.timestamp)) {
            console.log('Returning companies from cache');
            return this.companiesCache.data;
        }

        console.log(' Fetching companies from Google Sheets...');
        
        try {
            const range = 'CompaniesProblem_Map!A:C';
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEETS_ID}/values/${range}?key=${this.API_KEY}`;
            
            const response = await axios.get(url);
            const rows = response.data.values;

            if (!rows || rows.length === 0) {
                throw new Error('No company data found');
            }

            
            const companies = rows.slice(1).map(row => ({
                name: row[0]?.toLowerCase().trim(),
                displayName: this.formatCompanyName(row[0]),
                startRow: parseInt(row[1]),
                endRow: parseInt(row[2])
            })).filter(company => company.name && company.startRow && company.endRow);

            
            this.companiesCache = {
                data: companies,
                timestamp: Date.now()
            };

            console.log(` Fetched ${companies.length} companies`);
            return companies;

        } catch (error) {
            console.error(' Error fetching companies:', error.message);
            
            
            if (this.companiesCache.data) {
                console.log(' Returning stale cache due to error');
                return this.companiesCache.data;
            }
            
            throw new Error(`Failed to fetch companies: ${error.message}`);
        }
    }

    
    static async getCompanyProblems(companyName) {
        const normalizedName = companyName.toLowerCase().trim();

        
        const cached = this.problemsCache.get(normalizedName);
        if (cached && this.isCacheValid(cached.timestamp)) {
            console.log(` Returning problems for "${companyName}" from cache`);
            return cached.data;
        }

        console.log(`Fetching problems for "${companyName}" from Google Sheets...`);

        try {
            
            const companies = await this.getCompanies();
            const company = companies.find(c => c.name === normalizedName);

            if (!company) {
                throw new Error(`Company "${companyName}" not found`);
            }

            
            const range = `CompaniesProblem!A${company.startRow}:I${company.endRow}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEETS_ID}/values/${range}?key=${this.API_KEY}`;
            
            const response = await axios.get(url);
            const rows = response.data.values;

            if (!rows || rows.length === 0) {
                console.log(`  No problems found for "${companyName}"`);
                return [];
            }

            
            const problems = this.parseSheetProblems(rows, normalizedName);

            
            this.problemsCache.set(normalizedName, {
                data: problems,
                timestamp: Date.now()
            });

            console.log(` Fetched ${problems.length} problems for "${companyName}"`);
            return problems;

        } catch (error) {
            console.error(` Error fetching problems for "${companyName}":`, error.message);
            
            
            const cached = this.problemsCache.get(normalizedName);
            if (cached) {
                console.log(' Returning stale cache due to error');
                return cached.data;
            }
            
            throw new Error(`Failed to fetch problems for "${companyName}": ${error.message}`);
        }
    }

    
    static parseSheetProblems(rows, companyName) {
        const problems = [];
        const seenSlugs = new Set(); 

        for (const row of rows) {
            try {
                if (!row || row.length < 8) continue;

                const leetcodeUrl = row[6]?.trim();
                if (!leetcodeUrl) continue;

                const titleSlug = this.extractSlugFromUrl(leetcodeUrl);
                if (!titleSlug) continue;

                
                if (seenSlugs.has(titleSlug)) continue;
                seenSlugs.add(titleSlug);

                const problem = {
                    title: row[4]?.trim() || 'Unknown',
                    title_slug: titleSlug,
                    difficulty: this.normalizeDifficulty(row[7]),
                    frequency: parseInt(row[1]) || 0,
                    lastAsked: row[3]?.trim() || 'Unknown',
                    acceptanceRate: this.formatAcceptanceRate(row[5]),
                    leetcodeUrl: leetcodeUrl,
                    companyName: companyName
                };

                problems.push(problem);
            } catch (error) {
                console.error('Error parsing problem row:', error.message);
                
            }
        }

        return problems;
    }

    
    static extractSlugFromUrl(url) {
        try {
            const match = url.match(/leetcode\.com\/problems\/([^\/]+)/);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
    }

    
    static formatAcceptanceRate(rate) {
        try {
            const numRate = parseFloat(rate);
            if (isNaN(numRate)) return 'N/A';
            return (numRate * 100).toFixed(2) + '%';
        } catch (error) {
            return 'N/A';
        }
    }

    
    static normalizeDifficulty(difficulty) {
        const normalized = difficulty?.trim().toLowerCase();
        if (normalized === 'easy') return 'Easy';
        if (normalized === 'medium') return 'Medium';
        if (normalized === 'hard') return 'Hard';
        return 'Medium'; 
    }

    
    static formatCompanyName(name) {
        if (!name) return '';
        return name
            .split(/[-_\s]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Clear all caches (useful for testing or manual refresh)
     */
    static clearCache() {
        this.companiesCache = { data: null, timestamp: null };
        this.problemsCache.clear();
        console.log(' Cache cleared');
    }
}

module.exports = GoogleSheetsAPIManager;
