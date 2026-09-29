'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function NavigationProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Reset when navigation completes
        setIsNavigating(false);
        setProgress(0);
    }, [pathname, searchParams]);

    useEffect(() => {
        // Listen for route changes
        const handleStart = () => {
            setIsNavigating(true);
            setProgress(20);
        };

        // Simulate progress
        let progressInterval: NodeJS.Timeout;
        if (isNavigating) {
            progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) return prev;
                    return prev + 10;
                });
            }, 200);
        }

        return () => {
            if (progressInterval) clearInterval(progressInterval);
        };
    }, [isNavigating]);

    return (
        <AnimatePresence>
            {isNavigating && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-50 h-1"
                >
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: 'easeOut' }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Loading spinner for buttons
export function ButtonSpinner({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`animate-spin h-4 w-4 ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}
