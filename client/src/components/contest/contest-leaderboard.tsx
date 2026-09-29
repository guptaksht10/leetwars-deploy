'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    RefreshCw,
    CheckCircle2,
    XCircle,
    Loader2,
    Users,
    Medal,
} from 'lucide-react';

export interface ProblemProgress {
    slug: string;
    status: string;
    fail_count?: number;
    solved_at?: string;
    penalty?: number;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    leetcode_username: string;
    score: number;
    penalty: number;
    total_time?: number;
    solved?: number;
    attempts?: number;
    problem_progress?: ProblemProgress[];
}

interface LeaderboardProps {
    leaderboard: LeaderboardEntry[];
    contest: any; // Use existing Contest type from API
    currentUserId?: string;
    currentUserLeetcode?: string;
    isSyncing: boolean;
    syncCooldown: number;
    contestStatus: 'upcoming' | 'live' | 'ended';
    isGracePeriod?: boolean;
    onSyncAll: () => void;
}

const formatSolveTime = (solvedAt?: string, contestStartTime?: string) => {
    if (!solvedAt || !contestStartTime) return '';
    const start = new Date(contestStartTime).getTime();
    const solved = new Date(solvedAt).getTime();
    const diff = Math.max(0, solved - start);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
};

const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white';
    return 'bg-secondary text-foreground';
};

const ContestLeaderboard = memo(({
    leaderboard,
    contest,
    currentUserId,
    currentUserLeetcode,
    isSyncing,
    syncCooldown,
    contestStatus,
    isGracePeriod = false,
    onSyncAll
}: LeaderboardProps) => {
    const canSyncAll = contestStatus === 'live' || isGracePeriod;
    const syncAllDisabled = isSyncing || !canSyncAll || syncCooldown > 0;
    if (!contest) return null;

    return (
        <Card className="border-border">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-primary" />
                            Leaderboard
                            {isGracePeriod && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                                    Grace Period
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {isGracePeriod
                                ? 'Grace period — final syncs allowed before rankings lock'
                                : 'Live rankings based on score and time'}
                        </CardDescription>
                    </div>
                    <Button
                        variant={isGracePeriod ? 'default' : 'outline'}
                        size="sm"
                        onClick={onSyncAll}
                        disabled={syncAllDisabled}
                        className={isGracePeriod ? 'bg-amber-500 hover:bg-amber-600 text-black border-amber-500' : ''}
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Syncing...
                            </>
                        ) : syncCooldown > 0 ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {Math.floor(syncCooldown / 60)}:{(syncCooldown % 60).toString().padStart(2, '0')}
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {isGracePeriod ? 'Final Sync All' : 'Sync All'}
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {leaderboard.length === 0 ? (
                    <div className="text-center py-12 px-4 text-muted-foreground">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No participants yet</p>
                        <p className="text-sm mt-1">Be the first to join and compete!</p>
                    </div>
                ) : (
                    <div className="relative w-full overflow-x-auto pb-16">
                        {/* Horizontal scroll container */}
                        <div className="min-w-full inline-block align-middle">
                            <Table>
                                <TableHeader className="sticky top-0 z-20 bg-card">
                                    <TableRow className="hover:bg-transparent border-b-2">
                                        {/* Sticky left columns */}
                                        <TableHead className="sticky left-0 z-30 bg-card font-bold w-16 min-w-[4rem]">
                                            Rank
                                        </TableHead>
                                        <TableHead className="sticky left-16 z-30 bg-card font-bold min-w-[180px]">
                                            User
                                        </TableHead>

                                        {/* Problem columns - scrollable */}
                                        {contest.problems.map((prob: any, idx: number) => (
                                            <TableHead
                                                key={idx}
                                                className="text-center min-w-[100px] px-2"
                                            >
                                                <div className="flex flex-col items-center gap-1">
                                                    <Badge variant="outline" className="font-bold text-xs">
                                                        Q{idx + 1}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[80px]">
                                                        {prob.problem_id?.title || prob.slug}
                                                    </span>
                                                    <span className="text-[10px] text-primary font-semibold">
                                                        +{prob.points}pts
                                                    </span>
                                                </div>
                                            </TableHead>
                                        ))}

                                        {/* Sticky right column - Score */}
                                        <TableHead className="sticky right-0 z-30 bg-card text-right font-bold min-w-[100px] border-l-2">
                                            Score
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaderboard.map((entry) => {
                                        const isCurrentUser = entry.leetcode_username === currentUserLeetcode;
                                        return (
                                            <TableRow
                                                key={entry.username}
                                                className={`
                                                    ${isCurrentUser ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'}
                                                    transition-colors
                                                `}
                                            >
                                                {/* Sticky Rank */}
                                                <TableCell className="sticky left-0 z-10 bg-inherit p-2">
                                                    <div className="flex items-center justify-center">
                                                        <div className={`
                                                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                                            ${getRankColor(entry.rank)}
                                                            shadow-sm
                                                        `}>
                                                            {getRankBadge(entry.rank)}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Sticky User */}
                                                <TableCell className="sticky left-16 z-10 bg-inherit p-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={`font-semibold text-sm ${isCurrentUser ? 'text-primary' : ''}`}>
                                                            {entry.username}
                                                            {isCurrentUser && (
                                                                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                                                                    YOU
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={entry.leetcode_username}>
                                                            {entry.leetcode_username}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Problem columns */}
                                                {contest.problems.map((prob: any) => {
                                                    const progress = entry.problem_progress?.find(p => p.slug === prob.slug);
                                                    return (
                                                        <TableCell key={prob.slug} className="text-center p-1">
                                                            {progress?.status === 'ACCEPTED' ? (
                                                                <div className="inline-flex flex-col items-center gap-0.5 bg-green-500/15 border border-green-500/30 rounded-md p-1.5 min-w-[80px]">
                                                                    <div className="flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                                        <span className="font-mono text-xs font-semibold text-green-500">
                                                                            {formatSolveTime(progress.solved_at, contest.start_time)}
                                                                        </span>
                                                                    </div>
                                                                    {progress.fail_count && progress.fail_count > 0 && (
                                                                        <span className="text-[10px] text-red-400 font-medium">
                                                                            -{progress.fail_count} attempts
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : progress && progress.fail_count && progress.fail_count > 0 ? (
                                                                <div className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-md p-1.5 min-w-[60px]">
                                                                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                                                                    <span className="text-xs font-medium text-red-400">
                                                                        {progress.fail_count}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-muted-foreground/20 text-base">—</div>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}

                                                {/* Sticky Score */}
                                                <TableCell className="sticky right-0 z-10 bg-inherit text-right p-2 border-l-2">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="font-bold text-base">{entry.score}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {entry.penalty > 0 ? `+${entry.penalty}min` : 'No penalty'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Scroll indicator */}
                        {contest.problems.length > 3 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                                <div className="bg-card/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 shadow-lg">
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>←</span>
                                        Scroll to view all problems
                                        <span>→</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

ContestLeaderboard.displayName = 'ContestLeaderboard';

export default ContestLeaderboard;
