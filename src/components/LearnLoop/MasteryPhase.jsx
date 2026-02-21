import React, { useEffect } from 'react';
import { useLearnLoop } from '../../contexts/LearnLoopContext';
import { Trophy, Star, Check } from '../Icons';

const MasteryPhase = ({ topic }) => {
    const { exitLoop } = useLearnLoop();

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-theme-bg via-theme-primary/10 to-theme-secondary/20 relative overflow-hidden">
            {/* Confetti Background Effect (CSS only for simplicity) */}
            <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-theme-primary rounded-full animate-ping delay-100" />
                <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-theme-secondary rounded-full animate-ping delay-200" />
            </div>

            <div className="max-w-md w-full animate-fade-in-up z-10">
                <div className="w-32 h-32 mx-auto mb-8 relative">
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-full h-full bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/40">
                        <Trophy className="w-16 h-16 text-white drop-shadow-md" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                        <Star className="w-6 h-6 text-yellow-500 fill-current" />
                    </div>
                </div>

                <h1 className="text-4xl font-black text-theme-text mb-2 tracking-tight">Mastery Achieved!</h1>
                <p className="text-theme-muted text-lg mb-8">
                    You've successfully eradicated all doubts regarding <strong className="text-theme-primary">{topic}</strong>.
                </p>

                <div className="glass-panel p-6 rounded-2xl border border-white/10 mb-8 transform rotate-1">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                            <Check className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h4 className="font-bold text-theme-text">Concept Secured</h4>
                            <p className="text-sm text-theme-muted">Added to your permanent knowledge base</p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full w-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    </div>
                </div>

                <button
                    onClick={exitLoop}
                    className="w-full py-4 bg-theme-text text-theme-bg rounded-xl font-bold hover:scale-105 transition-transform shadow-xl"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
};

export default MasteryPhase;
