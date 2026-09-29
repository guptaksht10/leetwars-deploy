'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute, useAuthUser } from '@/components/auth/protected-route';
import { contestApi, syncApi, Contest, LeaderboardEntry, ProblemProgress } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Trophy,
    Clock,
    Users,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Timer,
    Copy,
    Loader2,
    AlertCircle,
    Download,
} from 'lucide-react';
import ContestLeaderboard from '@/components/contest/contest-leaderboard';

function ContestDetailContent() {
    const params = useParams();
    const code = params.code as string;
    const { user } = useAuthUser();

    const [contest, setContest] = useState<Contest | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [myProgress, setMyProgress] = useState<ProblemProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncCooldown, setSyncCooldown] = useState(0);
    const [syncAllCooldown, setSyncAllCooldown] = useState(0); // Global cooldown for sync-all
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [contestStatus, setContestStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
    const [isGracePeriod, setIsGracePeriod] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Fix hydration mismatch by only rendering time after mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const loadContestData = useCallback(async () => {
        try {
            const [contestRes, leaderboardRes] = await Promise.all([
                contestApi.getContest(code),
                syncApi.getLeaderboard(code).catch(() => ({ leaderboard: [] })),
            ]);
            console.log(contestRes.contest)
            setContest(contestRes.contest);
            setLeaderboard(leaderboardRes.leaderboard);

            // Initialize global sync-all cooldown from contest data
            if (contestRes.contest.syncAllCooldown && contestRes.contest.syncAllCooldown > 0) {
                setSyncAllCooldown(contestRes.contest.syncAllCooldown);
            }

            // Find user's progress
            const userEntry = leaderboardRes.leaderboard.find(
                (e) => e.leetcode_username === user?.leetcode_username
            );
            if (userEntry) {
                setMyProgress(userEntry.problem_progress);
            }
        } catch (error) {
            toast.error('Failed to load contest');
        } finally {
            setIsLoading(false);
        }
    }, [code, user?.leetcode_username]);

    useEffect(() => {
        loadContestData();
    }, [loadContestData]);

    // Timer effect
    useEffect(() => {
        if (!contest) return;

        const updateTime = () => {
            const now = new Date();
            const start = new Date(contest.start_time);
            const end = new Date(contest.end_time);
            const gracePeriodEnd = new Date(end.getTime() + 60 * 60 * 1000); // 1 hour grace period

            if (now < start) {
                setContestStatus('upcoming');
                const diff = start.getTime() - now.getTime();
                setTimeRemaining(formatTimeRemaining(diff));
                setIsGracePeriod(false);
            } else if (now >= start && now <= end) {
                setContestStatus('live');
                const diff = end.getTime() - now.getTime();
                setTimeRemaining(formatTimeRemaining(diff));
                setIsGracePeriod(false);
            } else {
                setContestStatus('ended');
                if (now <= gracePeriodEnd && !contest.finalized) {
                    setIsGracePeriod(true);
                    const diff = gracePeriodEnd.getTime() - now.getTime();
                    setTimeRemaining(`Finalizing... (${formatTimeRemaining(diff)})`);
                } else {
                    setIsGracePeriod(false);
                    setTimeRemaining(contest.finalized ? 'Finalized' : 'Contest ended');
                }
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [contest]);

    // Sync cooldown timer
    useEffect(() => {
        if (syncCooldown > 0) {
            const timer = setTimeout(() => setSyncCooldown(syncCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [syncCooldown]);

    // Sync-all global cooldown timer
    useEffect(() => {
        if (syncAllCooldown > 0) {
            const timer = setTimeout(() => setSyncAllCooldown(syncAllCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [syncAllCooldown]);

    const formatTimeRemaining = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const formatSolveTime = (solvedAt?: string) => {
        if (!solvedAt || !contest) return '';
        const start = new Date(contest.start_time).getTime();
        const solved = new Date(solvedAt).getTime();
        const diff = Math.max(0, solved - start);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSync = async () => {
        if (!contest || syncCooldown > 0) return;

        setIsSyncing(true);
        try {
            const response = await syncApi.syncSubmissions(code);
            toast.success(response.message);
            setSyncCooldown(30); // 30 second cooldown
            loadContestData();
        } catch (error) {
            if (error instanceof Error && error.message.includes('wait')) {
                // Extract cooldown time from error message
                const match = error.message.match(/(\d+) seconds/);
                if (match) {
                    setSyncCooldown(parseInt(match[1]));
                }
                toast.warning(error.message);
            } else {
                toast.error('Failed to sync');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncAll = async () => {
        if (!contest) return;

        setIsSyncingAll(true);
        try {
            const response = await syncApi.syncAllParticipants(code);
            console.log(response)
            toast.success(response.message);

            // If the backend says configured as finalized, update local state immediately
            if (response.finalized && contest) {
                setContest({ ...contest, finalized: true });
                setIsGracePeriod(false);
            }

            // Reload contest to get updated syncAllCooldown
            loadContestData();
        } catch (error) {
            if (error instanceof Error && error.message.includes('wait')) {
                // Extract cooldown time from error message
                const match = error.message.match(/(\d+) seconds/);
                if (match) {
                    setSyncAllCooldown(parseInt(match[1]));
                }
                toast.warning(error.message);
            } else {
                toast.error('Failed to sync all');
            }
        } finally {
            setIsSyncingAll(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        toast.success('Contest code copied!');
    };

    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty) {
            case 'Easy': return 'text-green-500';
            case 'Medium': return 'text-yellow-500';
            case 'Hard': return 'text-red-500';
            default: return 'text-muted-foreground';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACCEPTED': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'FAIL': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Timer className="w-4 h-4 text-muted-foreground" />;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton className="h-32 rounded-xl" />
                    <div className="grid md:grid-cols-2 gap-6">
                        <Skeleton className="h-64 rounded-xl" />
                        <Skeleton className="h-64 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!contest) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Contest Not Found</h1>
                    <p className="text-muted-foreground mb-4">The contest code may be invalid or expired.</p>
                    <Link href="/dashboard">
                        <Button>Back to Dashboard</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-primary flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                Automatic Sync Active? Get the Extension!
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Install our Chrome extension for automatic, real-time submission syncing during active contests.
                            </p>
                        </div>
                        <a href={process.env.NEXT_PUBLIC_EXTENSION_URL || '#'} target="_blank" rel="noreferrer">
                            <Button variant="default" className="gap-2">
                                <Download className="w-4 h-4" />
                                Download ZIP
                            </Button>
                        </a>
                    </div>

                    <Card className="border-border overflow-hidden">
                        <div className="bg-gradient-to-r from-primary/20 to-transparent p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Trophy className="w-8 h-8 text-primary" />
                                        <h1 className="text-2xl md:text-3xl font-bold">{contest.name}</h1>
                                        <Badge
                                            variant={
                                                contestStatus === 'live' ? 'default' :
                                                    contestStatus === 'upcoming' ? 'outline' : 'secondary'
                                            }
                                        >
                                            {contestStatus === 'live' && <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />}
                                            {contestStatus.charAt(0).toUpperCase() + contestStatus.slice(1)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {contest.duration} min
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {contest.participantCount} participants
                                        </div>
                                        <button
                                            onClick={copyCode}
                                            className="flex items-center gap-1 hover:text-primary transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                            {code}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-center md:text-right" suppressHydrationWarning>
                                    <p className="text-sm text-muted-foreground">
                                        {contestStatus === 'upcoming' ? 'Starts in' : contestStatus === 'live' ? 'Time remaining' : ''}
                                    </p>
                                    <p className="text-2xl font-mono font-bold text-primary" suppressHydrationWarning>
                                        {isMounted ? timeRemaining : 'Loading...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Problems */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1"
                    >
                        <Card className="border-border h-fit">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Problems</CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSync}
                                            disabled={isSyncing || syncCooldown > 0 || (contestStatus !== 'live' && !isGracePeriod)}
                                        >
                                            {isSyncing ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : syncCooldown > 0 ? (
                                                `${syncCooldown}s`
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>
                                    Solve problems on LeetCode and sync your submissions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {(!contest.problems || contest.problems.length === 0) ? (
                                    <div className="text-center py-8">
                                        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-muted-foreground font-medium">
                                            {contestStatus === 'upcoming'
                                                ? 'Problems will be revealed when the contest starts'
                                                : 'No problems available'}
                                        </p>
                                        {contestStatus === 'upcoming' && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Come back at {new Date(contest.start_time).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ) : contest.problems.map((problem, index) => {
                                    const progress = myProgress.find((p) => p.slug === problem.slug);
                                    return (
                                        <div
                                            key={problem.slug}
                                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(progress?.status || 'PENDING')}
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {index + 1}. {problem?.problem_id?.title || problem.slug}
                                                    </p>
                                                    <p className={`text-xs ${getDifficultyColor(problem.points === 3 ? 'Easy' : problem.points === 4 ? 'Medium' : 'Hard')}`}>
                                                        +{problem.points} pts
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={`https://leetcode.com/problems/${problem.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button variant="ghost" size="icon">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </a>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Leaderboard */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <ContestLeaderboard
                            leaderboard={leaderboard}
                            contest={contest}
                            currentUserLeetcode={user?.leetcode_username}
                            isSyncing={isSyncingAll}
                            syncCooldown={syncAllCooldown}
                            contestStatus={contestStatus}
                            isGracePeriod={isGracePeriod}
                            onSyncAll={handleSyncAll}
                        />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function ContestDetailPage() {
    return (
        <ProtectedRoute>
            <ContestDetailContent />
        </ProtectedRoute>
    );
}
