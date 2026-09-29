'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute, useAuthUser } from '@/components/auth/protected-route';
import { contestApi, profileApi, Contest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Trophy,
    Plus,
    Globe,
    Users,
    Clock,
    Code2,
    ArrowRight,
    Loader2,
    Zap,
    Download,
} from 'lucide-react';

function DashboardContent() {
    const { user } = useAuthUser();
    const [stats, setStats] = useState<{
        createdContests: number;
        participatedContests: number;
        bestRank: number | null;
        totalSolved: number;
    } | null>(null);
    const [enrolledContests, setEnrolledContests] = useState<Contest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [statsData, contestsData] = await Promise.all([
                profileApi.getStats(),
                contestApi.getMyEnrolled(),
            ]);
            setStats(statsData);
            setEnrolledContests(contestsData.contests);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinContest = async () => {
        if (!joinCode.trim()) {
            toast.error('Please enter a contest code');
            return;
        }

        setIsJoining(true);
        try {
            const response = await contestApi.enrollByCode(joinCode.trim());
            toast.success(`Joined ${response.contest.name}!`);
            setJoinDialogOpen(false);
            setJoinCode('');
            loadDashboardData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to join contest');
        } finally {
            setIsJoining(false);
        }
    };

    const getContestStatus = (contest: Contest) => {
        const now = new Date();
        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);

        if (now < start) return { label: 'Upcoming', variant: 'outline' as const, priority: 1 };
        if (now >= start && now <= end) return { label: 'Live', variant: 'default' as const, priority: 0 };
        return { label: 'Ended', variant: 'secondary' as const, priority: 2 };
    };

    // Sort contests: Live first, then Upcoming, then Ended
    const sortContests = (contests: Contest[]) => {
        return [...contests].sort((a, b) => {
            const statusA = getContestStatus(a);
            const statusB = getContestStatus(b);

            if (statusA.priority !== statusB.priority) {
                return statusA.priority - statusB.priority;
            }

            const startA = new Date(a.start_time).getTime();
            const startB = new Date(b.start_time).getTime();

            // For ended, show most recent first; for live/upcoming, show earliest first
            return statusA.priority === 2 ? startB - startA : startA - startB;
        });
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
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-primary flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                Get the LeetWars Extension!
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

                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        Welcome back, <span className="text-primary">{user?.name || user?.leetcode_username}</span>!
                    </h1>
                    <p className="text-muted-foreground">
                        Ready to compete? Create or join a contest to get started.
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                        ))
                    ) : (
                        <>
                            <motion.div variants={itemVariants}>
                                <Card className="border-border hover:border-primary/50 transition-colors">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Created</p>
                                                <p className="text-3xl font-bold">{stats?.createdContests || 0}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Trophy className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="border-border hover:border-primary/50 transition-colors">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Participated</p>
                                                <p className="text-3xl font-bold">{stats?.participatedContests || 0}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Users className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="border-border hover:border-primary/50 transition-colors">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Best Rank</p>
                                                <p className="text-3xl font-bold">
                                                    {stats?.bestRank ? `#${stats.bestRank}` : '—'}
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Zap className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="border-border hover:border-primary/50 transition-colors">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Score</p>
                                                <p className="text-3xl font-bold">{stats?.totalSolved || 0}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Code2 className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </>
                    )}
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid md:grid-cols-3 gap-4 mb-8"
                >
                    <motion.div variants={itemVariants}>
                        <Link href="/contests/create">
                            <Card className="h-full border-border hover:border-primary transition-colors cursor-pointer group">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus className="w-7 h-7 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Create Contest</h3>
                                        <p className="text-sm text-muted-foreground">Start a new competition</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                            <DialogTrigger asChild>
                                <Card className="h-full border-border hover:border-primary transition-colors cursor-pointer group">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Code2 className="w-7 h-7 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Join by Code</h3>
                                            <p className="text-sm text-muted-foreground">Enter contest code</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Join Contest</DialogTitle>
                                    <DialogDescription>
                                        Enter the contest code shared by your friend to join.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="code">Contest Code</Label>
                                    <Input
                                        id="code"
                                        placeholder="Enter 8-character code"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                        className="mt-2"
                                        disabled={isJoining}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleJoinContest} disabled={isJoining}>
                                        {isJoining ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Joining...
                                            </>
                                        ) : (
                                            'Join Contest'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Link href="/contests/public">
                            <Card className="h-full border-border hover:border-primary transition-colors cursor-pointer group">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Globe className="w-7 h-7 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Public Contests</h3>
                                        <p className="text-sm text-muted-foreground">Browse open contests</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Enrolled Contests */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Your Contests</CardTitle>
                                    <CardDescription>Contests you&apos;ve joined or created</CardDescription>
                                </div>
                                <Link href="/contests/my">
                                    <Button variant="ghost" size="sm" className="gap-1">
                                        View All <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="grid md:grid-cols-2 gap-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-36 rounded-xl" />
                                    ))}
                                </div>
                            ) : (() => {
                                // Filter to only upcoming and live contests
                                const activeContests = sortContests(enrolledContests).filter(contest => {
                                    const status = getContestStatus(contest);
                                    return status.priority === 0 || status.priority === 1; // Live or Upcoming
                                });

                                if (activeContests.length === 0) {
                                    return (
                                        <div className="text-center py-10">
                                            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                            <p className="text-muted-foreground">No upcoming or live contests</p>
                                            <p className="text-sm text-muted-foreground">
                                                Join a contest to see it here!
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {activeContests.slice(0, 4).map((contest) => {
                                            const status = getContestStatus(contest);
                                            const isLive = status.priority === 0;
                                            const startDate = new Date(contest.start_time);

                                            return (
                                                <Link
                                                    key={contest._id || contest.id}
                                                    href={`/contests/${contest.unique_code}`}
                                                >
                                                    <div
                                                        className={`relative p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${isLive
                                                            ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-500/50'
                                                            : 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50'
                                                            }`}
                                                        suppressHydrationWarning
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <Badge
                                                                className={isLive ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}
                                                                suppressHydrationWarning
                                                            >
                                                                {isMounted ? (isLive ? '🔴 Live Now' : '📅 Upcoming') : 'Loading...'}
                                                            </Badge>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Users className="w-3 h-3" />
                                                                {contest.participantCount || 0}
                                                            </div>
                                                        </div>
                                                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{contest.name}</h3>
                                                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {contest.duration} min
                                                            </span>
                                                            <span>•</span>
                                                            <span>{contest.problems?.length || 0} problems</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground">
                                                                {isLive
                                                                    ? 'Ends ' + new Date(contest.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                    : startDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                }
                                                            </span>
                                                            <span className={`text-xs font-medium ${isLive ? 'text-red-400' : 'text-blue-400'}`}>
                                                                {isLive ? 'Enter →' : 'View →'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <DashboardContent />
        </ProtectedRoute>
    );
}
