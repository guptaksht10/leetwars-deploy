'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { contestApi, Contest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Trophy,
    Clock,
    Users,
    Calendar,
    Loader2,
    Zap,
    History,
    ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

function PublicContestsContent() {
    const [contests, setContests] = useState<{
        upcoming: Contest[];
        live: Contest[];
        past: Contest[];
    }>({ upcoming: [], live: [], past: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [enrollingId, setEnrollingId] = useState<string | null>(null);

    useEffect(() => {
        loadContests();
    }, []);

    const loadContests = async () => {
        try {
            const data = await contestApi.getPublicContests();
            setContests(data);
        } catch (error) {
            toast.error('Failed to load public contests');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnroll = async (contestId: string) => {
        setEnrollingId(contestId);
        try {
            await contestApi.enrollById(contestId);
            toast.success('Successfully enrolled!');
            loadContests();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to enroll');
        } finally {
            setEnrollingId(null);
        }
    };

    const ContestCard = ({ contest, showEnroll = true }: { contest: Contest; showEnroll?: boolean }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
        >
            <Card className="border-border hover:border-primary/50 transition-all h-full">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{contest.name}</h3>
                                <p className="text-sm text-muted-foreground">by {contest.creator}</p>
                            </div>
                        </div>
                        {contest.isEnrolled && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                                Enrolled
                            </Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(contest.start_time), 'MMM d, h:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{contest.duration} min</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{contest.participantCount} participants</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Zap className="w-4 h-4" />
                            <span>{contest.problems?.length || 0} problems</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {contest.isEnrolled ? (
                            <Link href={`/contests/${contest.unique_code}`} className="flex-1">
                                <Button className="w-full" variant="secondary">
                                    View Contest <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        ) : showEnroll ? (
                            <Button
                                className="flex-1"
                                onClick={() => handleEnroll(contest.id)}
                                disabled={enrollingId === contest.id}
                            >
                                {enrollingId === contest.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Enrolling...
                                    </>
                                ) : (
                                    'Enroll Now'
                                )}
                            </Button>
                        ) : (
                            <Link href={`/contests/${contest.unique_code}`} className="flex-1">
                                <Button className="w-full" variant="outline">
                                    View Results
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );

    const EmptyState = ({ message }: { message: string }) => (
        <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">{message}</p>
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2">Public Contests</h1>
                    <p className="text-muted-foreground">
                        Browse and join open coding competitions
                    </p>
                </motion.div>

                <Tabs defaultValue="live" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="live" className="gap-2">
                            <Zap className="w-4 h-4" />
                            Live ({contests.live.length})
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="gap-2">
                            <Calendar className="w-4 h-4" />
                            Upcoming ({contests.upcoming.length})
                        </TabsTrigger>
                        <TabsTrigger value="past" className="gap-2">
                            <History className="w-4 h-4" />
                            Past ({contests.past.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="live">
                        {isLoading ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-64 rounded-xl" />
                                ))}
                            </div>
                        ) : contests.live.length === 0 ? (
                            <EmptyState message="No live contests right now" />
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {contests.live.map((contest) => (
                                    <ContestCard key={contest.id} contest={contest} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="upcoming">
                        {isLoading ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-64 rounded-xl" />
                                ))}
                            </div>
                        ) : contests.upcoming.length === 0 ? (
                            <EmptyState message="No upcoming contests scheduled" />
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {contests.upcoming.map((contest) => (
                                    <ContestCard key={contest.id} contest={contest} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="past">
                        {isLoading ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-64 rounded-xl" />
                                ))}
                            </div>
                        ) : contests.past.length === 0 ? (
                            <EmptyState message="No past contests to show" />
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {contests.past.map((contest) => (
                                    <ContestCard key={contest.id} contest={contest} showEnroll={false} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default function PublicContestsPage() {
    return (
        <ProtectedRoute>
            <PublicContestsContent />
        </ProtectedRoute>
    );
}
