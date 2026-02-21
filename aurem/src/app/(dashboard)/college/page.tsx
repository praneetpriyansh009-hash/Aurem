"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    GraduationCap, Compass, Search, MessageCircle, UserCircle, Sparkles,
    Loader2, Star, TrendingUp, MapPin, DollarSign, Award, ChevronRight,
    Send, BookOpen, Target, Briefcase, ArrowRight,
} from "lucide-react";

type Tab = "career" | "finder" | "chat" | "profile";

interface Career { title: string; description: string; avgSalary: string; growthOutlook: string; requiredEducation: string; skills: string[]; topColleges: string[]; matchScore: number }
interface College { name: string; location: string; matchPercentage: number; ranking: string; acceptanceRate: string; tuition: string; strengths: string[]; scholarshipInfo?: string; whyGoodFit?: string; category?: string }

export default function CollegePage() {
    const [activeTab, setActiveTab] = useState<Tab>("career");
    const [isLoading, setIsLoading] = useState(false);

    // Career AI state
    const [interests, setInterests] = useState("");
    const [strengths, setStrengths] = useState("");
    const [careerField, setCareerField] = useState("");
    const [careers, setCareers] = useState<Career[]>([]);

    // College Finder state
    const [country, setCountry] = useState("");
    const [major, setMajor] = useState("");
    const [budget, setBudget] = useState("");
    const [colleges, setColleges] = useState<College[]>([]);

    // Chat state
    const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [chatInput, setChatInput] = useState("");

    // Profile state
    const [gpa, setGpa] = useState("");
    const [testScores, setTestScores] = useState("");
    const [targetMajor, setTargetMajor] = useState("");
    const [extras, setExtras] = useState("");
    const [profileBudget, setProfileBudget] = useState("");
    const [profileCountry, setProfileCountry] = useState("");
    const [profileResult, setProfileResult] = useState<{
        profileStrength: string; overallScore: number; analysis: string;
        improvements: string[]; matchedColleges: College[];
    } | null>(null);

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "career", label: "Career AI", icon: <Briefcase className="w-4 h-4" /> },
        { id: "finder", label: "College Finder", icon: <Search className="w-4 h-4" /> },
        { id: "chat", label: "Admissions Chat", icon: <MessageCircle className="w-4 h-4" /> },
        { id: "profile", label: "Profile Match", icon: <UserCircle className="w-4 h-4" /> },
    ];

    const callAPI = async (mode: string, params: Record<string, unknown>) => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/college", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, ...params }),
            });
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const handleCareer = async () => {
        const data = await callAPI("career", { interests, strengths, field: careerField });
        if (data?.careers) setCareers(data.careers);
    };

    const handleFinder = async () => {
        const data = await callAPI("colleges", { country, major, budget });
        if (data?.colleges) setColleges(data.colleges);
    };

    const handleChat = async () => {
        if (!chatInput.trim()) return;
        const userMsg = { role: "user", content: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput("");
        setIsLoading(true);
        const data = await callAPI("chat", { message: chatInput, context: chatMessages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n") });
        if (data?.reply) {
            setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        }
        setIsLoading(false);
    };

    const handleProfile = async () => {
        const scores = testScores.split(",").map(s => {
            const [name, score] = s.split(":").map(x => x.trim());
            return { name, score: parseInt(score) || 0 };
        }).filter(s => s.name);
        const data = await callAPI("profile", {
            gpa: parseFloat(gpa) || 0,
            testScores: scores,
            major: targetMajor,
            extracurriculars: extras.split(",").map(e => e.trim()).filter(Boolean),
            budget: profileBudget,
            country: profileCountry,
        });
        if (data?.matchedColleges || data?.profileStrength) setProfileResult(data);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                            <Compass className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                            College Compass
                        </h1>
                    </div>
                    <p className="text-gray-500 text-sm">AI-powered career guidance, college matching & admissions help</p>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                                ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30"
                                : "text-gray-500 hover:text-gray-300"}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ===== CAREER AI ===== */}
                    {activeTab === "career" && (
                        <motion.div key="career" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Your Interests</h3>
                                    <input value={interests} onChange={e => setInterests(e.target.value)}
                                        placeholder="e.g., coding, math, problem solving..."
                                        className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-emerald-500/50 outline-none" />
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Your Strengths</h3>
                                    <input value={strengths} onChange={e => setStrengths(e.target.value)}
                                        placeholder="e.g., analytical thinking, creativity..."
                                        className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-emerald-500/50 outline-none" />
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Preferred Field</h3>
                                    <input value={careerField} onChange={e => setCareerField(e.target.value)}
                                        placeholder="e.g., Technology, Medicine, Law..."
                                        className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-emerald-500/50 outline-none" />
                                </div>
                            </div>
                            <button onClick={handleCareer} disabled={isLoading}
                                className={`w-full py-5 rounded-3xl font-bold text-sm flex items-center justify-center gap-3 transition-all mb-8 ${isLoading ? "bg-gray-800 text-gray-600" : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:scale-[1.01]"}`}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                {isLoading ? "Analyzing..." : "Find My Career Path"}
                            </button>

                            {/* Career Results */}
                            <div className="space-y-4">
                                {careers.map((career, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                        className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{career.title}</h3>
                                                <p className="text-sm text-gray-400 mt-1">{career.description}</p>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg shrink-0">
                                                {career.matchScore}%
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="p-3 rounded-xl bg-gray-800/50">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Salary</p>
                                                <p className="text-xs text-white font-bold mt-1">{career.avgSalary}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-gray-800/50">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Growth</p>
                                                <p className={`text-xs font-bold mt-1 ${career.growthOutlook === "High" ? "text-emerald-400" : "text-amber-400"}`}>{career.growthOutlook}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-gray-800/50">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Education</p>
                                                <p className="text-xs text-white font-bold mt-1">{career.requiredEducation}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {career.skills?.map((s, j) => (
                                                <span key={j} className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">{s}</span>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ===== COLLEGE FINDER ===== */}
                    {activeTab === "finder" && (
                        <motion.div key="finder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                    <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-3">Country</h3>
                                    <select value={country} onChange={e => setCountry(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-black/40 text-sm text-white border border-gray-800 focus:border-teal-500/50 outline-none">
                                        <option value="">Any Country</option>
                                        <option value="India">India</option>
                                        <option value="USA">USA</option>
                                        <option value="UK">UK</option>
                                        <option value="Canada">Canada</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Germany">Germany</option>
                                        <option value="Singapore">Singapore</option>
                                    </select>
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                    <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-3">Major</h3>
                                    <input value={major} onChange={e => setMajor(e.target.value)}
                                        placeholder="e.g., Computer Science..."
                                        className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-teal-500/50 outline-none" />
                                </div>
                                <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                    <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-3">Budget</h3>
                                    <select value={budget} onChange={e => setBudget(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-black/40 text-sm text-white border border-gray-800 focus:border-teal-500/50 outline-none">
                                        <option value="">Any Budget</option>
                                        <option value="Under ₹5 Lakh/year">Under ₹5 Lakh/year</option>
                                        <option value="₹5-15 Lakh/year">₹5-15 Lakh/year</option>
                                        <option value="₹15-30 Lakh/year">₹15-30 Lakh/year</option>
                                        <option value="₹30+ Lakh/year">₹30+ Lakh/year</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleFinder} disabled={isLoading}
                                className={`w-full py-5 rounded-3xl font-bold text-sm flex items-center justify-center gap-3 mb-8 ${isLoading ? "bg-gray-800 text-gray-600" : "bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:scale-[1.01]"}`}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                {isLoading ? "Searching..." : "Find Colleges"}
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {colleges.map((college, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-sm font-bold text-white">{college.name}</h3>
                                            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-xs font-black">{college.matchPercentage}%</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{college.location}</span>
                                            <span className="flex items-center gap-1"><Award className="w-3 h-3" />{college.ranking}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs mb-3">
                                            <span className="text-gray-400">Accept: <span className="text-white font-bold">{college.acceptanceRate}</span></span>
                                            <span className="text-gray-400">Tuition: <span className="text-white font-bold">{college.tuition}</span></span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {college.strengths?.map((s, j) => (
                                                <span key={j} className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px]">{s}</span>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ===== ADMISSIONS CHAT ===== */}
                    {activeTab === "chat" && (
                        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded-3xl bg-gray-900/50 border border-gray-800">
                                {chatMessages.length === 0 && (
                                    <div className="text-center py-12">
                                        <MessageCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-gray-400">Ask anything about admissions</h3>
                                        <p className="text-sm text-gray-600 mt-2">SAT prep? Application tips? Scholarship advice?</p>
                                        <div className="flex flex-wrap gap-2 justify-center mt-6">
                                            {["How to write a strong SOP?", "Best scholarships for Indian students?", "What extracurriculars look good?"].map((q, i) => (
                                                <button key={i} onClick={() => { setChatInput(q); }}
                                                    className="px-4 py-2 rounded-xl bg-gray-800 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-all">
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === "user"
                                            ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/20"
                                            : "bg-gray-800/80 text-gray-200 border border-gray-700"}`}>
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="p-4 rounded-2xl bg-gray-800/80 border border-gray-700">
                                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleChat()}
                                    placeholder="Ask about admissions, applications, scholarships..."
                                    className="flex-1 p-4 rounded-2xl bg-gray-900/80 border border-gray-800 text-sm text-white placeholder-gray-600 focus:border-emerald-500/50 outline-none" />
                                <button onClick={handleChat} disabled={isLoading || !chatInput.trim()}
                                    className="px-6 rounded-2xl bg-emerald-600 text-white disabled:bg-gray-800 disabled:text-gray-600 transition-all">
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== PROFILE MATCH ===== */}
                    {activeTab === "profile" && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {!profileResult ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-3">GPA (out of 10 or 4.0)</h3>
                                            <input value={gpa} onChange={e => setGpa(e.target.value)} placeholder="e.g., 3.8 or 9.2"
                                                className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-violet-500/50 outline-none" />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-3">Test Scores</h3>
                                            <input value={testScores} onChange={e => setTestScores(e.target.value)} placeholder="SAT:1450, JEE:95 percentile"
                                                className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-violet-500/50 outline-none" />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-3">Target Major</h3>
                                            <input value={targetMajor} onChange={e => setTargetMajor(e.target.value)} placeholder="e.g., Computer Science"
                                                className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-violet-500/50 outline-none" />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-3">Extracurriculars</h3>
                                            <input value={extras} onChange={e => setExtras(e.target.value)} placeholder="Debate, Coding, Sports, Music..."
                                                className="w-full p-3 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-violet-500/50 outline-none" />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-3">Budget</h3>
                                            <select value={profileBudget} onChange={e => setProfileBudget(e.target.value)}
                                                className="w-full p-3 rounded-xl bg-black/40 text-sm text-white border border-gray-800 outline-none">
                                                <option value="">Any</option>
                                                <option value="Under ₹5 Lakh/year">Under ₹5L/year</option>
                                                <option value="₹5-15 Lakh/year">₹5-15L/year</option>
                                                <option value="₹15-30 Lakh/year">₹15-30L/year</option>
                                                <option value="₹30+ Lakh/year">₹30L+/year</option>
                                            </select>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.2em] mb-3">Preferred Country</h3>
                                            <select value={profileCountry} onChange={e => setProfileCountry(e.target.value)}
                                                className="w-full p-3 rounded-xl bg-black/40 text-sm text-white border border-gray-800 outline-none">
                                                <option value="">Any</option>
                                                <option value="India">India</option>
                                                <option value="USA">USA</option>
                                                <option value="UK">UK</option>
                                                <option value="Canada">Canada</option>
                                                <option value="Australia">Australia</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={handleProfile} disabled={isLoading}
                                        className={`w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 ${isLoading ? "bg-gray-800 text-gray-600" : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:scale-[1.01] shadow-2xl shadow-violet-500/20"}`}>
                                        {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Profile...</> : <><Target className="w-5 h-5" /> Match My Colleges</>}
                                    </button>
                                </>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    {/* Profile Score */}
                                    <div className="text-center p-10 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 mb-8 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5" />
                                        <div className="relative z-10">
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                                                className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center mb-4 border-2 ${profileResult.overallScore >= 75 ? "bg-emerald-500/20 border-emerald-500/40" : profileResult.overallScore >= 50 ? "bg-amber-500/20 border-amber-500/40" : "bg-red-500/20 border-red-500/40"}`}>
                                                <span className="text-3xl font-black">{profileResult.overallScore}</span>
                                            </motion.div>
                                            <p className={`text-sm font-bold mb-2 ${profileResult.profileStrength === "Strong" ? "text-emerald-400" : "text-amber-400"}`}>
                                                {profileResult.profileStrength} Profile
                                            </p>
                                            <p className="text-sm text-gray-400 max-w-lg mx-auto">{profileResult.analysis}</p>
                                        </div>
                                    </div>

                                    {/* Improvements */}
                                    {profileResult.improvements?.length > 0 && (
                                        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 mb-8">
                                            <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-4">Suggested Improvements</h3>
                                            <ul className="space-y-2">
                                                {profileResult.improvements.map((imp, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                                        <TrendingUp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> {imp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Matched Colleges */}
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Matched Colleges</h3>
                                    <div className="space-y-4 mb-8">
                                        {profileResult.matchedColleges?.map((college, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                                className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded mr-2 ${college.category === "Safety" ? "bg-emerald-500/20 text-emerald-400" : college.category === "Target" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                                                            {college.category || "Target"}
                                                        </span>
                                                        <h3 className="text-lg font-bold text-white mt-2">{college.name}</h3>
                                                    </div>
                                                    <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-sm font-black">{college.matchPercentage}%</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{college.location}</span>
                                                    <span>{college.ranking}</span>
                                                    <span>Accept: {college.acceptanceRate}</span>
                                                    <span>{college.tuition}</span>
                                                </div>
                                                {college.whyGoodFit && <p className="text-xs text-gray-400 italic">{college.whyGoodFit}</p>}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <button onClick={() => setProfileResult(null)}
                                        className="w-full py-4 rounded-2xl bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-all">
                                        Edit Profile
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
