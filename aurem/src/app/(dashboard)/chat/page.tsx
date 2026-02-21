"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Paperclip,
    Sparkles,
    AlertTriangle,
    ChevronDown,
    Info,
    BookOpen,
    Lightbulb,
    HelpCircle,
    CheckCircle2,
    Copy,
    RotateCcw,
} from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";
import type { ChatMessage } from "@/types";

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedDoc, setUploadedDoc] = useState<string | null>(null);
    const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { canUseFeature, incrementUsage, triggerUpgrade, getRemainingUses } = useSubscription();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        if (!canUseFeature("chatMessages")) {
            triggerUpgrade("Smart Chat messages");
            return;
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        incrementUsage("chatMessages");

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    documentContext: uploadedDoc,
                }),
            });

            const data = await response.json();

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.content || data.error || "I couldn't process that. Please try again.",
                timestamp: new Date(),
                confidenceScore: data.confidenceScore,
                citations: data.citations,
                isConceptGated: data.isConceptGated,
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "Sorry, I'm having trouble connecting. Please check your internet and try again.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === "application/pdf" || file.type === "text/plain") {
            const text = await file.text();
            setUploadedDoc(text.substring(0, 50000));
            setUploadedDocName(file.name);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const remaining = getRemainingUses("chatMessages");

    return (
        <div className="flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 no-scrollbar">
                {/* Welcome State */}
                {messages.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-full text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aurem-500/20 to-pink-500/20 flex items-center justify-center mb-6 border border-aurem-500/20">
                            <Sparkles className="w-8 h-8 text-aurem-500" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Smart Chat</h2>
                        <p className="text-white/40 max-w-md mb-8">
                            RAG-grounded AI tutor. Upload your notes for personalized, hallucination-resistant help.
                        </p>

                        {/* Quick Prompts */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                            {[
                                { icon: Lightbulb, text: "Explain Newton's Laws with examples", color: "text-amber-400" },
                                { icon: HelpCircle, text: "What is photosynthesis?", color: "text-emerald-400" },
                                { icon: BookOpen, text: "Help me understand quadratic equations", color: "text-blue-400" },
                                { icon: Info, text: "Explain the water cycle step by step", color: "text-cyan-400" },
                            ].map((prompt) => (
                                <button
                                    key={prompt.text}
                                    onClick={() => setInput(prompt.text)}
                                    className="glass-panel-hover p-4 text-left group"
                                >
                                    <prompt.icon className={`w-4 h-4 ${prompt.color} mb-2`} />
                                    <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                                        {prompt.text}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Messages */}
                <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`max-w-[85%] md:max-w-[70%] ${msg.role === "user" ? "message-user" : "message-ai"}`}>
                                {/* Conceptual Gate Badge */}
                                {msg.isConceptGated && (
                                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-white/[0.06]">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-xs text-amber-400 font-medium">Concept Check — Understand before proceeding</span>
                                    </div>
                                )}

                                {/* Message Content */}
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                                {/* Confidence Score */}
                                {msg.confidenceScore !== undefined && (
                                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/[0.06]">
                                        <div className="flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            <span className="text-[11px] text-white/30">
                                                Confidence: {Math.round(msg.confidenceScore * 100)}%
                                            </span>
                                        </div>
                                        {msg.citations && msg.citations.length > 0 && (
                                            <span className="text-[11px] text-white/20">
                                                • {msg.citations.length} source{msg.citations.length > 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                {msg.role === "assistant" && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <button
                                            onClick={() => navigator.clipboard.writeText(msg.content)}
                                            className="text-white/20 hover:text-white/50 transition-colors"
                                            title="Copy"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                    >
                        <div className="message-ai">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                                            className="w-2 h-2 rounded-full bg-aurem-500"
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-white/30">AUREM is thinking...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Document Upload Badge */}
            {uploadedDocName && (
                <div className="px-4 md:px-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-aurem-500/10 border border-aurem-500/20 text-xs text-aurem-400">
                        <Paperclip className="w-3 h-3" />
                        <span>{uploadedDocName}</span>
                        <button onClick={() => { setUploadedDoc(null); setUploadedDocName(null); }} className="text-aurem-400/50 hover:text-aurem-400">×</button>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 md:px-8 md:pb-6">
                <div className="glass-panel p-2 flex items-end gap-2">
                    <label className="btn-ghost p-2.5 cursor-pointer flex-shrink-0" title="Upload notes">
                        <Paperclip className="w-5 h-5" />
                        <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} />
                    </label>

                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about your studies..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-white/30 py-2.5 px-2 resize-none focus:outline-none text-sm max-h-32"
                        style={{ minHeight: "40px" }}
                        id="chat-input"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="btn-primary p-2.5 rounded-xl disabled:opacity-30 flex-shrink-0"
                        id="chat-send"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>

                {remaining !== Infinity && (
                    <p className="text-[11px] text-white/20 mt-2 text-center">
                        {remaining} message{remaining !== 1 ? "s" : ""} remaining today •{" "}
                        <button onClick={() => triggerUpgrade("chat")} className="text-aurem-500/70 hover:text-aurem-500">
                            Upgrade for unlimited
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
}
