const axios = require('axios');
const cache = require('../utils/cache');

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

const RECENT_SUBMISSION_QUERY = `
  query getRecentSubmissions($username: String!, $limit: Int) {
    recentSubmissionList(username: $username, limit: $limit) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

const PROBLEM_DATA_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      title
      difficulty
      topicTags {
        name
      }
    }
  }
`;

const PROBLEMSET_QUESTION_LIST = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        questionId
        title
        titleSlug
        difficulty
        topicTags {
          name
        }
      }
    }
  }
`;

const USER_PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        realName
        aboutMe
        countryName
        skillTags
        starRating
      }
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      topPercentage
    }
    allQuestionsCount {
      difficulty
      count
    }
  }
`;

const USER_SOLVED_PROBLEMS_QUERY = `
  query userProblemsSolved($username: String!) {
    matchedUser(username: $username) {
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
      tagProblemCounts {
        advanced {
          tagName
          tagSlug
          problemsSolved
        }
        intermediate {
          tagName
          tagSlug
          problemsSolved
        }
        fundamental {
          tagName
          tagSlug
          problemsSolved
        }
      }
    }
  }
`;

const USER_CONTEST_HISTORY_QUERY = `
  query userContestRankingInfo($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      totalParticipants
      topPercentage
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      ranking
      trendDirection
      problemsSolved
      totalProblems
      finishTimeInSeconds
      contest {
        title
        startTime
      }
    }
  }
`;

const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://leetcode.com/'
};


const retryWithBackoff = async (fn, maxRetries = 5, baseDelay = 2000) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRetryable = error.response?.status === 504 || 
                                error.response?.status === 429 || 
                                error.response?.status === 503 ||
                                error.code === 'ECONNABORTED' ||
                                error.code === 'ETIMEDOUT';
            
            if (!isRetryable || attempt === maxRetries - 1) {
                throw error;
            }
            
            
            const delay = baseDelay * Math.pow(2, attempt);
            const jitter = delay * (0.75 + Math.random() * 0.5); 
            console.log(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(jitter)}ms...`);
            await new Promise(resolve => setTimeout(resolve, jitter));
        }
    }
};


const getRecentSubmissions = async (username, limit = 20) => {
    try {
        const response = await retryWithBackoff(async () => {
            return axios.post(LEETCODE_API_ENDPOINT, {
                query: RECENT_SUBMISSION_QUERY,
                variables: { username, limit }
            }, { 
                headers,
                timeout: 15000 
            });
        });

        if (response.data.errors) {
            throw new Error('LeetCode API Error: ' + JSON.stringify(response.data.errors));
        }

        return response.data.data.recentSubmissionList || [];
    } catch (error) {
        throw new Error('Failed to fetch submissions: ' + error.message);
    }
};


const getProblemData = async (titleSlug) => {
    try {
        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: PROBLEM_DATA_QUERY,
            variables: { titleSlug }
        }, { headers });

        if (response.data.errors) {
            throw new Error('LeetCode API Error: ' + JSON.stringify(response.data.errors));
        }

        return response.data.data.question;
    } catch (error) {
        throw new Error('Failed to fetch problem data: ' + error.message);
    }
};


const validateLeetCodeUsername = async (username) => {
    try {
        
        const profile = await getUserProfile(username);
        
        
        if (!profile || !profile.username) {
            return false;
        }
        
        
        if (profile.username.toLowerCase() !== username.toLowerCase()) {
            return false;
        }
        
        return true; 
    } catch (error) {
        console.error(`Failed to validate LeetCode username ${username}:`, error.message);
        return false;
    }
};


const searchProblemsOnLeetCode = async (filters = {}) => {
    try {
        const { difficulty, tags, searchKeywords, limit = 50 } = filters;
        
        console.log('Building LeetCode API query...');
        console.log('Difficulty:', difficulty || 'none');
        console.log('Tags:', tags || 'none');
        console.log('Keywords:', searchKeywords || 'none');
        
        
        const apiFilters = {};
        
        if (difficulty) {
            apiFilters.difficulty = difficulty.toUpperCase();
        }
        
        if (tags && tags.length > 0) {
            apiFilters.tags = Array.isArray(tags) ? tags : [tags];
        }
        
        if (searchKeywords) {
            apiFilters.searchKeywords = searchKeywords;
        }

        console.log('API Filters:', JSON.stringify(apiFilters));
        console.log('Calling LeetCode API...');

        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: PROBLEMSET_QUESTION_LIST,
            variables: {
                categorySlug: "",
                limit: limit,
                skip: 0,
                filters: apiFilters
            }
        }, { headers });

        console.log('API Response received');

        if (response.data.errors) {
            console.error('API returned errors:', JSON.stringify(response.data.errors));
            throw new Error('LeetCode API Error: ' + JSON.stringify(response.data.errors));
        }

        if (!response.data.data || !response.data.data.problemsetQuestionList) {
            console.error('Unexpected response structure:', JSON.stringify(response.data));
            throw new Error('Unexpected API response structure');
        }

        const questions = response.data.data.problemsetQuestionList.questions || [];
        console.log(`Parsed ${questions.length} questions from API`);
        
        
        const transformed = questions.map(q => ({
            questionId: q.questionId,
            title: q.title,
            title_slug: q.titleSlug,
            difficulty: q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase(), 
            tags: q.topicTags.map(t => t.name)
        }));

        console.log(`Transformed ${transformed.length} problems`);
        return transformed;

    } catch (error) {
        console.error('searchProblemsOnLeetCode error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data).substring(0, 500));
        }
        throw new Error('Failed to search LeetCode: ' + error.message);
    }
};


const getUserProfile = async (username) => {
    try {
        
        const cacheKey = `leetcode_profile_${username}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(`Cache hit for profile: ${username}`);
            return cached;
        }

        console.log(`Fetching LeetCode profile for: ${username}`);

        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: USER_PROFILE_QUERY,
            variables: { username }
        }, { headers });

        if (response.data.errors) {
            throw new Error('LeetCode API Error: ' + JSON.stringify(response.data.errors));
        }

        const data = response.data.data;
        
        if (!data.matchedUser) {
            throw new Error('User not found');
        }

        
        const solvedStats = {};
        if (data.matchedUser.submitStats && data.matchedUser.submitStats.acSubmissionNum) {
            data.matchedUser.submitStats.acSubmissionNum.forEach(item => {
                solvedStats[item.difficulty] = item.count;
            });
        }

        
        const totalProblems = {};
        if (data.allQuestionsCount) {
            data.allQuestionsCount.forEach(item => {
                totalProblems[item.difficulty] = item.count;
            });
        }
        console.log(`Profile fetched successfully`);

        const result = {
            username: data.matchedUser.username,
            profile: data.matchedUser.profile || {},
            solvedStats: {
                easy: solvedStats['Easy'] || 0,
                medium: solvedStats['Medium'] || 0,
                hard: solvedStats['Hard'] || 0,
                total: (solvedStats['Easy'] || 0) + (solvedStats['Medium'] || 0) + (solvedStats['Hard'] || 0)
            },
            totalProblems: {
                easy: totalProblems['Easy'] || 0,
                medium: totalProblems['Medium'] || 0,
                hard: totalProblems['Hard'] || 0,
                total: (totalProblems['Easy'] || 0) + (totalProblems['Medium'] || 0) + (totalProblems['Hard'] || 0)
            },
            contestRanking: data.userContestRanking || null
        };

        
        cache.set(cacheKey, result, 9000);
        console.log(` Cached profile for: ${username}`);

        return result;

    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        throw new Error('Failed to fetch user profile: ' + error.message);
    }
};


const getUserSolvedByTags = async (username) => {
    try {
        
        const cacheKey = `leetcode_tags_${username}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(` Cache hit for tags: ${username}`);
            return cached;
        }

        console.log(`Fetching tag stats for: ${username}`);

        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: USER_SOLVED_PROBLEMS_QUERY,
            variables: { username }
        }, { headers });

        if (response.data.errors) {
            throw new Error('LeetCode API Error: ' + JSON.stringify(response.data.errors));
        }

        const data = response.data.data;

        if (!data.matchedUser) {
            throw new Error('User not found');
        }

        
        const allTags = [];
        const tagCounts = data.matchedUser.tagProblemCounts;

        if (tagCounts) {
            if (tagCounts.advanced) allTags.push(...tagCounts.advanced);
            if (tagCounts.intermediate) allTags.push(...tagCounts.intermediate);
            if (tagCounts.fundamental) allTags.push(...tagCounts.fundamental);
        }

        
        allTags.sort((a, b) => b.problemsSolved - a.problemsSolved);

        console.log(`Tag stats fetched: ${allTags.length} tags`);

        
        cache.set(cacheKey, allTags, 9000);
        console.log(` Cached tags for: ${username}`);

        return allTags;

    } catch (error) {
        console.error('Error fetching tag stats:', error.message);
        throw new Error('Failed to fetch tag stats: ' + error.message);
    }
};


const getUserContestHistory = async (username) => {
    try {
        
        const cacheKey = `leetcode_contests_${username}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(`Cache hit for contests: ${username}`);
            return cached;
        }

        console.log(`Fetching contest history for: ${username}`);

        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: USER_CONTEST_HISTORY_QUERY,
            variables: { username }
        }, { headers });

        if (response.data.errors) {
            throw new Error('LeetCode API Error: ' + JSON.stringify(response.data.errors));
        }

        const data = response.data.data;

        if (!data.userContestRanking) {
            
            const emptyResult = {
                contestRanking: null,
                contestHistory: []
            };
            cache.set(cacheKey, emptyResult, 9000);
            return emptyResult;
        }

        const history = data.userContestRankingHistory || [];
        
        
        const attendedContests = history
            .filter(contest => contest.attended)
            .map(contest => ({
                rating: Math.round(contest.rating),
                ranking: contest.ranking,
                trendDirection: contest.trendDirection,
                problemsSolved: contest.problemsSolved,
                totalProblems: contest.totalProblems,
                contestTitle: contest.contest.title,
                contestDate: new Date(contest.contest.startTime * 1000).toLocaleDateString()
            }));

        console.log(`Contest history fetched: ${attendedContests.length} contests`);

        const result = {
            contestRanking: data.userContestRanking,
            contestHistory: attendedContests
        };

        
        cache.set(cacheKey, result, 9000);
        console.log(` Cached contests for: ${username}`);

        return result;

    } catch (error) {
        console.error('Error fetching contest history:', error.message);
        throw new Error('Failed to fetch contest history: ' + error.message);
    }
};

module.exports = {
    getRecentSubmissions,
    getProblemData,
    validateLeetCodeUsername,
    searchProblemsOnLeetCode,
    getUserProfile,
    getUserSolvedByTags,
    getUserContestHistory
};

