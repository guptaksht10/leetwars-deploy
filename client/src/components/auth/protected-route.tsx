'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireLeetCodeUsername?: boolean;
}

/**
 * Protected route wrapper that:
 * 1. Redirects unauthenticated users to /login
 * 2. Optionally redirects users without leetcode_username to /complete-profile
 */
export function ProtectedRoute({
    children,
    requireLeetCodeUsername = true
}: ProtectedRouteProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === 'loading') return;

        // Not authenticated - redirect to login
        if (!session) {
            router.push(`/login`);
            return;
        }

        // Authenticated but no LeetCode username - redirect to complete profile
        if (requireLeetCodeUsername && !(session.user as any)?.leetcode_username) {
            router.push('/complete-profile');
            return;
        }
    }, [session, status, router, pathname, requireLeetCodeUsername]);

    // Show loading while checking auth
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    // Missing LeetCode username
    if (requireLeetCodeUsername && !(session.user as any)?.leetcode_username) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Please complete your profile...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Hook to get the current authenticated user with type safety
 */
export function useAuthUser() {
    const { data: session, status } = useSession();

    return {
        user: session?.user ? {
            id: (session.user as any).id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            leetcode_username: (session.user as any).leetcode_username,
        } : null,
        isLoading: status === 'loading',
        isAuthenticated: !!session,
        session,
    };
}
