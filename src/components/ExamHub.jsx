import React from 'react';
import { Trophy, Sparkles } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

const ExamHub = () => {
    const { isDark } = useTheme();

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto space-y-6 text-center animate-in fade-in duration-500">
            <div className="p-6 bg-amber-500/10 rounded-[32px] border border-amber-500/20 shadow-2xl shadow-amber-500/10">
                <Trophy className="w-16 h-16 text-amber-500" />
            </div>
            <h1 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Competitive Prep</h1>
            <p className="text-theme-muted font-medium text-lg leading-relaxed">
                The grand competitive circuit is currently undergoing stabilization.
                Keep refining your mastery in the <span className="text-amber-500 font-bold">Neural Arena</span> while we finalize the global leaderboard protocol.
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 rounded-full border border-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> Coming Soon
            </div>
        </div>
    );
};

export default ExamHub;
