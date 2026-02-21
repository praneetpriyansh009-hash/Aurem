"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Play, Pause, SkipBack, SkipForward, Volume2, Sparkles, FileText, Loader2, Radio } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";

interface ScriptLine {
    speaker: string;
    text: string;
}

export default function PodcastPage() {
    const [mode, setMode] = useState<"topic" | "document">("topic");
    const [topic, setTopic] = useState("");
    const [subject, setSubject] = useState("");
    const [script, setScript] = useState<ScriptLine[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLine, setCurrentLine] = useState(0);
    const [progress, setProgress] = useState(0);
    const { canUseFeature, incrementUsage, triggerUpgrade } = useSubscription();

    const generatePodcast = async () => {
        if (!canUseFeature("podcasts")) {
            triggerUpgrade("Podcast Generation");
            return;
        }

        setIsGenerating(true);
        incrementUsage("podcasts");

        try {
            const res = await fetch("/api/podcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "syllabus",
                    syllabus: { subject, topic, level: "intermediate" },
                }),
            });
            const data = await res.json();
            setScript(data.script || []);
        } catch {
            setScript([
                { speaker: "Alex", text: "Welcome back to The Deep Dive! Today we're covering an amazing topic." },
                { speaker: "Sam", text: "Yeah, honestly I've been waiting to talk about this one. It's... um, it's a game changer." },
                { speaker: "Alex", text: "So let's break it down. Where should we start?" },
                { speaker: "Sam", text: "Well, the fundamentals are actually pretty simple once you understand the core concept." },
                { speaker: "Alex", text: "Wait, really? I always thought it was super complex." },
                { speaker: "Sam", text: "That's the thing — the underlying principle is elegant. It's all about understanding the relationships." },
                { speaker: "Alex", text: "That's wild. So what's the practical application?" },
                { speaker: "Sam", text: "Great question. In exams, this comes up ALL the time in numerical problems." },
            ]);
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePlay = () => {
        if (!script.length) return;
        setIsPlaying(!isPlaying);

        if (!isPlaying) {
            // Simulate playback
            const interval = setInterval(() => {
                setCurrentLine((prev) => {
                    if (prev >= script.length - 1) {
                        setIsPlaying(false);
                        clearInterval(interval);
                        return prev;
                    }
                    setProgress(((prev + 1) / script.length) * 100);
                    return prev + 1;
                });
            }, 3000);
        }
    };

    return (
        <div className="h-full overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-6 no-scrollbar">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-white">Podcast Studio</h1>
                        <p className="text-xs text-white/40">AI-generated audio recaps of your study topics</p>
                    </div>
                </div>

                {script.length === 0 ? (
                    /* Generate Form */
                    <div className="glass-panel p-6 max-w-lg mx-auto space-y-5">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03]">
                            <button
                                onClick={() => setMode("topic")}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "topic" ? "bg-white/[0.08] text-white" : "text-white/40"
                                    }`}
                            >
                                <Radio className="w-4 h-4" /> By Topic
                            </button>
                            <button
                                onClick={() => setMode("document")}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === "document" ? "bg-white/[0.08] text-white" : "text-white/40"
                                    }`}
                            >
                                <FileText className="w-4 h-4" /> From Notes
                            </button>
                        </div>

                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Subject</label>
                            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="glass-input w-full" placeholder="e.g., Physics" id="podcast-subject" />
                        </div>

                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Topic</label>
                            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className="glass-input w-full" placeholder="e.g., Electromagnetic Induction" id="podcast-topic" />
                        </div>

                        <button onClick={generatePodcast} disabled={isGenerating || !topic.trim()} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50" id="generate-podcast">
                            {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Sparkles className="w-5 h-5" /> Generate Podcast</>}
                        </button>
                    </div>
                ) : (
                    /* Player */
                    <div className="max-w-2xl mx-auto space-y-4">
                        {/* Visualizer */}
                        <div className="glass-panel p-6 text-center">
                            <div className="flex items-center justify-center gap-1 h-20 mb-4">
                                {Array.from({ length: 20 }, (_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            height: isPlaying ? [10, Math.random() * 60 + 10, 10] : 10,
                                        }}
                                        transition={{
                                            duration: 0.5 + Math.random() * 0.5,
                                            repeat: isPlaying ? Infinity : 0,
                                            delay: i * 0.05,
                                        }}
                                        className="w-1 rounded-full bg-gradient-to-t from-aurem-500 to-pink-500"
                                    />
                                ))}
                            </div>

                            <h3 className="text-white font-semibold mb-1">{topic || "Study Podcast"}</h3>
                            <p className="text-white/30 text-sm">{subject || "Generated by AUREM"}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="audio-player-track">
                            <div className="audio-player-progress" style={{ width: `${progress}%` }} />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-6">
                            <button onClick={() => setCurrentLine(Math.max(0, currentLine - 1))} className="text-white/30 hover:text-white transition-colors">
                                <SkipBack className="w-5 h-5" />
                            </button>
                            <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-gradient-to-br from-aurem-500 to-pink-500 flex items-center justify-center shadow-glow hover:scale-105 transition-transform">
                                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                            </button>
                            <button onClick={() => setCurrentLine(Math.min(script.length - 1, currentLine + 1))} className="text-white/30 hover:text-white transition-colors">
                                <SkipForward className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Script */}
                        <div className="glass-panel p-4 max-h-64 overflow-y-auto space-y-3 no-scrollbar">
                            {script.map((line, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: i <= currentLine ? 1 : 0.3 }}
                                    className={`flex gap-3 p-3 rounded-xl transition-colors ${i === currentLine ? "bg-aurem-500/10 border border-aurem-500/20" : ""}`}
                                >
                                    <span className={`text-xs font-bold flex-shrink-0 ${line.speaker === "Alex" ? "text-blue-400" : "text-emerald-400"}`}>
                                        {line.speaker}
                                    </span>
                                    <p className="text-sm text-white/70">{line.text}</p>
                                </motion.div>
                            ))}
                        </div>

                        <button onClick={() => { setScript([]); setCurrentLine(0); setProgress(0); setIsPlaying(false); }} className="btn-ghost text-xs text-white/30 mx-auto block">
                            ↻ Generate New Podcast
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
