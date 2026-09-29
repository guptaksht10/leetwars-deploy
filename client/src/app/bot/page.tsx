'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { botApi, ChatMessage } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Bot,
    User,
    Send,
    Loader2,
    Zap,
    Flame,
    Lightbulb,
    BarChart3,
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Markdown message component with proper styling
function MarkdownMessage({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-2 text-primary border-b border-primary/20 pb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 text-primary/90">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-2">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-semibold mb-1">{children}</h4>,
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5">{children}</ol>,
                li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                code: ({ className, children }) => {
                    const isInline = !className;
                    if (isInline) {
                        return <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs border border-primary/20">{children}</code>;
                    }
                    return (
                        <pre className="my-3 p-4 rounded-lg bg-background/70 border border-border overflow-x-auto">
                            <code className="font-mono text-xs leading-relaxed">{children}</code>
                        </pre>
                    );
                },
                pre: ({ children }) => <>{children}</>,
                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/50 pl-4 my-3 italic bg-primary/5 py-2 rounded-r">{children}</blockquote>
                ),
                hr: () => <hr className="my-4 border-border" />,
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {children}
                    </a>
                ),
                // Table components with proper styling
                table: ({ children }) => (
                    <div className="my-4 overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm border-collapse">{children}</table>
                    </div>
                ),
                thead: ({ children }) => <thead className="bg-secondary/70">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-secondary/30 transition-colors">{children}</tr>,
                th: ({ children }) => (
                    <th className="px-3 py-2.5 text-left font-semibold text-foreground border-b border-border whitespace-nowrap">
                        {children}
                    </th>
                ),
                td: ({ children }) => (
                    <td className="px-3 py-2 text-muted-foreground">
                        {children}
                    </td>
                ),
                // Strikethrough support
                del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

function BotContent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const addMessage = (role: 'user' | 'assistant', content: string) => {
        setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        addMessage('user', userMessage);

        setIsLoading(true);
        try {
            const conversationHistory: ChatMessage[] = messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const response = await botApi.chat(userMessage, conversationHistory);
            addMessage('assistant', response.reply);
        } catch (error) {
            toast.error('Failed to get response');
            addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = async (action: 'analyze' | 'roast' | 'suggestions') => {
        setActiveAction(action);
        setIsLoading(true);

        try {
            let response: string;

            switch (action) {
                case 'analyze':
                    addMessage('user', '📊 Analyze my progress');
                    const analysisRes = await botApi.analyze();
                    response = analysisRes.analysis;
                    break;
                case 'roast':
                    addMessage('user', '🔥 Roast my LeetCode profile');
                    const roastRes = await botApi.roast('brutal');
                    response = roastRes.roast;
                    break;
                case 'suggestions':
                    addMessage('user', '💡 Give me improvement suggestions');
                    const suggestionsRes = await botApi.getSuggestions();
                    response = suggestionsRes.suggestions;
                    break;
            }

            addMessage('assistant', response);
        } catch (error) {
            toast.error('Failed to get response');
            addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        } finally {
            setIsLoading(false);
            setActiveAction(null);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Bot className="w-8 h-8 text-primary" />
                        AI Coach
                    </h1>
                    <p className="text-muted-foreground">
                        Get personalized insights, roasts, and improvement suggestions based on your LeetCode stats
                    </p>
                </motion.div>

                <div className="grid gap-6">
                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Quick Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-3">
                                    <Button
                                        variant="secondary"
                                        className="h-auto py-4 flex flex-col gap-2"
                                        onClick={() => handleQuickAction('analyze')}
                                        disabled={isLoading}
                                    >
                                        {activeAction === 'analyze' ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <BarChart3 className="w-6 h-6 text-primary" />
                                        )}
                                        <span className="text-xs">Analyze</span>
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="h-auto py-4 flex flex-col gap-2"
                                        onClick={() => handleQuickAction('roast')}
                                        disabled={isLoading}
                                    >
                                        {activeAction === 'roast' ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <Flame className="w-6 h-6 text-orange-500" />
                                        )}
                                        <span className="text-xs">Roast Me</span>
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="h-auto py-4 flex flex-col gap-2"
                                        onClick={() => handleQuickAction('suggestions')}
                                        disabled={isLoading}
                                    >
                                        {activeAction === 'suggestions' ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <Lightbulb className="w-6 h-6 text-yellow-500" />
                                        )}
                                        <span className="text-xs">Suggestions</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Chat Interface */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-primary" />
                                    Chat
                                </CardTitle>
                                <CardDescription>
                                    Ask me anything about your coding progress
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
                                    {messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <Bot className="w-16 h-16 text-muted-foreground mb-4 opacity-30" />
                                            <p className="text-muted-foreground">
                                                Start a conversation or use a quick action above
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                <Badge variant="outline" className="cursor-pointer" onClick={() => setInput('How can I improve at dynamic programming?')}>
                                                    DP tips
                                                </Badge>
                                                <Badge variant="outline" className="cursor-pointer" onClick={() => setInput('What topics should I focus on?')}>
                                                    Focus areas
                                                </Badge>
                                                <Badge variant="outline" className="cursor-pointer" onClick={() => setInput('How am I doing compared to others?')}>
                                                    My ranking
                                                </Badge>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((message, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`flex items-start gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''
                                                            }`}
                                                    >
                                                        <div
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-secondary text-foreground'
                                                                }`}
                                                        >
                                                            {message.role === 'user' ? (
                                                                <User className="w-4 h-4" />
                                                            ) : (
                                                                <Bot className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div
                                                            className={`p-3 rounded-lg ${message.role === 'user'
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-secondary text-foreground'
                                                                }`}
                                                        >
                                                            {message.role === 'assistant' ? (
                                                                <div className="text-sm">
                                                                    <MarkdownMessage content={message.content} />
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            {isLoading && !activeAction && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex justify-start"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                                            <Bot className="w-4 h-4" />
                                                        </div>
                                                        <div className="p-3 rounded-lg bg-secondary">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </ScrollArea>

                                <div className="flex gap-2 mt-4">
                                    <Input
                                        placeholder="Ask about your progress..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        disabled={isLoading}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function BotPage() {
    return (
        <ProtectedRoute>
            <BotContent />
        </ProtectedRoute>
    );
}
