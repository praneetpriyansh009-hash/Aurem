"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, Plus, Loader2, Clock, Crown, Zap, MessageCircle, Trophy, Target,
    Timer, BookOpen, Brain, ArrowRight, Copy, Check, Settings2,
} from "lucide-react";

interface Room {
    id: string;
    name: string;
    subject: string;
    host: string;
    participants: number;
    maxParticipants: number;
    isActive: boolean;
    focusMinutes: number;
    topic?: string;
}

const MOCK_ROOMS: Room[] = [
    { id: "1", name: "JEE Physics Marathon", subject: "Physics", host: "Arjun S.", participants: 4, maxParticipants: 8, isActive: true, focusMinutes: 45, topic: "Electromagnetic Induction" },
    { id: "2", name: "NEET Biology Revision", subject: "Biology", host: "Priya M.", participants: 6, maxParticipants: 10, isActive: true, focusMinutes: 30, topic: "Human Physiology" },
    { id: "3", name: "Math Problem Solving", subject: "Mathematics", host: "Rahul K.", participants: 3, maxParticipants: 6, isActive: true, focusMinutes: 60, topic: "Calculus" },
    { id: "4", name: "Chemistry Crash Course", subject: "Chemistry", host: "Sara T.", participants: 5, maxParticipants: 8, isActive: true, focusMinutes: 25, topic: "Organic Chemistry" },
];

type ViewMode = "browse" | "room" | "create";

export default function StudyRoomsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("browse");
    const [rooms] = useState<Room[]>(MOCK_ROOMS);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [focusTime, setFocusTime] = useState(25);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [roomName, setRoomName] = useState("");
    const [roomSubject, setRoomSubject] = useState("");
    const [roomTopic, setRoomTopic] = useState("");
    const [copied, setCopied] = useState(false);

    // Simple timer
    const startTimer = () => {
        setTimeLeft(focusTime * 60);
        setIsTimerRunning(true);
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(interval); setIsTimerRunning(false); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    const copyLink = () => {
        navigator.clipboard.writeText(`https://aurem.app/room/${activeRoom?.id || "new"}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const joinRoom = (room: Room) => {
        setActiveRoom(room);
        setFocusTime(room.focusMinutes);
        setViewMode("room");
    };

    const createRoom = () => {
        const newRoom: Room = {
            id: `room_${Date.now()}`,
            name: roomName || "My Study Room",
            subject: roomSubject || "General",
            host: "You",
            participants: 1,
            maxParticipants: 8,
            isActive: true,
            focusMinutes: focusTime,
            topic: roomTopic,
        };
        setActiveRoom(newRoom);
        setViewMode("room");
    };

    // =========== BROWSE ===========
    if (viewMode === "browse") {
        return (
            <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                <Users className="w-8 h-8 text-amber-400" />
                            </div>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
                                Study Rooms
                            </h1>
                        </div>
                        <p className="text-gray-500 text-sm">Join or create focused study sessions with AI-powered quizzes</p>
                    </motion.div>

                    {/* Create Room Button */}
                    <button onClick={() => setViewMode("create")}
                        className="w-full mb-8 py-5 rounded-3xl border-2 border-dashed border-gray-700 text-gray-400 hover:border-amber-500/50 hover:text-amber-400 transition-all flex items-center justify-center gap-3 font-bold text-sm">
                        <Plus className="w-5 h-5" /> Create Study Room
                    </button>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                            <p className="text-3xl font-black text-amber-400">{rooms.filter(r => r.isActive).length}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Active Rooms</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                            <p className="text-3xl font-black text-emerald-400">{rooms.reduce((a, r) => a + r.participants, 0)}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Students Online</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                            <p className="text-3xl font-black text-violet-400">0</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Your Sessions</p>
                        </div>
                    </div>

                    {/* Room Grid */}
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Active Rooms</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rooms.map((room, i) => (
                            <motion.div key={room.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 hover:border-amber-500/30 transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase">Live</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">{room.name}</h3>
                                    </div>
                                    <button onClick={() => joinRoom(room)}
                                        className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all flex items-center gap-1">
                                        Join <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                    <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" />{room.host}</span>
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.participants}/{room.maxParticipants}</span>
                                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{room.focusMinutes}min</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-[10px] font-bold">{room.subject}</span>
                                    {room.topic && <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-[10px]">{room.topic}</span>}
                                </div>
                                {/* Capacity Bar */}
                                <div className="mt-4 h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${(room.participants / room.maxParticipants) * 100}%` }} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // =========== CREATE ===========
    if (viewMode === "create") {
        return (
            <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
                <div className="max-w-lg mx-auto">
                    <button onClick={() => setViewMode("browse")} className="mb-6 text-sm text-gray-500 hover:text-white">← Back</button>
                    <h1 className="text-2xl font-black mb-8">Create Study Room</h1>
                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                            <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-3">Room Name</h3>
                            <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="e.g., JEE Physics Sprint"
                                className="w-full p-4 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-amber-500/50 outline-none" />
                        </div>
                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                            <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-3">Subject</h3>
                            <input value={roomSubject} onChange={e => setRoomSubject(e.target.value)} placeholder="e.g., Physics"
                                className="w-full p-4 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-amber-500/50 outline-none" />
                        </div>
                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                            <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-3">Topic (optional)</h3>
                            <input value={roomTopic} onChange={e => setRoomTopic(e.target.value)} placeholder="e.g., Electromagnetic Induction"
                                className="w-full p-4 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-amber-500/50 outline-none" />
                        </div>
                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                            <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-3">Focus Duration</h3>
                            <div className="flex gap-2">
                                {[15, 25, 45, 60].map(m => (
                                    <button key={m} onClick={() => setFocusTime(m)}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${focusTime === m ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                                        {m}min
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={createRoom}
                            className="w-full py-6 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-sm uppercase tracking-[0.2em] hover:scale-[1.02] transition-all">
                            Create & Start
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========== ROOM VIEW ===========
    if (!activeRoom) { setViewMode("browse"); return null; }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => { setViewMode("browse"); setActiveRoom(null); setIsTimerRunning(false); }}
                        className="text-sm text-gray-500 hover:text-white">← Leave Room</button>
                    <button onClick={copyLink}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-xs text-gray-300 hover:bg-gray-700">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Invite Link"}
                    </button>
                </div>

                {/* Room Header */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 mb-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-bold">LIVE SESSION</span>
                        </div>
                        <h1 className="text-2xl font-black mb-2">{activeRoom.name}</h1>
                        <p className="text-gray-400 text-sm">{activeRoom.subject} · {activeRoom.topic || "Open Topic"}</p>
                        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" />{activeRoom.host}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activeRoom.participants} students</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Focus Timer */}
                    <div className="p-8 rounded-3xl bg-gray-900/80 border border-gray-800 text-center">
                        <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-6">Focus Timer</h3>
                        <div className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center mb-6 border-4 ${isTimerRunning ? "border-amber-500 bg-amber-500/10" : "border-gray-700 bg-gray-800/50"}`}>
                            <span className="text-3xl font-mono font-black">{isTimerRunning ? formatTimer(timeLeft) : `${focusTime}:00`}</span>
                        </div>
                        {!isTimerRunning ? (
                            <div>
                                <div className="flex gap-2 mb-4 justify-center">
                                    {[15, 25, 45, 60].map(m => (
                                        <button key={m} onClick={() => setFocusTime(m)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold ${focusTime === m ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-400"}`}>
                                            {m}m
                                        </button>
                                    ))}
                                </div>
                                <button onClick={startTimer}
                                    className="px-8 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400">
                                    Start Focus
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => { setIsTimerRunning(false); setTimeLeft(0); }}
                                className="px-8 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/30">
                                End Session
                            </button>
                        )}
                    </div>

                    {/* AI Moderator */}
                    <div className="p-8 rounded-3xl bg-gray-900/80 border border-gray-800">
                        <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Brain className="w-4 h-4" /> AI Moderator
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20">
                                <p className="text-xs text-violet-400 font-bold mb-1">💡 Quick Quiz</p>
                                <p className="text-sm text-gray-300">What is the SI unit of magnetic flux?</p>
                                <div className="flex gap-2 mt-3">
                                    <button className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300 hover:bg-gray-700">Tesla</button>
                                    <button className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300 hover:bg-gray-700">Weber</button>
                                    <button className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300 hover:bg-gray-700">Henry</button>
                                    <button className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-300 hover:bg-gray-700">Ampere</button>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                <p className="text-xs text-emerald-400 font-bold mb-1">📊 Study Tip</p>
                                <p className="text-sm text-gray-300">Take a 5-minute break after this focus session. Short breaks improve retention by 20%.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                                <p className="text-xs text-amber-400 font-bold mb-1">🏆 Leaderboard</p>
                                <div className="space-y-2 text-xs mt-2">
                                    <div className="flex items-center justify-between"><span className="text-gray-300">1. {activeRoom.host}</span><span className="text-amber-400 font-bold">120 pts</span></div>
                                    <div className="flex items-center justify-between"><span className="text-gray-300">2. You</span><span className="text-gray-400 font-bold">85 pts</span></div>
                                    <div className="flex items-center justify-between"><span className="text-gray-300">3. Student 3</span><span className="text-gray-400 font-bold">60 pts</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
