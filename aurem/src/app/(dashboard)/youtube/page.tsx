"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Youtube, Search, Loader2, BookOpen, Layers, Brain, FileText,
    Sparkles, ChevronRight, ExternalLink, Clock, AlertTriangle,
} from "lucide-react";

interface FlashcardData { front: string; back: string; difficulty: string; topic?: string }
interface QuestionData { id: string; question: string; options?: string[]; correctAnswer: string; explanation: string; difficulty: string; topic: string }

type Tab = "summary" | "notes" | "flashcards" | "quiz";

export default function YouTubePage() {
    const [url, setUrl] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("summary");
    const [data, setData] = useState<{
        videoId: string; thumbnail: string; summary: string;
        notes: string[]; flashcards: FlashcardData[]; questions: QuestionData[];
    } | null>(null);
    const [error, setError] = useState("");
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
    const [showQuizAnswers, setShowQuizAnswers] = useState(false);

    const handleProcess = async () => {
        if (!url.trim()) return;
        setIsProcessing(true);
        setError("");
        setData(null);
        try {
            const res = await fetch("/api/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setData(result);
            setActiveTab("summary");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to process video");
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleFlip = (i: number) => {
        setFlippedCards(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };

    const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: "summary", label: "Summary", icon: <FileText className="w-4 h-4" /> },
        { id: "notes", label: "Key Notes", icon: <BookOpen className="w-4 h-4" />, count: data?.notes?.length },
        { id: "flashcards", label: "Flashcards", icon: <Layers className="w-4 h-4" />, count: data?.flashcards?.length },
        { id: "quiz", label: "Quiz", icon: <Brain className="w-4 h-4" />, count: data?.questions?.length },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                            <Youtube className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400">
                            YouTube Study Engine
                        </h1>
                    </div>
                    <p className="text-gray-500 text-sm">Paste any YouTube video → Get summary, notes, flashcards & quiz</p>
                </motion.div>

                {/* URL Input */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="flex gap-3 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleProcess()}
                            placeholder="Paste YouTube URL here (e.g., https://youtube.com/watch?v=...)"
                            className="w-full pl-12 pr-4 py-5 rounded-2xl bg-gray-900/80 border border-gray-800 text-sm text-white placeholder-gray-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing || !url.trim()}
                        className={`px-8 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${isProcessing || !url.trim()
                            ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:scale-[1.02] shadow-lg shadow-red-500/20"}`}
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {isProcessing ? "Processing..." : "Analyze"}
                    </button>
                </motion.div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                    </div>
                )}

                {/* Results */}
                {data && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Video Preview */}
                        <div className="mb-8 p-6 rounded-3xl bg-gray-900/80 border border-gray-800 flex flex-col md:flex-row gap-6">
                            <div className="md:w-80 shrink-0">
                                <img
                                    src={data.thumbnail}
                                    alt="Video thumbnail"
                                    className="w-full rounded-2xl border border-gray-700"
                                    onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`; }}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase">Processed</span>
                                    <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-[10px] font-bold uppercase">
                                        {data.notes?.length || 0} notes · {data.flashcards?.length || 0} cards · {data.questions?.length || 0} questions
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-4">{data.summary?.slice(0, 200)}...</p>
                                <a href={`https://youtube.com/watch?v=${data.videoId}`} target="_blank" rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300">
                                    Watch on YouTube <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                                        ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-white border border-red-500/30"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"}`}
                                >
                                    {tab.icon} {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-red-500/30 text-red-300" : "bg-gray-700 text-gray-400"}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            {activeTab === "summary" && (
                                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-8 rounded-3xl bg-gray-900/80 border border-gray-800">
                                    <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.2em] mb-4">AI Summary</h3>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        {data.summary?.split("\n").map((p, i) => (
                                            <p key={i} className="text-gray-300 leading-relaxed mb-3">{p}</p>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "notes" && (
                                <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="space-y-3">
                                    {data.notes?.map((note, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                            className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 flex items-start gap-4">
                                            <span className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                                                {i + 1}
                                            </span>
                                            <p className="text-sm text-gray-300 leading-relaxed">{note}</p>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === "flashcards" && (
                                <motion.div key="flashcards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {data.flashcards?.map((card, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            onClick={() => toggleFlip(i)}
                                            className="cursor-pointer perspective-1000 min-h-[180px]">
                                            <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${flippedCards.has(i) ? "[transform:rotateY(180deg)]" : ""}`}>
                                                {/* Front */}
                                                <div className="absolute inset-0 backface-hidden p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${card.difficulty === "easy" ? "bg-green-500/20 text-green-400" : card.difficulty === "hard" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                                                            {card.difficulty}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">Tap to flip</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white">{card.front}</p>
                                                </div>
                                                {/* Back */}
                                                <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30">
                                                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-2 block">Answer</span>
                                                    <p className="text-sm text-gray-200 leading-relaxed">{card.back}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === "quiz" && (
                                <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="space-y-4">
                                    {data.questions?.map((q, i) => (
                                        <div key={q.id} className="p-6 rounded-2xl bg-gray-900/80 border border-gray-800">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${q.difficulty === "easy" ? "bg-green-500/20 text-green-400" : q.difficulty === "hard" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                                                    {q.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-white mb-4">{q.question}</p>
                                            {q.options && (
                                                <div className="space-y-2">
                                                    {q.options.map((opt, oi) => {
                                                        const selected = quizAnswers[q.id] === opt;
                                                        const isCorrect = showQuizAnswers && opt === q.correctAnswer;
                                                        const isWrong = showQuizAnswers && selected && !isCorrect;
                                                        return (
                                                            <button key={oi}
                                                                onClick={() => !showQuizAnswers && setQuizAnswers(p => ({ ...p, [q.id]: opt }))}
                                                                className={`w-full text-left p-3 rounded-xl text-xs transition-all border ${isCorrect ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
                                                                    isWrong ? "border-red-500/40 bg-red-500/10 text-red-300" :
                                                                        selected ? "border-purple-500/40 bg-purple-500/10 text-white" :
                                                                            "border-gray-800 bg-gray-800/40 text-gray-400 hover:bg-gray-700/40"}`}>
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {showQuizAnswers && <p className="mt-3 text-xs text-gray-400 leading-relaxed">{q.explanation}</p>}
                                        </div>
                                    ))}
                                    {!showQuizAnswers && data.questions?.length > 0 && (
                                        <button onClick={() => setShowQuizAnswers(true)}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm">
                                            Check Answers
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Empty State */}
                {!data && !isProcessing && !error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                        <div className="p-8 rounded-full bg-gray-900/50 inline-block mb-6">
                            <Youtube className="w-16 h-16 text-gray-700" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-400 mb-2">Paste a YouTube URL to get started</h3>
                        <p className="text-sm text-gray-600">Works best with educational lectures, tutorials, and explainer videos</p>
                    </motion.div>
                )}

                {isProcessing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                        <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-6" />
                        <h3 className="text-lg font-bold text-gray-300 mb-2">Processing Video...</h3>
                        <p className="text-sm text-gray-500">Extracting transcript, generating notes, flashcards & quiz</p>
                    </motion.div>
                )}
            </div>

            <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
            `}</style>
        </div>
    );
}
