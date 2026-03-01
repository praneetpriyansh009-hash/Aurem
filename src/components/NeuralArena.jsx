import React, { useState } from 'react';
import { Trophy, Clock, Activity, Video, Target, Calendar, Swords, Sparkles, BrainCircuit, Loader2, Gauge, Cpu } from '../components/Icons';
import { useTheme } from '../contexts/ThemeContext';
import BrainLink from './BrainLink';
import { useRetryableFetch, GROQ_API_URL, formatGroqPayload } from '../utils/api';

const NeuralArena = ({ onExit, setIsCollapsed }) => {
    const { isDark } = useTheme();
    const { retryableFetch } = useRetryableFetch();
    const [currentView, setCurrentView] = useState('lobby'); // lobby | battle
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Normal');
    const [quizData, setQuizData] = useState(null);
    const [battleState, setBattleState] = useState('idle'); // idle | loading | active

    // Gamification State
    const [stats, setStats] = useState(() => {
        const saved = localStorage.getItem('aurem_stats');
        return saved ? JSON.parse(saved) : { xp: 0, level: 1, battles: 0, wins: 0 };
    });

    const getRank = (lvl) => {
        if (lvl <= 5) return { name: 'Novice', color: 'text-slate-400', bg: 'bg-slate-400/10' };
        if (lvl <= 15) return { name: 'Scholar', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
        if (lvl <= 30) return { name: 'Strategist', color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
        if (lvl <= 50) return { name: 'Master', color: 'text-amber-400', bg: 'bg-amber-400/10' };
        return { name: 'Grandmaster', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    };

    const rank = getRank(stats.level);
    const nextLevelXP = Math.pow(stats.level, 2) * 100;
    const progress = (stats.xp / nextLevelXP) * 100;

    const startBattle = async (e) => {
        if (e) e.preventDefault();
        if (!topic.trim()) return;

        setBattleState('loading');
        try {
            const prompt = `Generate 10 ELITE CBSE COMPETENCY MCQs on the topic: "${topic}".
            Focus on Assertion-Reasoning and Case-Based questions.
            Respond ONLY with a valid JSON object: { "questions": [{ "question": "...", "options": ["...", "...", "...", "..."], "answer": "Exact correct text", "explanation": "..." }] }`;

            const payload = formatGroqPayload(prompt, "You are a master competitive exam architect.");
            const res = await retryableFetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const content = res.choices?.[0]?.message?.content || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                setQuizData(data.questions);
                setBattleState('active');
                if (setIsCollapsed) setIsCollapsed(true);
            }
        } catch (e) {
            console.error(e);
            alert("Battle link failed. Try again.");
            setBattleState('idle');
        }
    };

    const handleBattleComplete = (results) => {
        const difficultyMultiplier = { 'Normal': 1, 'Heroic': 1.5, 'Godly': 2.5 }[difficulty];
        const earnedXP = Math.round(results.score * 0.1 * difficultyMultiplier);

        setStats(prev => {
            let newXP = prev.xp + earnedXP;
            let newLevel = prev.level;
            let reqXP = Math.pow(newLevel, 2) * 100;

            while (newXP >= reqXP) {
                newXP -= reqXP;
                newLevel++;
                reqXP = Math.pow(newLevel, 2) * 100;
            }

            const newStats = {
                ...prev,
                xp: newXP,
                level: newLevel,
                battles: prev.battles + 1,
                wins: prev.wins + (results.isWinner ? 1 : 0)
            };
            localStorage.setItem('aurem_stats', JSON.stringify(newStats));
            return newStats;
        });
    };

    if (battleState === 'active') {
        return (
            <div className="h-full p-6">
                <button
                    onClick={() => setBattleState('idle')}
                    className="mb-6 px-4 py-2 rounded-xl bg-theme-primary/5 border border-theme-primary/20 text-xs font-bold uppercase tracking-widest text-theme-muted hover:bg-theme-primary/10"
                >
                    Back to Hub
                </button>
                <BrainLink
                    quizData={quizData}
                    topic={topic}
                    difficulty={difficulty}
                    onExit={() => setBattleState('idle')}
                    onComplete={handleBattleComplete}
                    isDark={isDark}
                />
            </div>
        );
    }

    return (
        <div className={`h-full overflow-y-auto custom-scrollbar p-8 md:p-12 relative overflow-hidden bg-theme-bg`}>
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-theme-primary opacity-10 blur-[150px] rounded-full -mr-64 -mt-64 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-theme-secondary opacity-10 blur-[150px] rounded-full -ml-64 -mb-64 animate-pulse delay-1000"></div>

            <div className="max-w-5xl mx-auto space-y-10 relative z-10 w-full animate-in fade-in zoom-in duration-700">
                {/* Header Section: Compact & Elite */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-theme-border bg-theme-surface backdrop-blur-md">
                        <Swords className="w-4 h-4 text-theme-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-theme-primary">COGNITIVE COMBAT PROTOCOL</span>
                    </div>

                    <div>
                        <h1 className={`text-4xl md:text-5xl font-black tracking-tighter italic uppercase text-theme-text`}>
                            Cognitive <span className="bg-gradient-to-r from-theme-secondary via-theme-primary to-theme-secondary bg-clip-text text-transparent">Colosseum</span>
                        </h1>
                        <p className="text-theme-muted text-sm md:text-base max-w-xl mx-auto font-bold opacity-80 mt-2">
                            High-speed intellect synthesis. Set your parameters and link nodes.
                        </p>
                    </div>
                </div>

                {/* Battle Core: Compacted HUD */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* Left: Initialization Core */}
                    <div className={`flex flex-col p-8 rounded-[32px] border glass-3d relative overflow-hidden group transition-all duration-500 will-change-transform bg-theme-surface border-theme-border hover:border-theme-primary
                    `}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-theme-primary to-theme-secondary"></div>

                        <div className="space-y-6 relative z-10 w-full">
                            <div>
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-theme-primary">Battle Synchronization</h2>
                            </div>

                            <form onSubmit={startBattle} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted ml-2">Neural Focus Area</label>
                                    <div className="relative group/input">
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={e => setTopic(e.target.value)}
                                            placeholder="e.g. Thermodynamics, Molecular Biology..."
                                            className={`w-full py-4 pl-6 pr-12 rounded-[24px] text-base md:text-lg font-bold outline-none transition-all duration-300 bg-theme-surface text-theme-text border-theme-border focus:border-theme-primary shadow-inner border-2`}
                                        />
                                        <Sparkles className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-primary" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted ml-2">Processing Intensity</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Normal', 'Heroic', 'Godly'].map(level => (
                                            <button
                                                type="button"
                                                key={level}
                                                onClick={() => setDifficulty(level)}
                                                className={`py-3 px-2 rounded-[20px] border-2 transition-all duration-300 flex flex-col items-center gap-1.5
                                                    ${difficulty === level
                                                        ? 'border-theme-primary bg-theme-primary/10 scale-[1.02] shadow-[0_0_20px_rgba(201,165,90,0.15)]'
                                                        : 'border-theme-border bg-theme-surface hover:border-theme-primary/50'}
                                                `}
                                            >
                                                <Gauge className={`w-5 h-5 ${difficulty === level ? 'text-theme-primary' : 'text-theme-muted'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${difficulty === level ? 'text-theme-primary' : 'text-theme-muted'}`}>{level}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    disabled={battleState === 'loading' || !topic.trim()}
                                    className={`w-full py-5 mt-2 rounded-[24px] font-black tracking-widest transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group/btn uppercase text-theme-bg
                                        ${battleState === 'loading'
                                            ? 'bg-theme-muted opacity-50 cursor-not-allowed'
                                            : 'bg-theme-primary hover:bg-theme-secondary hover:shadow-lg hover:shadow-theme-primary/20 active:scale-[0.98]'
                                        }`}
                                >
                                    {battleState === 'loading' ? (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme-primary/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Searching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <BrainCircuit className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                                            <span>Link Neural Node</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Commander Profile / Spectral HUD */}
                    <div className={`rounded-[32px] border glass-3d flex flex-col p-8 transition-all duration-500 relative overflow-hidden will-change-transform bg-theme-surface border-theme-border
                    `}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-theme-primary opacity-10 blur-3xl rounded-full -mr-16 -mt-16 animate-pulse"></div>

                        <div className="relative z-10 w-full flex flex-col items-center">
                            <div className="flex items-center justify-between w-full mb-6">
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-theme-primary">Commander Profile</h2>
                                <Cpu className="w-5 h-5 text-theme-primary opacity-40 animate-spin-slow" />
                            </div>

                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-theme-primary opacity-20 blur-[30px] rounded-full animate-pulse"></div>
                                <div className="relative w-28 h-28 rounded-full bg-theme-bg border-2 border-theme-primary flex items-center justify-center p-1">
                                    <div className="w-full h-full rounded-full border border-theme-primary/30 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-theme-text leading-none">{stats.level}</span>
                                        <span className="text-[8px] font-black uppercase text-theme-primary tracking-widest mt-1">Level</span>
                                    </div>
                                    <div className="absolute -bottom-2 px-3 py-1 rounded-full bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg text-[8px] font-black uppercase tracking-widest shadow-lg">
                                        Rank: {rank.name}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black uppercase text-theme-muted tracking-widest">XP Progress</span>
                                        <span className="text-[9px] font-black text-theme-primary tabular-nums">{stats.xp} / {nextLevelXP}</span>
                                    </div>
                                    <div className="h-2 w-full bg-theme-bg rounded-full overflow-hidden p-0.5 border border-theme-border">
                                        <div
                                            className="h-full bg-gradient-to-r from-theme-primary to-theme-secondary rounded-full transition-all duration-1000"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4">
                                    <div className="p-4 rounded-2xl bg-theme-bg border border-theme-border text-center">
                                        <span className="text-[8px] font-black uppercase text-theme-muted tracking-widest block mb-1">Engagements</span>
                                        <span className="text-xl font-black text-theme-text">{stats.battles}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-theme-bg border border-theme-border text-center">
                                        <span className="text-[8px] font-black uppercase text-theme-muted tracking-widest block mb-1">Win Rate</span>
                                        <span className="text-xl font-black text-emerald-400">
                                            {stats.battles === 0 ? '0%' : `${Math.round((stats.wins / stats.battles) * 100)}%`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NeuralArena;
