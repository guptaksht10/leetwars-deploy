'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Compass, AlertCircle, Ghost } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Mesmerizing Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-primary/10 blur-xl"
                        initial={{
                            x: Math.random() * 100 + '%',
                            y: Math.random() * 100 + '%',
                            scale: Math.random() * 0.5 + 0.5,
                        }}
                        animate={{
                            y: [null, Math.random() * -100 - 50],
                            opacity: [0, 0.3, 0],
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5,
                        }}
                        style={{
                            width: Math.random() * 200 + 50 + 'px',
                            height: Math.random() * 200 + 50 + 'px',
                        }}
                    />
                ))}
            </div>

            {/* "Broken" UI elements */}
            <div className="relative z-10 text-center flex flex-col items-center">
                <motion.div
                    className="relative mb-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div
                        className="flex gap-4 items-center justify-center"
                        animate={{
                            rotate: [-1, 1, -1],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <span className="text-9xl font-black text-primary/20 select-none">4</span>

                        <motion.div
                            className="relative"
                            animate={{
                                y: [-10, 10, -10],
                                rotate: [0, 10, -5, 0],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Ghost className="w-32 h-32 text-primary glow-text" strokeWidth={1.5} />
                            <motion.div
                                className="absolute -top-4 -right-2"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <AlertCircle className="w-8 h-8 text-destructive fill-destructive/20" />
                            </motion.div>
                        </motion.div>

                        <span className="text-9xl font-black text-primary/20 select-none">4</span>
                    </motion.div>

                    {/* Glitch overlays */}
                    <motion.div
                        className="absolute inset-0 text-9xl font-black flex justify-center items-center pointer-events-none opacity-40 mix-blend-screen"
                        animate={{
                            x: [-2, 2, -1, 3, -2],
                            y: [1, -1, 2, -2, 1],
                            opacity: [0, 0.3, 0, 0.2, 0]
                        }}
                        transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
                    >
                        <span className="mr-[13.5rem]">4</span>
                        <div className="w-32" />
                        <span>4</span>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="space-y-6"
                >
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                            Oops... Area <span className="text-primary glow-text">Null</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-md mx-auto">
                            The page you're looking for has drifted into deep space or never existed in this dimension.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                        <Link href="/dashboard">
                            <Button size="lg" className="px-8 gap-2 group relative overflow-hidden">
                                <motion.span
                                    className="absolute inset-0 bg-primary-foreground/10 translate-x-[-100%]"
                                    whileHover={{ x: '100%' }}
                                    transition={{ duration: 0.5 }}
                                />
                                <Home className="w-4 h-4" />
                                Return to Dashboard
                            </Button>
                        </Link>

                        <Button
                            variant="outline"
                            size="lg"
                            className="px-8 gap-2 hover:bg-secondary border-dashed"
                            onClick={() => window.history.back()}
                        >
                            <Compass className="w-4 h-4" />
                            Navigate Back
                        </Button>
                    </div>
                </motion.div>

                {/* Decorative "Broken" code snippets */}
                <div className="mt-16 grid grid-cols-2 gap-8 opacity-20 font-mono text-xs select-none">
                    <motion.div
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-left"
                    >
                        <code>
                            if (path === undefined) {"{"}<br />
                            &nbsp;&nbsp;throw new GhostException();<br />
                            {"}"}
                        </code>
                    </motion.div>
                    <motion.div
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                        className="text-right"
                    >
                        <code>
                            // Memory Leak Detected<br />
                            while(status === 404) {"{"}<br />
                            &nbsp;&nbsp;float_through_space();<br />
                            {"}"}
                        </code>
                    </motion.div>
                </div>
            </div>

            {/* Scanning line animation */}
            <motion.div
                className="absolute left-0 w-full h-[1px] bg-primary/20 z-0"
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}
