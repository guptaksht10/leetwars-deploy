'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, User, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const [name, setName] = useState(session?.user?.name || '');
    const [leetcodeUsername, setLeetcodeUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

    // Redirect if not authenticated or already has leetcode_username
    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/login');
            return;
        }

        // If user already has a LeetCode username, redirect to dashboard
        if ((session.user as any)?.leetcode_username) {
            router.push('/dashboard');
        }
    }, [session, status, router]);

    // Debounced username validation
    useEffect(() => {
        if (!leetcodeUsername || leetcodeUsername.length < 2) {
            setValidationStatus('idle');
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsValidating(true);
            try {
                // Call backend to validate LeetCode username
                const response = await fetch(`${API_BASE_URL}/onboarding/validate-leetcode/${leetcodeUsername}`);
                const data = await response.json();

                if (response.ok && data.valid) {
                    setValidationStatus('valid');
                } else {
                    setValidationStatus('invalid');
                }
            } catch {
                setValidationStatus('invalid');
            } finally {
                setIsValidating(false);
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [leetcodeUsername]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Please enter your name');
            return;
        }

        if (!leetcodeUsername) {
            toast.error('Please enter your LeetCode username');
            return;
        }

        if (validationStatus !== 'valid') {
            toast.error('Please enter a valid LeetCode username');
            return;
        }

        setIsLoading(true);
        try {
            // Get the backend token from session
            const backendToken = (session as any)?.backendToken;

            const response = await fetch(`${API_BASE_URL}/onboarding/set-leetcode-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${backendToken}`,
                },
                body: JSON.stringify({
                    leetcode_username: leetcodeUsername,
                    name: name.trim()
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to set LeetCode username');
            }

            toast.success('Profile completed! Welcome to LeetWars!');

            // Update the session to reflect the new leetcode_username
            await update();

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to complete profile');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center glow">
                            <Trophy className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-bold glow-text text-primary">LeetWars</span>
                    </div>
                </div>

                <Card className="border-border">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">Complete Your Profile</CardTitle>
                        <CardDescription className="text-center">
                            Connect your LeetCode account to start competing
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {/* Welcome message */}
                            <div className="bg-secondary/50 rounded-lg p-4 text-sm">
                                <p className="font-medium mb-1">Welcome, {session?.user?.name || session?.user?.email}! 👋</p>
                                <p className="text-muted-foreground">
                                    To participate in contests and track your progress, please link your LeetCode account.
                                </p>
                            </div>

                            {/* Name Input */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Display Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This is how others will see you on LeetWars
                                </p>
                            </div>

                            {/* LeetCode Username Input */}
                            <div className="space-y-2">
                                <Label htmlFor="leetcode_username">LeetCode Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="leetcode_username"
                                        type="text"
                                        placeholder="your-leetcode-username"
                                        value={leetcodeUsername}
                                        onChange={(e) => setLeetcodeUsername(e.target.value)}
                                        className="pl-10 pr-10"
                                        disabled={isLoading}
                                    />
                                    {/* Validation status indicator */}
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isValidating && (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        )}
                                        {!isValidating && validationStatus === 'valid' && (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        )}
                                        {!isValidating && validationStatus === 'invalid' && (
                                            <AlertCircle className="w-4 h-4 text-destructive" />
                                        )}
                                    </div>
                                </div>
                                {validationStatus === 'valid' && (
                                    <p className="text-xs text-green-500 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Valid LeetCode profile found
                                    </p>
                                )}
                                {validationStatus === 'invalid' && !isValidating && leetcodeUsername.length >= 2 && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Username not found or profile is not public
                                    </p>
                                )}
                            </div>

                            {/* Help link */}
                            <div className="text-sm text-muted-foreground">
                                <a
                                    href="https://leetcode.com/profile/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    Find your LeetCode username
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 mt-2">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || validationStatus !== 'valid'}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Completing profile...
                                    </>
                                ) : (
                                    'Complete Profile'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Why we need this */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="mt-6 p-4 rounded-lg bg-card/50 border border-border"
                >
                    <h3 className="font-medium mb-2 text-sm">Why do we need your LeetCode username?</h3>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Track your contest submissions automatically</li>
                        <li>• Calculate scores based on your LeetCode activity</li>
                        <li>• Provide AI-powered analysis of your progress</li>
                    </ul>
                </motion.div>
            </motion.div>
        </div>
    );
}
