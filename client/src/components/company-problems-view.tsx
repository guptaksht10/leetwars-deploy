'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { companyApi, CompanyData, CompanyProblem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    Search,
    Building2,
    TrendingUp,
    Clock,
    ExternalLink,
    Loader2,
} from 'lucide-react';

interface CompanyProblemsViewProps {
    showAddButton?: boolean; // If false, shows external link instead
}

export function CompanyProblemsView({ showAddButton = false }: CompanyProblemsViewProps) {
    const [companies, setCompanies] = useState<CompanyData[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
    const [problems, setProblems] = useState<CompanyProblem[]>([]);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [isLoadingProblems, setIsLoadingProblems] = useState(false);
    const [searchDifficulty, setSearchDifficulty] = useState<string>('all');
    const [companySearchQuery, setCompanySearchQuery] = useState('');

    // Load companies on mount
    useEffect(() => {
        loadCompanies();
    }, []);

    // Load problems when company is selected
    useEffect(() => {
        if (selectedCompany) {
            loadProblems(selectedCompany.name, searchDifficulty);
        }
    }, [selectedCompany, searchDifficulty]);

    const loadCompanies = async () => {
        setIsLoadingCompanies(true);
        try {
            const response = await companyApi.getCompanies();
            setCompanies(response.companies);
        } catch (error) {
            toast.error('Failed to load companies');
            console.error(error);
        } finally {
            setIsLoadingCompanies(false);
        }
    };

    const loadProblems = async (companyName: string, difficulty: string) => {
        setIsLoadingProblems(true);
        try {
            const response = await companyApi.getCompanyProblems(
                companyName,
                difficulty === 'all' ? undefined : difficulty
            );
            setProblems(response.problems);
        } catch (error) {
            toast.error('Failed to load problems');
            console.error(error);
        } finally {
            setIsLoadingProblems(false);
        }
    };

    const handleCompanySelect = (companyName: string) => {
        const company = companies.find(c => c.name === companyName);
        if (company) {
            setSelectedCompany(company);
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

    const getFrequencyColor = (frequency: number) => {
        if (frequency >= 10) return 'text-red-500';
        if (frequency >= 5) return 'text-orange-500';
        return 'text-yellow-500';
    };

    const filteredCompanies = companies.filter(company =>
        company.displayName.toLowerCase().includes(companySearchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Company Selection */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Select Company</label>

                {isLoadingCompanies ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <div className="space-y-2">
                        {/* Search Input with Live Results */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Type to search companies..."
                                value={companySearchQuery}
                                onChange={(e) => setCompanySearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Live Filtered Results */}
                        {companySearchQuery && (
                            <ScrollArea className="h-[200px] border rounded-md bg-background">
                                {filteredCompanies.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No companies found matching "{companySearchQuery}"
                                    </div>
                                ) : (
                                    <div className="p-1">
                                        {filteredCompanies.map((company) => (
                                            <button
                                                key={company.name}
                                                onClick={() => {
                                                    handleCompanySelect(company.name);
                                                    setCompanySearchQuery('');
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left ${selectedCompany?.name === company.name ? 'bg-primary/10' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" />
                                                    <span className="text-sm">{company.displayName}</span>
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                    {company.problemCount}
                                                </Badge>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        )}

                        {/* Selected Company Display */}
                        {selectedCompany && !companySearchQuery && (
                            <div className="flex items-center justify-between p-3 rounded-md border bg-secondary/50">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    <span className="font-medium">{selectedCompany.displayName}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {selectedCompany.problemCount} problems
                                    </Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCompany(null)}
                                >
                                    Change
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Difficulty Filter */}
            {selectedCompany && (
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Difficulty:</label>
                    <Select value={searchDifficulty} onValueChange={setSearchDifficulty}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Problems List */}
            <ScrollArea className="h-[400px]">
                {!selectedCompany ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Select a company to view problems</p>
                    </div>
                ) : isLoadingProblems ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-lg" />
                        ))}
                    </div>
                ) : problems.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No problems found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <AnimatePresence>
                            {problems.map((problem, index) => (
                                <motion.div
                                    key={problem.title_slug}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <p className="font-medium text-sm">{problem.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {problem.title_slug}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className={getDifficultyColor(problem.difficulty)}
                                                >
                                                    {problem.difficulty}
                                                </Badge>

                                                <div className="flex items-center gap-1 text-xs">
                                                    <TrendingUp
                                                        className={`w-3 h-3 ${getFrequencyColor(
                                                            problem.frequency
                                                        )}`}
                                                    />
                                                    <span className="text-muted-foreground">
                                                        Asked {problem.frequency}x
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{problem.lastAsked}</span>
                                                </div>

                                                <Badge variant="outline" className="text-xs">
                                                    {problem.acceptanceRate}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <a
                                            href={problem.leetcodeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button variant="ghost" size="sm">
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </a>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
