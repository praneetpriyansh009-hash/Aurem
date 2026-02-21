"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Flashcard, FlashcardDeck } from "@/types";
import {
    Layers, Plus, Loader2, RotateCcw, ChevronLeft, ChevronRight,
    Sparkles, CheckCircle, XCircle, AlertTriangle, Flame, Trophy,
    BookOpen, Clock, Zap, ArrowRight, Brain,
} from "lucide-react";

// SM-2 Algorithm
function sm2(card: Flashcard, quality: number): Flashcard {
    // quality: 0-5 (0=complete blackout, 5=perfect)
    let { easeFactor, interval, repetitions } = card;

    if (quality >= 3) {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        repetitions += 1;
    } else {
        repetitions = 0;
        interval = 1;
    }

    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    const status: Flashcard["status"] = repetitions >= 5 ? "mastered" : repetitions >= 1 ? "review" : "learning";

    return { ...card, easeFactor, interval, repetitions, nextReview, lastReview: new Date(), status };
}

type ViewMode = "decks" | "study" | "create";

export default function FlashcardsPage() {
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("decks");
    const [currentCardIdx, setCurrentCardIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [createTopic, setCreateTopic] = useState("");
    const [createContent, setCreateContent] = useState("");
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, wrong: 0 });

    // Load from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem("aurem_flashcard_decks");
            if (saved) setDecks(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    const persist = useCallback((updatedDecks: FlashcardDeck[]) => {
        setDecks(updatedDecks);
        localStorage.setItem("aurem_flashcard_decks", JSON.stringify(updatedDecks));
    }, []);

    const handleGenerate = async () => {
        if (!createTopic.trim() && !createContent.trim()) return;
        setIsGenerating(true);
        try {
            const res = await fetch("/api/flashcards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: createTopic, content: createContent, count: 15 }),
            });
            const data = await res.json();
            if (data.flashcards?.length > 0) {
                const newDeck: FlashcardDeck = {
                    id: `deck_${Date.now()}`,
                    name: createTopic || "Generated Deck",
                    description: `${data.flashcards.length} cards from ${createTopic || "content"}`,
                    cards: data.flashcards,
                    source: "manual",
                    createdAt: new Date(),
                    dueCount: data.flashcards.length,
                    masteredCount: 0,
                };
                persist([newDeck, ...decks]);
                setActiveDeck(newDeck);
                setViewMode("study");
                setCurrentCardIdx(0);
                setIsFlipped(false);
                setSessionStats({ reviewed: 0, correct: 0, wrong: 0 });
                setCreateTopic("");
                setCreateContent("");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to generate flashcards");
        } finally {
            setIsGenerating(false);
        }
    };

    const dueCards = activeDeck?.cards.filter(c => {
        if (c.status === "new") return true;
        if (!c.nextReview) return true;
        return new Date(c.nextReview) <= new Date();
    }) || [];

    const currentCard = dueCards[currentCardIdx];

    const rateCard = (quality: number) => {
        if (!currentCard || !activeDeck) return;

        const updatedCard = sm2(currentCard, quality);
        const updatedCards = activeDeck.cards.map(c => c.id === updatedCard.id ? updatedCard : c);
        const updatedDeck = {
            ...activeDeck,
            cards: updatedCards,
            dueCount: updatedCards.filter(c => c.status !== "mastered" && (!c.nextReview || new Date(c.nextReview) <= new Date())).length,
            masteredCount: updatedCards.filter(c => c.status === "mastered").length,
        };

        const updatedDecks = decks.map(d => d.id === updatedDeck.id ? updatedDeck : d);
        persist(updatedDecks);
        setActiveDeck(updatedDeck);

        setSessionStats(prev => ({
            reviewed: prev.reviewed + 1,
            correct: quality >= 3 ? prev.correct + 1 : prev.correct,
            wrong: quality < 3 ? prev.wrong + 1 : prev.wrong,
        }));

        setIsFlipped(false);
        if (currentCardIdx < dueCards.length - 1) {
            setCurrentCardIdx(prev => prev + 1);
        } else {
            setCurrentCardIdx(0);
        }
    };

    const totalDue = decks.reduce((a, d) => a + (d.dueCount || d.cards.length), 0);
    const totalMastered = decks.reduce((a, d) => a + (d.masteredCount || 0), 0);
    const totalCards = decks.reduce((a, d) => a + d.cards.length, 0);

    // =========== DECKS VIEW ===========
    if (viewMode === "decks") {
        return (
            <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                                <Layers className="w-8 h-8 text-violet-400" />
                            </div>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-purple-400">
                                Flashcard Studio
                            </h1>
                        </div>
                        <p className="text-gray-500 text-sm">Spaced repetition powered by SM-2 algorithm</p>
                    </motion.div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                            <p className="text-3xl font-black text-violet-400">{totalDue}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Due Today</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                            <p className="text-3xl font-black text-emerald-400">{totalMastered}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Mastered</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                            <p className="text-3xl font-black text-white">{totalCards}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Total Cards</p>
                        </div>
                    </div>

                    {/* Create New */}
                    <button onClick={() => setViewMode("create")}
                        className="w-full mb-8 py-5 rounded-3xl border-2 border-dashed border-gray-700 text-gray-400 hover:border-violet-500/50 hover:text-violet-400 transition-all flex items-center justify-center gap-3 font-bold text-sm">
                        <Plus className="w-5 h-5" /> Create New Deck
                    </button>

                    {/* Deck Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {decks.map((deck, i) => (
                            <motion.div key={deck.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                onClick={() => { setActiveDeck(deck); setViewMode("study"); setCurrentCardIdx(0); setIsFlipped(false); setSessionStats({ reviewed: 0, correct: 0, wrong: 0 }); }}
                                className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 hover:border-violet-500/30 cursor-pointer transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">{deck.name}</h3>
                                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-violet-400 transition-colors" />
                                </div>
                                <p className="text-xs text-gray-500 mb-4">{deck.description}</p>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1 text-amber-400"><Clock className="w-3.5 h-3.5" /> {deck.dueCount || deck.cards.length} due</span>
                                    <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> {deck.masteredCount || 0} mastered</span>
                                    <span className="text-gray-600">{deck.cards.length} cards</span>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-4 h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                                        style={{ width: `${deck.cards.length > 0 ? ((deck.masteredCount || 0) / deck.cards.length) * 100 : 0}%` }} />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {decks.length === 0 && (
                        <div className="text-center py-16">
                            <Layers className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-400">No decks yet</h3>
                            <p className="text-sm text-gray-600">Create your first flashcard deck to start studying</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // =========== CREATE VIEW ===========
    if (viewMode === "create") {
        return (
            <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                    <button onClick={() => setViewMode("decks")} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Back to Decks
                    </button>
                    <h1 className="text-2xl font-black mb-8">Create Flashcard Deck</h1>

                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-4">Topic / Title</h3>
                            <input value={createTopic} onChange={e => setCreateTopic(e.target.value)}
                                placeholder="e.g., Organic Chemistry — Alkanes and Alkenes"
                                className="w-full p-4 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-violet-500/50 outline-none" />
                        </div>

                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-4">
                                Content (optional — paste notes, text, or leave blank for topic-based generation)
                            </h3>
                            <textarea value={createContent} onChange={e => setCreateContent(e.target.value)}
                                placeholder="Paste your notes, textbook content, or lecture notes here..."
                                className="w-full h-40 p-4 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-violet-500/50 outline-none resize-none" />
                        </div>

                        <button onClick={handleGenerate} disabled={isGenerating || (!createTopic.trim() && !createContent.trim())}
                            className={`w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${isGenerating ? "bg-gray-800 text-gray-600" : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:scale-[1.02] shadow-2xl shadow-violet-500/20"}`}>
                            {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating Cards...</> : <><Sparkles className="w-5 h-5" /> Generate 15 Flashcards</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========== STUDY VIEW ===========
    if (!activeDeck) { setViewMode("decks"); return null; }

    if (dueCards.length === 0) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
                    <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-black mb-2">All caught up! 🎉</h2>
                    <p className="text-gray-400 text-sm mb-8">No cards due for review. Come back later for spaced repetition.</p>
                    {sessionStats.reviewed > 0 && (
                        <div className="p-6 rounded-2xl bg-gray-900/80 border border-gray-800 mb-6">
                            <p className="text-sm text-gray-400 mb-2">Session: {sessionStats.reviewed} reviewed</p>
                            <div className="flex justify-center gap-6">
                                <span className="text-emerald-400 font-bold">{sessionStats.correct} ✓</span>
                                <span className="text-red-400 font-bold">{sessionStats.wrong} ✗</span>
                            </div>
                        </div>
                    )}
                    <button onClick={() => { setViewMode("decks"); setActiveDeck(null); }}
                        className="px-8 py-4 rounded-2xl bg-violet-600 text-white font-bold text-sm">
                        Back to Decks
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col p-4 md:p-8">
            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => { setViewMode("decks"); setActiveDeck(null); }}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" /> {activeDeck.name}
                    </button>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">{currentCardIdx + 1}/{dueCards.length}</span>
                        <span className="text-emerald-400 font-bold">{sessionStats.correct}✓</span>
                        <span className="text-red-400 font-bold">{sessionStats.wrong}✗</span>
                    </div>
                </div>

                {/* Progress */}
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-8">
                    <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                        animate={{ width: `${((currentCardIdx + 1) / dueCards.length) * 100}%` }} />
                </div>

                {/* Card */}
                <div className="flex-1 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {currentCard && (
                            <motion.div key={currentCard.id + (isFlipped ? "-back" : "-front")}
                                initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                onClick={() => setIsFlipped(!isFlipped)}
                                className={`w-full max-w-lg min-h-[300px] p-10 rounded-3xl cursor-pointer transition-all border flex flex-col items-center justify-center text-center ${isFlipped
                                    ? "bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30"
                                    : "bg-gray-900/80 border-gray-800 hover:border-gray-700"}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-6 ${isFlipped ? "text-violet-400" : "text-gray-600"}`}>
                                    {isFlipped ? "Answer" : "Question"}
                                </span>
                                <p className={`text-lg leading-relaxed ${isFlipped ? "text-gray-200" : "text-white font-bold"}`}>
                                    {isFlipped ? currentCard.back : currentCard.front}
                                </p>
                                {!isFlipped && (
                                    <p className="mt-6 text-xs text-gray-600">Tap to reveal answer</p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Rating Buttons (only when flipped) */}
                <AnimatePresence>
                    {isFlipped && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mt-8 mb-4">
                            <p className="text-xs text-gray-500 text-center mb-3">How well did you know this?</p>
                            <div className="grid grid-cols-4 gap-3">
                                <button onClick={() => rateCard(1)}
                                    className="py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
                                    <XCircle className="w-5 h-5 mx-auto mb-1" /> Again
                                </button>
                                <button onClick={() => rateCard(2)}
                                    className="py-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-all">
                                    <AlertTriangle className="w-5 h-5 mx-auto mb-1" /> Hard
                                </button>
                                <button onClick={() => rateCard(4)}
                                    className="py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all">
                                    <CheckCircle className="w-5 h-5 mx-auto mb-1" /> Good
                                </button>
                                <button onClick={() => rateCard(5)}
                                    className="py-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-all">
                                    <Zap className="w-5 h-5 mx-auto mb-1" /> Easy
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
