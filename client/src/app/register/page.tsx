'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Registration page now redirects to login since we use OAuth-only authentication.
 * Users will sign in with Google/GitHub and then complete their profile.
 */
export default function RegisterPage() {
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace('/dashboard');
        } else if (status === 'unauthenticated') {
            router.replace('/login');
        }
    }, [router, status]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
    );
}
