'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { setBackendToken } from '@/lib/api';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Search,
    User,
    Bot,
    LogOut,
    Menu,
    X,
    Plus,
    Globe,
    Swords,
} from 'lucide-react';
import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/contests/my', label: 'My Contests', icon: Swords },
    { href: '/contests/create', label: 'Create Contest', icon: Plus },
    { href: '/contests/public', label: 'Public Contests', icon: Globe },
    { href: '/problems', label: 'Problems', icon: Search },
    { href: '/bot', label: 'AI Coach', icon: Bot },
];

export function Navbar() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isNavigating, setIsNavigating] = useState(false);
    const [targetPath, setTargetPath] = useState<string | null>(null);

    // Set the backend token when session is available
    useEffect(() => {
        if (session && (session as any).backendToken) {
            setBackendToken((session as any).backendToken);
        } else {
            setBackendToken(null);
        }
    }, [session]);

    // Reset navigation state when pathname changes
    useEffect(() => {
        setIsNavigating(false);
        setTargetPath(null);
    }, [pathname]);

    const handleNavigation = (href: string) => {
        if (href === pathname) return;

        setIsNavigating(true);
        setTargetPath(href);
        setMobileMenuOpen(false);

        startTransition(() => {
            router.push(href);
        });
    };

    const handleLogout = async () => {
        setBackendToken(null);
        await signOut({ callbackUrl: '/login' });
    };

    // Don't show navbar if not authenticated or still loading
    if (status === 'loading') return null;
    if (!session) return null;

    // Get user display info
    const user = session.user;
    const displayName = user?.name || (user as any)?.leetcode_username || user?.email?.split('@')[0] || 'User';
    const avatarFallback = displayName.charAt(0).toUpperCase();

    const showLoading = isPending || isNavigating;

    return (
        <>
            {/* Top Loading Bar */}
            <AnimatePresence>
                {showLoading && (
                    <motion.div
                        className="fixed top-0 left-0 right-0 z-[60] h-1 bg-primary/20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: '0%' }}
                            animate={{ width: '90%' }}
                            transition={{ duration: 2, ease: 'easeOut' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className="fixed top-0 left-0 right-0 z-50 glass border-b border-border"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <button
                            onClick={() => handleNavigation('/dashboard')}
                            className="flex items-center gap-2"
                        >
                            <motion.div
                                className="w-10 h-10 rounded-lg overflow-hidden"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Image
                                    src="/logo.png"
                                    alt="LeetWars Logo"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            </motion.div>
                            <span className="text-xl font-bold glow-text text-primary">LeetWars</span>
                        </button>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                const isLoading = showLoading && targetPath === item.href;
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => handleNavigation(item.href)}
                                        disabled={isLoading}
                                    >
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                                                } ${isLoading ? 'opacity-70' : ''}`}
                                        >
                                            {isLoading ? (
                                                <motion.div
                                                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                                />
                                            ) : (
                                                <Icon className="w-4 h-4" />
                                            )}
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </motion.div>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                        <Avatar className="h-10 w-10 border-2 border-primary">
                                            {user?.image && (
                                                <AvatarImage src={user.image} alt={displayName} />
                                            )}
                                            <AvatarFallback className="bg-secondary text-foreground">
                                                {avatarFallback}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end">
                                    <div className="flex items-center justify-start gap-2 p-2">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium">{displayName}</p>
                                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <button
                                            onClick={() => handleNavigation('/profile')}
                                            className="w-full cursor-pointer"
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            Profile
                                        </button>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Mobile menu button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.nav
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-t border-border"
                        >
                            <div className="px-4 py-2 space-y-1">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    const isLoading = showLoading && targetPath === item.href;
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.href}
                                            onClick={() => handleNavigation(item.href)}
                                            className="w-full"
                                            disabled={isLoading}
                                        >
                                            <div
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                                                    } ${isLoading ? 'opacity-70' : ''}`}
                                            >
                                                {isLoading ? (
                                                    <motion.div
                                                        className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                                    />
                                                ) : (
                                                    <Icon className="w-5 h-5" />
                                                )}
                                                <span className="font-medium">{item.label}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.nav>
                    )}
                </AnimatePresence>
            </motion.header>
        </>
    );
}
