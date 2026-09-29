'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { setBackendToken } from '@/lib/api';

interface User {
    id: string;
    username: string;
    email: string;
    leetcode_username: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'leetwars_token';
const USER_KEY = 'leetwars_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // NextAuth session
    const { data: session, status: sessionStatus } = useSession();

    useEffect(() => {
        // If NextAuth session has a backendToken, use it (OAuth users)
        if (sessionStatus === 'loading') return;

        if (session && (session as any).backendToken) {
            const backendToken = (session as any).backendToken as string;
            // Sync the backend token into the api.ts module
            setBackendToken(backendToken);

            // Build a user object from the NextAuth session
            const sessionUser: User = {
                id: (session.user as any)?.id || '',
                username: (session.user as any)?.name || session.user?.email || '',
                email: session.user?.email || '',
                leetcode_username: (session.user as any)?.leetcode_username || '',
            };

            setToken(backendToken);
            setUser(sessionUser);
            setIsLoading(false);
            return;
        }

        // Fallback: legacy localStorage token (email/password login)
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser && storedToken !== 'undefined' && storedToken !== 'null' && storedUser !== 'undefined') {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                setBackendToken(storedToken);
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            }
        }

        setIsLoading(false);
    }, [session, sessionStatus]);

    // Redirect based on auth state
    useEffect(() => {
        if (isLoading) return;

        const publicPaths = ['/', '/login', '/register', '/complete-profile'];
        const isPublicPath = publicPaths.includes(pathname);

        if (!token && !isPublicPath) {
            router.push('/login');
        } else if (token && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
            router.push('/dashboard');
        }
    }, [token, pathname, isLoading, router]);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        setBackendToken(newToken);
        router.push('/dashboard');
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        setBackendToken(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login,
                logout,
                isAuthenticated: !!token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Protected route wrapper component (legacy — prefer components/auth/protected-route.tsx)
export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 animate-ping" />
                    <span className="text-muted-foreground">Loading...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
