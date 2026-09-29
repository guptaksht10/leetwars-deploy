const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;


const callOpenRouter = async (messages, systemPrompt = '') => {
    try {
        const messagesWithSystem = systemPrompt 
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b:free',
                messages: messagesWithSystem,
                reasoning:{ enabled: true }
            })
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('OpenRouter API Errorr:', error);
            throw new Error('API request failed');
        }

        const result = await response.json();
        return result.choices[0].message.content;

    } catch (error) {
        console.error('OpenRouter API Error:', error.message);
        throw new Error('Failed to get response from AI bot');
    }
};



const analyzeProgress = async (userStats) => {
    const { solvedStats, totalProblems, tagStats, contestRanking } = userStats;

    const systemPrompt = 'You are a helpful LeetCode coaching AI assistant. Provide concise, motivating feedback.';

    const userPrompt = `Analyze this user's LeetCode progress:

Stats:
- Easy: ${solvedStats.easy}/${totalProblems.easy} solved
- Medium: ${solvedStats.medium}/${totalProblems.medium} solved
- Hard: ${solvedStats.hard}/${totalProblems.hard} solved
- Contest Rating: ${contestRanking?.rating || 'Not participated'}
- Top Topics: ${tagStats?.slice(0, 5).map(t => `${t.tagName} (${t.problemsSolved})`).join(', ')}

Provide:
1. 2-3 strengths
2. 2-3 areas to improve
3. 3 specific actionable recommendations
4. Overall assessment

Keep it concise and motivating.`;

    const messages = [{ role: 'user', content: userPrompt }];

    return await callOpenRouter(messages, systemPrompt);
};


const generateRoast = async (userStats, severity = 'brutal') => {
    const { solvedStats, totalProblems, tagStats, contestRanking } = userStats;

    const totalSolved = solvedStats.easy + solvedStats.medium + solvedStats.hard;
    const easyPercent = ((solvedStats.easy / totalProblems.easy) * 100).toFixed(1);
    const mediumPercent = ((solvedStats.medium / totalProblems.medium) * 100).toFixed(1);
    const hardPercent = ((solvedStats.hard / totalProblems.hard) * 100).toFixed(1);

    let intensityPrompt = '';
    if (severity === 'mild') {
        intensityPrompt = `Be playful and light-hearted. Use gentle teasing like a friend would. 
Include coding memes and relatable references. Make it funny but wholesome.
Length: 4-5 sentences with emojis.`;
    } else if (severity === 'medium') {
        intensityPrompt = `Go SAVAGE but hilarious! Use Gen-Z slang, coding culture references, and brutal honesty.
Think: "Your code is giving 'copy-paste from Stack Overflow' energy "
Be witty, use comparisons, and roast their weak spots HARD. Make them laugh while crying.
Include at least 2-3 specific roasts about their stats.
Length: 6-8 sentences with plenty of emojis and slang (fr, ngl, bro, bestie, etc).`;
    } else {
        intensityPrompt = `ABSOLUTELY UNHINGED SAVAGE MODE!  
Go FULL ROAST - no mercy, maximum chaos, peak comedy!
Use:
- Gen-Z slang (fr, ngl, bestie, bro, sis, deadass, cap, bussin, mid, etc)
- Coding memes (skill issue, L + ratio, touch grass, "it's giving...", etc)
- Brutal comparisons (slower than Internet Explorer, easier than FizzBuzz, etc)
- Personal callouts based on their stats
- Exaggerated reactions ()

Roast EVERYTHING: their easy problem addiction, contest avoidance, hard problem fear, favorite topics, etc.
Make it SO savage they screenshot it to show their friends.
BUT end with genuine motivation that hits different.
Length: 8-12 sentences, LOADED with emojis and personality.`;
    }

    const systemPrompt = `You are the most SAVAGE roast bot for LeetCode users. Your roasts are legendary - brutal, hilarious, and oddly motivating. 
You understand coding culture, Gen-Z humor, and how to roast someone so hard they can't help but laugh and improve.
Use modern slang, memes, and relatable references. Make every roast unique and personal based on their stats.`;

    const userPrompt = `ROAST this LeetCode user based on their stats:

 Stats Breakdown:
- Total Solved: ${totalSolved} problems
- Easy: ${solvedStats.easy}/${totalProblems.easy} (${easyPercent}%) 
- Medium: ${solvedStats.medium}/${totalProblems.medium} (${mediumPercent}%)
- Hard: ${solvedStats.hard}/${totalProblems.hard} (${hardPercent}%)
- Contest Rating: ${contestRanking?.rating || 'Never participated (scared much? )'}
- Favorite Topics: ${tagStats?.slice(0, 3).map(t => t.tagName).join(', ') || 'None (yikes)'}

${intensityPrompt}

IMPORTANT: 
- Be SPECIFIC about their stats (call out low percentages, easy problem addiction, contest avoidance, etc)
- Use comparisons and exaggerations for comedy
- Include emojis throughout ( etc)
- End with a motivational challenge that actually inspires them
- Make it feel personal and relatable, not generic`;

    const messages = [{ role: 'user', content: userPrompt }];

    return await callOpenRouter(messages, systemPrompt);
};


const chatWithBot = async (userMessage, userStats, conversationHistory = []) => {
    const { solvedStats, totalProblems, tagStats, contestRanking } = userStats;

    const systemPrompt = `You are a helpful LeetCode coaching AI assistant. You have access to the user's stats:
- Easy: ${solvedStats.easy}/${totalProblems.easy}
- Medium: ${solvedStats.medium}/${totalProblems.medium}
- Hard: ${solvedStats.hard}/${totalProblems.hard}
- Contest Rating: ${contestRanking?.rating || 'Not participated'}
- Strong Topics: ${tagStats?.slice(0, 5).map(t => t.tagName).join(', ')}

IMPORTANT RULES:
1. ONLY answer questions related to:
   - LeetCode problems, progress, and statistics
   - Coding, algorithms, and data structures
   - Programming concepts and problem-solving strategies
   - Contest preparation and competitive programming
   - This platform (LeetWars) and its features
   
2. If the user asks about ANYTHING ELSE (politics, sports, general knowledge, personal advice, etc.), respond with:
   "I'm sorry, but I can only help with LeetCode-related questions, coding problems, algorithms, and platform features. Please ask me something related to your coding journey! "

3. Be encouraging, specific, and helpful for on-topic questions.
4. Use the user's stats to provide personalized advice.`;

    const messages = [
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];

    return await callOpenRouter(messages, systemPrompt);
};


const getImprovementSuggestions = async (userStats) => {
    const { solvedStats, totalProblems, tagStats } = userStats;

    
    const weakTags = tagStats?.filter(t => t.problemsSolved < 10).slice(0, 5) || [];
    
    
    const strongTags = tagStats?.filter(t => t.problemsSolved >= 20).slice(0, 3) || [];

    const systemPrompt = 'You are a LeetCode study plan expert. Provide specific, actionable advice.';

    const userPrompt = `Create a study plan for this user:

Current Status:
- Easy: ${solvedStats.easy}/${totalProblems.easy}
- Medium: ${solvedStats.medium}/${totalProblems.medium}
- Hard: ${solvedStats.hard}/${totalProblems.hard}

Weak Areas: ${weakTags.map(t => `${t.tagName} (${t.problemsSolved})`).join(', ') || 'None identified'}
Strong Areas: ${strongTags.map(t => `${t.tagName} (${t.problemsSolved})`).join(', ') || 'Building foundation'}

Provide:
1. Top 3 topics to focus on
2. Recommended difficulty distribution
3. Specific problem types to practice
4. Weekly goal suggestion

Keep it specific and actionable.`;

    const messages = [{ role: 'user', content: userPrompt }];

    return await callOpenRouter(messages, systemPrompt);
};

module.exports = {
    analyzeProgress,
    generateRoast,
    chatWithBot,
    getImprovementSuggestions
};
