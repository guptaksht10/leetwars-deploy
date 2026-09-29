'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute, useAuthUser } from '@/components/auth/protected-route';
import { profileApi, Profile, TagStats, ContestRanking, LeetCodeContestHistoryEntry } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import {
    Trophy,
    User,
    Code2,
    Target,
    TrendingUp,
    Award,
    ExternalLink,
    Activity,
    Swords,
    Medal,
    Calendar,
    BarChart3,
} from 'lucide-react';

function ProfileContent() {
    const { user } = useAuthUser();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [tagStats, setTagStats] = useState<TagStats[]>([]);
    const [contestRanking, setContestRanking] = useState<ContestRanking | null>(null);
    const [leetcodeContestHistory, setLeetcodeContestHistory] = useState<LeetCodeContestHistoryEntry[]>([]);
    const [platformStats, setPlatformStats] = useState<{
        totalContestsCreated: number;
        totalContestsParticipated: number;
        averageRank: number | null;
        recentContests: { name: string; date: string; rank: number | string; score: number }[];
    } | null>(null);
    const [generalStats, setGeneralStats] = useState<{
        createdContests: number;
        participatedContests: number;
        bestRank: number | null;
        totalSolved: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const [leetcodeData, platformData, statsData] = await Promise.all([
                profileApi.getLeetCodeStats().catch(() => null),
                profileApi.getPlatformStats().catch(() => null),
                profileApi.getStats().catch(() => null),
            ]);
            console.log(leetcodeData)
            if (leetcodeData) {
                setProfile(leetcodeData.profile);
                setTagStats(leetcodeData.tagStats || []);
                setContestRanking(leetcodeData.contestRanking);
                setLeetcodeContestHistory(leetcodeData.contestHistory || []);
            }
            console.log(platformData)
            if (platformData) {
                setPlatformStats(platformData);
            }
            console.log(statsData)
            if (statsData) {
                setGeneralStats(statsData);
            }
        } catch (error) {
            toast.error('Failed to load profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const getTotalSolved = () => {
        if (!profile?.solvedStats) return generalStats?.totalSolved || 0;
        return profile.solvedStats.easy + profile.solvedStats.medium + profile.solvedStats.hard;
    };

    // Prepare LeetCode contest history data for the graph
    const getLeetCodeContestGraphData = () => {
        if (!leetcodeContestHistory || leetcodeContestHistory.length === 0) return [];
        // Data structure: { rating, ranking, trendDirection, problemsSolved, totalProblems, ... }
        return leetcodeContestHistory.map((c, index) => ({
            name: `Contest ${index + 1}`,
            rating: Math.round(c.rating),
            ranking: c.ranking,
            solved: c.problemsSolved,
            trend: c.trendDirection,
        }));
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 1, y: 20 },
        visible: { opacity: 1, y: 20 },
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Card className="border-border overflow-hidden">
                        <div className="bg-gradient-to-r from-primary/20 to-transparent p-6 md:p-8">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                                    <User className="w-10 h-10 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-2xl md:text-3xl font-bold">{user?.name || user?.leetcode_username}</h1>
                                    <p className="text-muted-foreground">{user?.email}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <a
                                            href={`https://leetcode.com/${user?.leetcode_username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <Code2 className="w-4 h-4" />
                                            {user?.leetcode_username}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                        ))
                    ) : (
                        <>
                            <motion.div variants={itemVariants}>
                                <Card className="border-border h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Solved</p>
                                                <p className="text-3xl font-bold text-primary">{getTotalSolved()}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Code2 className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="border-border h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Contest Rating</p>
                                                <p className="text-3xl font-bold">{contestRanking?.rating.toFixed(2) || '—'}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <TrendingUp className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="border-border h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">LeetWars Contests</p>
                                                <p className="text-3xl font-bold">{platformStats?.totalContestsParticipated || 0}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Trophy className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="border-border h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Avg Rank</p>
                                                <p className="text-3xl font-bold">
                                                    {platformStats?.averageRank ? `#${platformStats.averageRank}` : '—'}
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Award className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </>
                    )}
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Solved by Difficulty */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="border-border h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-primary" />
                                    Problems Solved
                                </CardTitle>
                                <CardDescription>Breakdown by difficulty</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-48 rounded-lg" />
                                ) : profile ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-green-500 font-medium">Easy</span>
                                                <span className="font-bold">
                                                    {profile.solvedStats.easy}/{profile.totalProblems.easy}
                                                </span>
                                            </div>
                                            <div className="h-3 rounded-full bg-secondary overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(profile.solvedStats.easy / profile.totalProblems.easy) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-yellow-500 font-medium">Medium</span>
                                                <span className="font-bold">
                                                    {profile.solvedStats.medium}/{profile.totalProblems.medium}
                                                </span>
                                            </div>
                                            <div className="h-3 rounded-full bg-secondary overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(profile.solvedStats.medium / profile.totalProblems.medium) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-red-500 font-medium">Hard</span>
                                                <span className="font-bold">
                                                    {profile.solvedStats.hard}/{profile.totalProblems.hard}
                                                </span>
                                            </div>
                                            <div className="h-3 rounded-full bg-secondary overflow-hidden">
                                                <div
                                                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(profile.solvedStats.hard / profile.totalProblems.hard) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Failed to load LeetCode stats
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Top Tags */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="border-border h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Code2 className="w-5 h-5 text-primary" />
                                    All Tags
                                </CardTitle>
                                <CardDescription>Your problem categories</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-48 rounded-lg" />
                                ) : tagStats.length > 0 ? (
                                    <ScrollArea className="h-48">
                                        <div className="flex flex-wrap gap-2 pr-4">
                                            {tagStats
                                                .sort((a, b) => b.problemsSolved - a.problemsSolved)
                                                .map((tag) => (
                                                    <Badge
                                                        key={tag.tagName}
                                                        variant="secondary"
                                                        className="px-3 py-1"
                                                    >
                                                        {tag.tagName}: {tag.problemsSolved}
                                                    </Badge>
                                                ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No tag data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* LeetCode Contest Rating History */}
                    {getLeetCodeContestGraphData().length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.42 }}
                            className="lg:col-span-2"
                        >
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-primary" />
                                        LeetCode Contest Rating History
                                    </CardTitle>
                                    <CardDescription>Your rating progression in LeetCode contests</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ width: '100%', height: 288, minWidth: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                                            <AreaChart
                                                data={getLeetCodeContestGraphData()}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                                                    stroke="#4b5563"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={60}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                                    stroke="#4b5563"
                                                    domain={['auto', 'auto']}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1f2937',
                                                        border: '1px solid #374151',
                                                        borderRadius: '8px',
                                                        color: '#f9fafb',
                                                    }}
                                                    labelStyle={{ color: '#9ca3af' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="rating"
                                                    stroke="#22d3ee"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorRating)"
                                                    dot={{ fill: '#22d3ee', strokeWidth: 2, r: 4 }}
                                                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {contestRanking && (
                                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-primary">{Math.round(contestRanking.rating)}</p>
                                                <p className="text-xs text-muted-foreground">Current Rating</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">#{contestRanking.globalRanking.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">Global Ranking</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-green-500">Top {contestRanking.topPercentage}%</p>
                                                <p className="text-xs text-muted-foreground">Percentile</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* LeetWars Contest Performance Graph */}
                    {platformStats?.recentContests && platformStats.recentContests.length > 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            className="lg:col-span-2"
                        >
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" />
                                        Contest Performance
                                    </CardTitle>
                                    <CardDescription>Your score trend across recent contests</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ width: '100%', height: 256, minWidth: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                                            <LineChart
                                                data={[...platformStats.recentContests].reverse().map((c) => ({
                                                    name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
                                                    score: c.score,
                                                    rank: typeof c.rank === 'number' ? c.rank : parseInt(c.rank) || 0,
                                                }))}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                                                    stroke="#6b7280"
                                                    angle={-30}
                                                    textAnchor="end"
                                                    height={50}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                                    stroke="#6b7280"
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1f2937',
                                                        border: '1px solid #374151',
                                                        borderRadius: '8px',
                                                        color: '#f9fafb',
                                                    }}
                                                    labelStyle={{ color: '#d1d5db' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="score"
                                                    stroke="#22d3ee"
                                                    strokeWidth={3}
                                                    dot={{ fill: '#22d3ee', strokeWidth: 2, r: 4 }}
                                                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}
