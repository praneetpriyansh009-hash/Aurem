import React from 'react';
import { Trophy, Clock, Activity, Video, Target, Calendar } from '../components/Icons';
import { useTheme } from '../contexts/ThemeContext';

const ExamHub = () => {
    const { isDark } = useTheme();

    return (
        <div className={`h-full overflow-y-auto custom-scrollbar p-6 relative`}>
            {/* Ambient Background - aurora-bg handles this now, but we can add subtle accents if needed */}
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center pt-10">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6
                        ${isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}
                    `}>
                        <Trophy className="w-3.5 h-3.5" /> Competitive Hub
                    </div>
                    <h1 className={`text-4xl md:text-5xl font-black mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Advanced Test Preparation
                    </h1>
                    <p className="text-theme-muted text-lg max-w-xl mx-auto leading-relaxed font-medium">
                        Powerful analytical tools for JEE, NEET, and International curriculum mastery.
                    </p>
                </div>

                {/* Coming Soon Banner */}
                <div className={`relative rounded-[32px] border overflow-hidden transition-all duration-300
                    ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'}
                `}>
                    <div className="relative p-12 text-center">
                        <div className="mb-8">
                            <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-xl shadow-indigo-500/20">
                                <Target className="w-10 h-10" />
                            </div>
                        </div>

                        <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Competitive Modules Coming Soon</h2>
                        <p className="text-theme-muted max-w-md mx-auto mb-8 text-sm leading-relaxed">
                            We're building advanced performance tracking and predictive rank metrics to optimize your exam strategy.
                        </p>

                        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest
                            ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}
                        `}>
                            <Clock className="w-3.5 h-3.5" /> Next Release Phase: Q2 2026
                        </div>
                    </div>
                </div>

                {/* Feature Glimpse */}
                <div className="space-y-8">
                    <h3 className="text-xs font-black text-theme-muted uppercase tracking-[0.4em] text-center">Protocol Capabilities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Calendar className="w-6 h-6 text-indigo-500" />,
                                title: 'Dynamic Scheduling',
                                desc: 'AI-driven study timelines that adapt to your learning pace and strengths.',
                                color: 'indigo'
                            },
                            {
                                icon: <Video className="w-6 h-6 text-indigo-500" />,
                                title: 'Concept Remediation',
                                desc: 'Automatic detection of knowledge gaps with instant targeted resources.',
                                color: 'indigo'
                            },
                            {
                                icon: <Trophy className="w-6 h-6 text-indigo-500" />,
                                title: 'Predictive Ranking',
                                desc: 'Real-time performance metrics and projected competitive rank analytics.',
                                color: 'indigo'
                            }
                        ].map((feature, i) => (
                            <div key={i} className={`p-6 rounded-2xl border transition-all duration-300
                                ${isDark ? 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]' : 'bg-white border-slate-200 hover:border-indigo-100 shadow-sm'}
                            `}>
                                <div className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10`}>
                                    {feature.icon}
                                </div>
                                <h4 className="font-bold text-base mb-2">{feature.title}</h4>
                                <p className="text-xs text-theme-muted leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExamHub;
