import { getSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Storage for the current session token (set by components that have access to session)
let cachedBackendToken: string | null = null;

// Set the backend token from NextAuth session
export const setBackendToken = (token: string | null) => {
    cachedBackendToken = token;
};

// Helper to get auth token - prioritizes NextAuth session over legacy localStorage
const getToken = async (): Promise<string | null> => {
    // First try the cached backend token (from NextAuth session)
    if (cachedBackendToken) {
        return cachedBackendToken;
    }

    // Try to get from NextAuth session
    try {
        const session = await getSession();
        if (session && (session as any).backendToken) {
            cachedBackendToken = (session as any).backendToken;
            return cachedBackendToken;
        }
    } catch {
        // Session might not be available in some contexts
    }

    // Fallback to legacy localStorage token
    if (typeof window !== 'undefined') {
        return localStorage.getItem('leetwars_token');
    }
    return null;
};

// Helper to make authenticated requests
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && token !== 'undefined' && token !== 'null' ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    return response;
}

// Generic API response handler
async function handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
    }
    return data;
}

// ==================== AUTH API ====================
export const authApi = {
    register: async (username: string, email: string, password: string, leetcode_username: string) => {
        const response = await fetchWithAuth('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, leetcode_username }),
        });
        return handleResponse<{
            message: string;
            token: string;
            user: { id: string; username: string; email: string; leetcode_username: string };
        }>(response);
    },

    login: async (email: string, password: string) => {
        const response = await fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        return handleResponse<{
            message: string;
            token: string;
            user: { id: string; username: string; email: string; leetcode_username: string };
        }>(response);
    },
};

// ==================== CONTEST API ====================
export interface Problem {
    problem_id?: {
        title?: String;
        difficulty?: String;
        _id?: String;
    };
    slug: string;
    points?: number;
    title?: string;
    difficulty?: string;
}

export interface Contest {
    id: string;
    _id?: string;
    name: string;
    unique_code: string;
    creator?: string;
    creator_id?: { username: string };
    start_time: string;
    end_time: string;
    duration: number;
    isPublic?: boolean;
    problems: Problem[];
    isEnrolled?: boolean;
    participantCount?: number;
    participants?: string[];
    syncAllCooldown?: number; // Global cooldown for sync-all (in seconds)
    finalized?: boolean;
}

export const contestApi = {
    create: async (name: string, start_time: string, duration: number, problems: Problem[], isPublic: boolean = false) => {
        const response = await fetchWithAuth('/contests/create', {
            method: 'POST',
            body: JSON.stringify({ name, start_time, duration, problems, isPublic }),
        });
        return handleResponse<{ message: string; contest: Contest }>(response);
    },

    enrollByCode: async (code: string) => {
        const response = await fetchWithAuth(`/contests/enroll/${code}`, {
            method: 'POST',
        });
        return handleResponse<{ message: string; contest: Contest }>(response);
    },

    enrollById: async (contestId: string) => {
        const response = await fetchWithAuth(`/contests/enroll-by-id/${contestId}`, {
            method: 'POST',
        });
        return handleResponse<{ message: string; contest: Contest }>(response);
    },

    getContest: async (code: string) => {
        const response = await fetchWithAuth(`/contests/${code}`);
        return handleResponse<{ contest: Contest }>(response);
    },

    getMyEnrolled: async () => {
        const response = await fetchWithAuth('/contests/my/enrolled');
        return handleResponse<{ contests: Contest[] }>(response);
    },

    getMyCreated: async () => {
        const response = await fetchWithAuth('/contests/my/created');
        return handleResponse<{ contests: Contest[] }>(response);
    },

    getPublicContests: async () => {
        const response = await fetchWithAuth('/contests/public/all');
        return handleResponse<{ upcoming: Contest[]; live: Contest[]; past: Contest[] }>(response);
    },
};

// ==================== SYNC API ====================
export interface ProblemProgress {
    slug: string;
    status: 'PENDING' | 'ACCEPTED' | 'FAIL';
    fail_count: number;
    solved_at?: string;
    penalty?: number;
}

export interface Participation {
    score: number;
    total_penalty: number;
    problem_progress: ProblemProgress[];
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    leetcode_username: string;
    score: number;
    penalty: number;
    total_time: number;
    solved: number;
    problem_progress: ProblemProgress[];
}

export const syncApi = {
    syncSubmissions: async (contestId: string) => {
        const response = await fetchWithAuth(`/sync/${contestId}`, {
            method: 'POST',
        });
        return handleResponse<{ message: string; participation: Participation }>(response);
    },

    getLeaderboard: async (contestId: string) => {
        const response = await fetchWithAuth(`/sync/leaderboard/${contestId}`);
        return handleResponse<{ leaderboard: LeaderboardEntry[] }>(response);
    },

    syncAllParticipants: async (contestId: string) => {
        const response = await fetchWithAuth(`/sync/sync-all/${contestId}`, {
            method: 'POST',
        });
        return handleResponse<{
            message: string;
            synced: number;
            errors: number;
            total: number;
            finalized?: boolean;
        }>(response);
    },
};

// ==================== PROBLEM API ====================
export interface ProblemData {
    _id?: string;
    title: string;
    title_slug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags?: string[];
    questionId?: string;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

export const problemApi = {
    search: async (query?: string, difficulty?: string, tags?: string, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (difficulty) params.append('difficulty', difficulty);
        if (tags) params.append('tags', tags);
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        const response = await fetchWithAuth(`/problems/search?${params.toString()}`);
        return handleResponse<{
            problems: ProblemData[];
            source: string;
            count: number;
            pagination: PaginationInfo;
        }>(response);
    },

    getProblem: async (slug: string) => {
        const response = await fetchWithAuth(`/problems/${slug}`);
        return handleResponse<{ problem: ProblemData }>(response);
    },
};

// ==================== PROFILE API ====================
export interface SolvedStats {
    easy: number;
    medium: number;
    hard: number;
}

export interface Profile {
    solvedStats: SolvedStats;
    totalProblems: { easy: number; medium: number; hard: number };
}

export interface TagStats {
    tagName: string;
    problemsSolved: number;
}

export interface ContestRanking {
    rating: number;
    globalRanking: number;
    totalParticipants: number;
    topPercentage: number;
}

// LeetCode contest history entry
export interface LeetCodeContestHistoryEntry {
    rating: number;
    ranking: number;
    trendDirection: string;
    problemsSolved: number;
    totalProblems: number;
    finishTimeInSeconds?: number;
}

export const profileApi = {
    getLeetCodeStats: async () => {
        const response = await fetchWithAuth('/profile/leetcode-stats');
        return handleResponse<{
            profile: Profile;
            tagStats: TagStats[];
            contestRanking: ContestRanking;
            contestHistory: LeetCodeContestHistoryEntry[];
        }>(response);
    },

    getContestHistory: async () => {
        const response = await fetchWithAuth('/profile/contest-history');
        return handleResponse<{ live: Contest[]; past: Contest[] }>(response);
    },

    getStats: async () => {
        const response = await fetchWithAuth('/profile/stats');
        return handleResponse<{
            createdContests: number;
            participatedContests: number;
            bestRank: number | null;
            totalSolved: number;
        }>(response);
    },

    getPlatformStats: async () => {
        const response = await fetchWithAuth('/profile/platform-stats');
        return handleResponse<{
            totalContestsCreated: number;
            totalContestsParticipated: number;
            averageRank: number | null;
            recentContests: { name: string; date: string; rank: number | string; score: number }[];
        }>(response);
    },
};

// ==================== COMPANY API ====================
export interface CompanyData {
    name: string;
    displayName: string;
    problemCount: number;
}

export interface CompanyProblem {
    title: string;
    title_slug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    frequency: number;
    lastAsked: string;
    acceptanceRate: string;
    leetcodeUrl: string;
    companyName: string;
}

export const companyApi = {
    getCompanies: async () => {
        const response = await fetchWithAuth('/companies/list');
        return handleResponse<{ companies: CompanyData[]; count: number }>(response);
    },

    getCompanyProblems: async (companyName: string, difficulty?: string) => {
        const params = new URLSearchParams();
        if (difficulty && difficulty !== 'all') {
            params.append('difficulty', difficulty);
        }

        const queryString = params.toString();
        const url = `/companies/${companyName}/problems${queryString ? `?${queryString}` : ''}`;

        const response = await fetchWithAuth(url);
        return handleResponse<{ problems: CompanyProblem[]; count: number; companyName: string }>(response);
    },
};

// ==================== BOT API ====================
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const botApi = {
    chat: async (message: string, conversationHistory: ChatMessage[] = []) => {
        const response = await fetchWithAuth('/bot/chat', {
            method: 'POST',
            body: JSON.stringify({ message, conversationHistory }),
        });
        return handleResponse<{ reply: string; timestamp: string }>(response);
    },

    analyze: async () => {
        const response = await fetchWithAuth('/bot/analyze');
        return handleResponse<{ analysis: string; stats: unknown; generatedAt: string }>(response);
    },

    roast: async (severity: 'mild' | 'medium' | 'brutal') => {
        const response = await fetchWithAuth(`/bot/roast?severity=${severity}`);
        return handleResponse<{
            roast: string;
            severity: string;
            roastedAt: string;
            stats: { totalSolved: number; contestRating: number };
        }>(response);
    },

    getSuggestions: async () => {
        const response = await fetchWithAuth('/bot/suggestions');
        return handleResponse<{ suggestions: string; generatedAt: string }>(response);
    },
};
