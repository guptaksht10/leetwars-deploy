'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { contestApi, Contest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Trophy,
    Calendar,
    Clock,
    Users,
    Copy,
    CheckCircle2,
    Play,
    Eye,
    Plus,
    Swords,
} from 'lucide-react';

function MyContestsContent() {
    const [enrolledContests, setEnrolledContests] = useState<Contest[]>([]);
    const [createdContests, setCreatedContests] = useState<Contest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        loadContests();
    }, []);

    const loadContests = async () => {
        try {
            const [enrolled, created] = await Promise.all([
                contestApi.getMyEnrolled(),
                contestApi.getMyCreated(),
            ]);
            setEnrolledContests(enrolled.contests || []);
            setCreatedContests(created.contests || []);
        } catch (error) {
            toast.error('Failed to load contests');
        } finally {
            setIsLoading(false);
        }
    };

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Contest code copied!');
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getContestStatus = (contest: Contest) => {
        const now = new Date();
        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);

        if (now < start) return 'upcoming';
        if (now >= start && now <= end) return 'live';
        return 'ended';
    };

    // Sort contests: Live first, then Upcoming, then Ended
    // Within each group, sort by start time (earlier first for live/upcoming, later first for ended)
    const sortContests = (contests: Contest[]) => {
        const statusPriority = { live: 0, upcoming: 1, ended: 2 };

        return [...contests].sort((a, b) => {
            const statusA = getContestStatus(a);
            const statusB = getContestStatus(b);

            // First sort by status priority
            if (statusPriority[statusA] !== statusPriority[statusB]) {
                return statusPriority[statusA] - statusPriority[statusB];
            }

            // Within same status, sort by start time
            const startA = new Date(a.start_time).getTime();
            const startB = new Date(b.start_time).getTime();

            // For ended contests, show most recent first
            if (statusA === 'ended') {
                return startB - startA;
            }

            // For live/upcoming, show earliest first
            return startA - startB;
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'live':
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🔴 Live</Badge>;
            case 'upcoming':
                return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📅 Upcoming</Badge>;
            default:
                return <Badge variant="secondary">Ended</Badge>;
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const ContestCard = ({ contest, showCreator = false }: { contest: Contest; showCreator?: boolean }) => {
        const status = getContestStatus(contest);
        const code = contest.unique_code;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
            >
                <Card className="border-border hover:border-primary/50 transition-all">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    {getStatusBadge(status)}
                                    {!contest.isPublic && (
                                        <Badge variant="outline" className="text-xs">Private</Badge>
                                    )}
                                </div>
                                <h3 className="font-semibold text-lg truncate">{contest.name}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(contest.start_time)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {contest.duration} min
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {contest.participantCount || contest.participants?.length || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyCode(code)}
                                    className="flex items-center gap-1"
                                >
                                    {copiedCode === code ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            {code}
                                        </>
                                    )}
                                </Button>
                                <Link href={`/contests/${code}`}>
                                    <Button size="sm" variant={status === 'live' ? 'default' : 'secondary'}>
                                        {status === 'live' ? (
                                            <>
                                                <Play className="w-4 h-4 mr-1" />
                                                Enter
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="w-4 h-4 mr-1" />
                                                View
                                            </>
                                        )}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    const EmptyState = ({ type }: { type: 'enrolled' | 'created' }) => (
        <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="mb-2">
                {type === 'enrolled' ? "You haven't enrolled in any contests yet" : "You haven't created any contests yet"}
            </p>
            <Link href={type === 'enrolled' ? '/contests/public' : '/contests/create'}>
                <Button variant="outline" className="mt-2">
                    {type === 'enrolled' ? (
                        <>
                            <Swords className="w-4 h-4 mr-2" />
                            Browse Public Contests
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Contest
                        </>
                    )}
                </Button>
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2">My Contests</h1>
                    <p className="text-muted-foreground">
                        View and manage your enrolled and created contests
                    </p>
                </motion.div>

                <Tabs defaultValue="enrolled" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="enrolled" className="flex items-center gap-2">
                            <Swords className="w-4 h-4" />
                            Enrolled ({enrolledContests.length})
                        </TabsTrigger>
                        <TabsTrigger value="created" className="flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            Created ({createdContests.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="enrolled">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle>Enrolled Contests</CardTitle>
                                <CardDescription>
                                    Contests you have joined (both public and private)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <Skeleton key={i} className="h-24 rounded-lg" />
                                        ))}
                                    </div>
                                ) : enrolledContests.length > 0 ? (
                                    <div className="space-y-4">
                                        {sortContests(enrolledContests).map((contest) => (
                                            <ContestCard key={contest.id || contest._id} contest={contest} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState type="enrolled" />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="created">
                        <Card className="border-border">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Created Contests</CardTitle>
                                    <CardDescription>
                                        Contests you have created
                                    </CardDescription>
                                </div>
                                <Link href="/contests/create">
                                    <Button>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create New
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <Skeleton key={i} className="h-24 rounded-lg" />
                                        ))}
                                    </div>
                                ) : createdContests.length > 0 ? (
                                    <div className="space-y-4">
                                        {sortContests(createdContests).map((contest) => (
                                            <ContestCard key={contest.id || contest._id} contest={contest} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState type="created" />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default function MyContestsPage() {
    return (
        <ProtectedRoute>
            <MyContestsContent />
        </ProtectedRoute>
    );
}
