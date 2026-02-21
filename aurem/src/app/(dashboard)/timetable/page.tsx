"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Sparkles, Clock, Target, Flame, ChevronRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";
import type { TimetableEntry } from "@/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science"];

export default function TimetablePage() {
    const [examDate, setExamDate] = useState("");
    const [weakTopics, setWeakTopics] = useState("");
    const [energyLevel, setEnergyLevel] = useState<"morning" | "afternoon" | "night">("morning");
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedDay, setSelectedDay] = useState("Monday");
    const { canUseFeature, incrementUsage, triggerUpgrade } = useSubscription();

    const generateTimetable = async () => {
        if (!canUseFeature("timetableGenerations")) {
            triggerUpgrade("Timetable Generation");
            return;
        }

        setIsGenerating(true);
        incrementUsage("timetableGenerations");

        try {
            const res = await fetch("/api/timetable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examDate, weakTopics, energyLevel }),
            });
            const data = await res.json();
            setTimetable(data.timetable || []);
        } catch {
            // Generate mock data on error
            const mockEntries: TimetableEntry[] = DAYS.flatMap((day) =>
                [
                    { slot: "9:00 - 10:30", subject: "Mathematics", topic: "Calculus", duration: 90, priority: "high" as const },
                    { slot: "11:00 - 12:00", subject: "Physics", topic: "Mechanics", duration: 60, priority: "medium" as const },
                    { slot: "14:00 - 15:30", subject: "Chemistry", topic: "Organic Chemistry", duration: 90, priority: "high" as const },
                    { slot: "16:00 - 17:00", subject: "Biology", topic: "Cell Biology", duration: 60, priority: "low" as const },
                ].map((s, i) => ({
                    id: `${day}-${i}`,
                    day,
                    timeSlot: s.slot,
                    subject: s.subject,
                    topic: s.topic,
                    duration: s.duration,
                    priority: s.priority,
                    completed: false,
                }))
            );
            setTimetable(mockEntries);
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleComplete = (id: string) => {
        setTimetable((prev) => prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e)));
    };

    const dayEntries = timetable.filter((e) => e.day === selectedDay);
    const completedToday = dayEntries.filter((e) => e.completed).length;
    const totalToday = dayEntries.length;

    const priorityColors = {
        high: "bg-red-500/20 text-red-400 border-red-500/20",
        medium: "bg-amber-500/20 text-amber-400 border-amber-500/20",
        low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
    };

    return (
        <div className="h-full overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-6 no-scrollbar">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-white">Smart Timetable</h1>
                        <p className="text-xs text-white/40">AI-powered study plans based on your weak topics & energy levels</p>
                    </div>
                </div>

                {timetable.length === 0 ? (
                    /* Generate Form */
                    <div className="glass-panel p-6 max-w-lg mx-auto space-y-5">
                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Exam Date</label>
                            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="glass-input w-full" id="exam-date" />
                        </div>

                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Weak Topics (comma separated)</label>
                            <input
                                type="text"
                                value={weakTopics}
                                onChange={(e) => setWeakTopics(e.target.value)}
                                className="glass-input w-full"
                                placeholder="e.g., Calculus, Organic Chemistry, Optics"
                                id="weak-topics"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Peak Energy Time</label>
                            <div className="flex gap-2">
                                {(["morning", "afternoon", "night"] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setEnergyLevel(level)}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${energyLevel === level
                                                ? "bg-aurem-500/20 border-aurem-500/30 text-aurem-400"
                                                : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
                                            }`}
                                    >
                                        {level === "morning" ? "🌅 Morning" : level === "afternoon" ? "☀️ Afternoon" : "🌙 Night"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={generateTimetable} disabled={isGenerating} className="btn-primary w-full flex items-center justify-center gap-2" id="generate-timetable">
                            {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Sparkles className="w-5 h-5" /> Generate Smart Plan</>}
                        </button>
                    </div>
                ) : (
                    /* Timetable View */
                    <div className="space-y-4">
                        {/* Day Selector */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {DAYS.map((day) => {
                                const dayComplete = timetable.filter((e) => e.day === day && e.completed).length;
                                const dayTotal = timetable.filter((e) => e.day === day).length;
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${selectedDay === day
                                                ? "bg-aurem-500/20 text-aurem-400 border border-aurem-500/20"
                                                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60"
                                            }`}
                                    >
                                        {day.slice(0, 3)}
                                        {dayTotal > 0 && (
                                            <span className="ml-1.5 text-[10px] opacity-60">{dayComplete}/{dayTotal}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Progress */}
                        <div className="glass-panel p-4 flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/60">{selectedDay} Progress</span>
                                    <span className="text-sm text-aurem-400 font-semibold">{totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: totalToday > 0 ? `${(completedToday / totalToday) * 100}%` : "0%" }}
                                        className="h-full rounded-full bg-gradient-to-r from-aurem-500 to-pink-500"
                                    />
                                </div>
                            </div>
                            <Flame className={`w-6 h-6 ${completedToday === totalToday && totalToday > 0 ? "text-aurem-500" : "text-white/20"}`} />
                        </div>

                        {/* Entries */}
                        <div className="space-y-2">
                            {dayEntries.map((entry, i) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => toggleComplete(entry.id)}
                                    className={`glass-panel p-4 flex items-center gap-4 cursor-pointer group transition-all ${entry.completed ? "opacity-50" : ""}`}
                                >
                                    {entry.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-white/20 group-hover:text-white/40 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${entry.completed ? "line-through text-white/40" : "text-white"}`}>{entry.subject}</p>
                                        <p className="text-xs text-white/30 truncate">{entry.topic}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityColors[entry.priority]}`}>{entry.priority}</span>
                                        <span className="text-xs text-white/30 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />{entry.timeSlot}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <button onClick={() => setTimetable([])} className="btn-ghost text-xs text-white/30 mx-auto block">
                            ↻ Generate New Plan
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
