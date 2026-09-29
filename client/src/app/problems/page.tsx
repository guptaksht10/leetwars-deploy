'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { problemApi, ProblemData, PaginationInfo } from '@/lib/api';
import { LEETCODE_TAGS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Search,
    ExternalLink,
    Loader2,
    Code2,
    Tag,
    X,
    CheckCircle2,
    Building2,
} from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { CompanyProblemsView } from '@/components/company-problems-view';

// Default tags for LeetCode problems
const DEFAULT_TAGS = [
    'Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math',
    'Sorting', 'Greedy', 'Binary Search', 'Tree', 'Graph'
];

function ProblemsContent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [difficulty, setDifficulty] = useState<string>('');
    const [problems, setProblems] = useState<ProblemData[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [tagDialogOpen, setTagDialogOpen] = useState(false);
    const [tagFilter, setTagFilter] = useState('');
    const loaderRef = useRef<HTMLDivElement>(null);
    const [searchTab, setSearchTab] = useState<'general' | 'company'>('general');

    // Auto-load problems on mount
    useEffect(() => {
        loadProblems(1, false);
    }, []);

    const loadProblems = async (page: number, append: boolean = false) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await problemApi.search(
                searchQuery || undefined,
                difficulty && difficulty !== 'all' ? difficulty : undefined,
                searchTags.length > 0 ? searchTags.join(',') : undefined,
                page,
                20
            );

            if (append) {
                setProblems((prev) => [...prev, ...response.problems]);
            } else {
                setProblems(response.problems);
            }
            setPagination(response.pagination);
            setCurrentPage(page);
        } catch (error) {
            toast.error('Failed to load problems');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleSearch = () => {
        loadProblems(1, false);
    };

    // Infinite scroll using IntersectionObserver
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && pagination?.hasMore && !isLoading && !isLoadingMore) {
                    loadProblems(currentPage + 1, true);
                }
            },
            { threshold: 0.1 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [pagination, currentPage, isLoading, isLoadingMore]);

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'Easy': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
            case 'Medium': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
            case 'Hard': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    // Get tags for a problem (use actual tags or default based on difficulty)
    const getTagsForProblem = (problem: ProblemData) => {
        if (problem.tags && problem.tags.length > 0) {
            return problem.tags.slice(0, 3);
        }
        // Default tags based on difficulty
        switch (problem.difficulty) {
            case 'Easy': return ['Array', 'String'];
            case 'Medium': return ['Hash Table', 'Dynamic Programming'];
            case 'Hard': return ['Graph', 'Binary Search'];
            default: return ['Algorithm'];
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2">Problem Search</h1>
                    <p className="text-muted-foreground">
                        Find LeetCode problems to practice or add to your contests
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-border mb-6">
                        <CardContent className="p-6">
                            <Tabs value={searchTab} onValueChange={(v) => setSearchTab(v as 'general' | 'company')}>
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="general" className="gap-2">
                                        <Search className="w-4 h-4" />
                                        Search Problems
                                    </TabsTrigger>
                                    <TabsTrigger value="company" className="gap-2">
                                        <Building2 className="w-4 h-4" />
                                        By Company
                                    </TabsTrigger>
                                </TabsList>

                                {/* General Search Tab */}
                                <TabsContent value="general" className="space-y-4 mt-0">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Search by problem title or slug..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                className="h-12"
                                            />
                                        </div>
                                        <Select value={difficulty} onValueChange={setDifficulty}>
                                            <SelectTrigger className="w-full md:w-40 h-12">
                                                <SelectValue placeholder="Difficulty" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="Easy">Easy</SelectItem>
                                                <SelectItem value="Medium">Medium</SelectItem>
                                                <SelectItem value="Hard">Hard</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Tag Selection Dialog */}
                                        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="h-12 gap-2">
                                                    <Tag className="w-4 h-4" />
                                                    Tags {searchTags.length > 0 && `(${searchTags.length})`}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
                                                <DialogHeader>
                                                    <DialogTitle>Select Tags</DialogTitle>
                                                    <DialogDescription>
                                                        Select problem categories to filter by
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <Input
                                                        placeholder="Filter tags..."
                                                        value={tagFilter}
                                                        onChange={(e) => setTagFilter(e.target.value)}
                                                    />
                                                    <ScrollArea className="h-[300px]">
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pr-4">
                                                            {LEETCODE_TAGS
                                                                .filter(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
                                                                .map((tag) => {
                                                                    const isSelected = searchTags.includes(tag);
                                                                    return (
                                                                        <Button
                                                                            key={tag}
                                                                            variant={isSelected ? "default" : "outline"}
                                                                            size="sm"
                                                                            className="justify-start text-xs h-8"
                                                                            onClick={() => {
                                                                                if (isSelected) {
                                                                                    setSearchTags(prev => prev.filter(t => t !== tag));
                                                                                } else {
                                                                                    setSearchTags(prev => [...prev, tag]);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                                            {tag}
                                                                        </Button>
                                                                    );
                                                                })}
                                                        </div>
                                                    </ScrollArea>
                                                    <div className="flex justify-between">
                                                        <Button variant="ghost" size="sm" onClick={() => setSearchTags([])}>
                                                            Clear All
                                                        </Button>
                                                        <Button onClick={() => { setTagDialogOpen(false); handleSearch(); }}>
                                                            Apply ({searchTags.length} selected)
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Button onClick={() => handleSearch()} disabled={isLoading} className="h-12">
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Searching...
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="w-4 h-4 mr-2" />
                                                    Search
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Selected Tags Display */}
                                    {searchTags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {searchTags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="gap-1">
                                                    {tag}
                                                    <button
                                                        onClick={() => {
                                                            setSearchTags(prev => prev.filter(t => t !== tag));
                                                            setTimeout(() => handleSearch(), 0);
                                                        }}
                                                        className="ml-1 hover:text-destructive"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => { setSearchTags([]); setTimeout(() => handleSearch(), 0); }}
                                            >
                                                Clear all
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Company Search Tab */}
                                <TabsContent value="company" className="mt-0">
                                    <CompanyProblemsView />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Results */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code2 className="w-5 h-5 text-primary" />
                                Problems
                            </CardTitle>
                            {pagination && (
                                <CardDescription>
                                    Showing {problems.length} of {pagination.total} results
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            {isLoading && problems.length === 0 ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <Skeleton key={i} className="h-14 rounded-lg" />
                                    ))}
                                </div>
                            ) : problems.length === 0 ? (
                                <div className="text-center py-16">
                                    <Code2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                                    <p className="text-muted-foreground">No problems found</p>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-lg border border-border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">#</TableHead>
                                                    <TableHead>Title</TableHead>
                                                    <TableHead className="w-48 hidden md:table-cell">Tags</TableHead>
                                                    <TableHead className="w-24">Difficulty</TableHead>
                                                    <TableHead className="w-20 text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {problems.map((problem, index) => (
                                                    <TableRow key={`${problem.title_slug}-${index}`}>
                                                        <TableCell className="font-mono text-muted-foreground">
                                                            {problem.questionId || index + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{problem.title}</p>
                                                                <p className="text-xs text-muted-foreground">{problem.title_slug}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell">
                                                            <div className="flex flex-wrap gap-1">
                                                                {getTagsForProblem(problem).map((tag) => (
                                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={getDifficultyColor(problem.difficulty)}>
                                                                {problem.difficulty}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <a
                                                                href={`https://leetcode.com/problems/${problem.title_slug}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button variant="ghost" size="sm">
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </Button>
                                                            </a>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Infinite Scroll Loader */}
                                    <div ref={loaderRef} className="py-4 flex justify-center">
                                        {isLoadingMore && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm">Loading more...</span>
                                            </div>
                                        )}
                                        {pagination && !pagination.hasMore && problems.length > 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                Showing all {pagination.total} problems
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

export default function ProblemsPage() {
    return (
        <ProtectedRoute>
            <ProblemsContent />
        </ProtectedRoute>
    );
}
