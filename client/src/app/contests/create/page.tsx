'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { contestApi, problemApi, ProblemData, Problem } from '@/lib/api';
import { LEETCODE_TAGS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Trophy,
    Search,
    Plus,
    X,
    Clock,
    Calendar,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Tag,
    Building2,
} from 'lucide-react';
import { CompanySearchSection } from '@/components/company-search-section';

interface SelectedProblem extends Problem {
    title?: string;
    difficulty?: string;
}

function CreateContestContent() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        startTime: '',
        duration: '60',
        isPublic: false,
    });
    const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDifficulty, setSearchDifficulty] = useState<string>('');
    const [searchTags, setSearchTags] = useState<string[]>([]);
    const [tagDialogOpen, setTagDialogOpen] = useState(false);
    const [tagFilter, setTagFilter] = useState('');
    const [searchResults, setSearchResults] = useState<ProblemData[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const searchLoaderRef = useRef<HTMLDivElement>(null);
    const [searchTab, setSearchTab] = useState<'general' | 'company'>('general');

    // Get today's date as minimum for date input
    const today = new Date().toISOString().split('T')[0];

    // Get minimum time (current time if today is selected)
    const getMinTime = () => {
        if (formData.startDate === today) {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        return '';
    };

    // Set default date and time to now + 5 minutes
    useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);
        setFormData((prev) => ({
            ...prev,
            startDate: dateStr,
            startTime: timeStr,
        }));
        // Auto-load problems on mount
        loadProblems(1, false);
    }, []);

    // Infinite scroll for search results
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isSearching && !isLoadingMore && searchResults.length > 0) {
                    loadProblems(currentPage + 1, true);
                }
            },
            { threshold: 0.1 }
        );

        if (searchLoaderRef.current) {
            observer.observe(searchLoaderRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, currentPage, isSearching, isLoadingMore, searchResults.length]);

    const loadProblems = async (page: number, append: boolean = false) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsSearching(true);
        }

        try {
            const response = await problemApi.search(
                searchQuery || undefined,
                searchDifficulty && searchDifficulty !== 'all' ? searchDifficulty : undefined,
                searchTags.length > 0 ? searchTags.join(',') : undefined,
                page,
                20
            );

            if (append) {
                setSearchResults((prev) => [...prev, ...response.problems]);
            } else {
                setSearchResults(response.problems);
            }
            setCurrentPage(page);
            setHasMore(response.pagination.hasMore);
        } catch (error) {
            toast.error('Failed to load problems');
        } finally {
            setIsSearching(false);
            setIsLoadingMore(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        setHasMore(true);
        loadProblems(1, false);
    };

    const addProblem = (problem: any) => {
        // Handle both ProblemData (from search) and formatted company problems
        const slug = problem.slug || problem.title_slug;

        if (selectedProblems.some((p) => p.slug === slug)) {
            toast.error('Problem already added');
            return;
        }

        setSelectedProblems((prev) => [
            ...prev,
            {
                problem_id: {
                    title: problem.title,
                    difficulty: problem.difficulty,
                    _id: problem._id || null
                },
                slug: slug,
                title: problem.title,
                difficulty: problem.difficulty,
                points: problem.points || (problem.difficulty === 'Easy' ? 3 : problem.difficulty === 'Medium' ? 4 : 6),
            },
        ]);
        toast.success(`Added: ${problem.title}`);
    };

    const removeProblem = (slug: string) => {
        setSelectedProblems((prev) => prev.filter((p) => p.slug !== slug));
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error('Please enter a contest name');
            return;
        }

        if (!formData.startDate || !formData.startTime) {
            toast.error('Please select start date and time');
            return;
        }

        if (selectedProblems.length === 0) {
            toast.error('Please add at least one problem');
            return;
        }

        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        if (startDateTime < new Date()) {
            toast.error('Start time must be in the future');
            return;
        }

        setIsCreating(true);
        try {
            const response = await contestApi.create(
                formData.name,
                startDateTime.toISOString(),
                parseInt(formData.duration),
                selectedProblems,
                formData.isPublic
            );
            toast.success(`Contest created! Code: ${response.contest.unique_code}`);
            router.push(`/contests/${response.contest.unique_code}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create contest');
        } finally {
            setIsCreating(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy':
                return 'text-green-500 bg-green-500/10';
            case 'Medium':
                return 'text-yellow-500 bg-yellow-500/10';
            case 'Hard':
                return 'text-red-500 bg-red-500/10';
            default:
                return 'text-muted-foreground bg-muted';
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2">Create Contest</h1>
                    <p className="text-muted-foreground">
                        Set up a new coding competition with LeetCode problems
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Contest Details */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-primary" />
                                    Contest Details
                                </CardTitle>
                                <CardDescription>Set up your contest parameters</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Contest Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Weekly Challenge #1"
                                        value={formData.name}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Start Date</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="date"
                                                type="date"
                                                value={formData.startDate}
                                                min={today}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                                                }
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="time">Start Time</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="time"
                                                type="time"
                                                value={formData.startTime}
                                                min={getMinTime()}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                                                }
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration (minutes)</Label>
                                    <Select
                                        value={formData.duration}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, duration: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select duration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="20">20 minutes</SelectItem>
                                            <SelectItem value="30">30 minutes</SelectItem>
                                            <SelectItem value="45">45 minutes</SelectItem>
                                            <SelectItem value="60">1 hour</SelectItem>
                                            <SelectItem value="90">1.5 hours</SelectItem>
                                            <SelectItem value="120">2 hours</SelectItem>
                                            <SelectItem value="180">3 hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                                    <div>
                                        <Label htmlFor="isPublic" className="font-medium">
                                            Public Contest
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Anyone can see and join this contest
                                        </p>
                                    </div>
                                    <Switch
                                        id="isPublic"
                                        checked={formData.isPublic}
                                        onCheckedChange={(checked) =>
                                            setFormData((prev) => ({ ...prev, isPublic: checked }))
                                        }
                                    />
                                </div>

                                {/* Selected Problems */}
                                <div className="space-y-3">
                                    <Label>Selected Problems ({selectedProblems.length})</Label>
                                    {selectedProblems.length === 0 ? (
                                        <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No problems selected yet</p>
                                            <p className="text-xs">Search and add problems from the right panel</p>
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-48">
                                            <div className="space-y-2">
                                                {selectedProblems.map((problem, index) => (
                                                    <div
                                                        key={problem.slug}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-medium text-muted-foreground">
                                                                {index + 1}.
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-medium">{problem.title}</p>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={getDifficultyColor(problem.difficulty || '')}
                                                                >
                                                                    {problem.difficulty} (+{problem.points} pts)
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeProblem(problem.slug)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleCreate}
                                    disabled={isCreating || selectedProblems.length === 0}
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Trophy className="mr-2 h-4 w-4" />
                                            Create Contest
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Problem Search */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Search className="w-5 h-5 text-primary" />
                                    Add Problems
                                </CardTitle>
                                <CardDescription>Search by title/tags or browse by company</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Tabs value={searchTab} onValueChange={(v) => setSearchTab(v as 'general' | 'company')}>
                                    <TabsList className="grid w-full grid-cols-2">
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
                                    <TabsContent value="general" className="space-y-4 mt-4">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Search by title or slug..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            />
                                            <Select value={searchDifficulty} onValueChange={setSearchDifficulty}>
                                                <SelectTrigger className="w-32">
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
                                                    <Button variant="outline" className="gap-2">
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
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

                                            <Button onClick={handleSearch} disabled={isSearching}>
                                                {isSearching ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Search className="w-4 h-4" />
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
                                                                // Auto-refresh search when removing tags
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

                                        <ScrollArea className="h-[400px]">
                                            {isSearching ? (
                                                <div className="space-y-3">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-16 rounded-lg" />
                                                    ))}
                                                </div>
                                            ) : searchResults.length === 0 ? (
                                                <div className="text-center py-10 text-muted-foreground">
                                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                    <p>Search for problems to add</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {searchResults.map((problem, index) => {
                                                        const isSelected = selectedProblems.some(
                                                            (p) => p.slug === problem.title_slug
                                                        );
                                                        return (
                                                            <div
                                                                key={`${problem.title_slug}-${index}`}
                                                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isSelected
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-border hover:border-primary/50'
                                                                    }`}
                                                            >
                                                                <div>
                                                                    <p className="font-medium text-sm">{problem.title}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className={getDifficultyColor(problem.difficulty)}
                                                                        >
                                                                            {problem.difficulty}
                                                                        </Badge>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {problem.title_slug}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant={isSelected ? 'secondary' : 'default'}
                                                                    size="sm"
                                                                    onClick={() => !isSelected && addProblem(problem)}
                                                                    disabled={isSelected}
                                                                >
                                                                    {isSelected ? (
                                                                        <>
                                                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                                                            Added
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Plus className="w-4 h-4 mr-1" />
                                                                            Add
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                    {/* Infinite scroll loader */}
                                                    <div ref={searchLoaderRef} className="py-2 flex justify-center">
                                                        {isLoadingMore && (
                                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>

                                    {/* Company Search Tab */}
                                    <TabsContent value="company" className="mt-4">
                                        <CompanySearchSection
                                            onProblemAdd={addProblem}
                                            selectedProblems={selectedProblems}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function CreateContestPage() {
    return (
        <ProtectedRoute>
            <CreateContestContent />
        </ProtectedRoute>
    );
}
