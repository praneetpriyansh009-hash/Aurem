import React from 'react';
import { useLearnLoop } from '../../contexts/LearnLoopContext';
import { ChevronRight, RefreshCw, Trophy } from '../Icons';

const AnalysisPhase = ({ topic }) => {
    const { activeLoop, advancePhase } = useLearnLoop();

    // Calculate progress
    const improvement = activeLoop.currentScore - activeLoop.initialScore;
    const isMastered = activeLoop.currentScore >= 80;

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-theme-bg to-theme-primary/5">
            <div className="max-w-md w-full animate-fade-in-up">
                <div className="mb-8 relative">
                    {/* Score Circle */}
                    <div className="w-32 h-32 mx-auto rounded-full bg-theme-bg border-4 border-theme-primary flex items-center justify-center relative shadow-2xl shadow-theme-primary/20">
                        <div className="text-center">
                            <span className="block text-4xl font-black text-theme-text">{activeLoop.currentScore}%</span>
                            <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">Score</span>
                        </div>

                        {/* Improvement Badge */}
                        {improvement > 0 && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                                +{improvement}%
                            </div>
                        )}
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-theme-text mb-2">Analysis Complete</h2>
                <p className="text-theme-muted mb-8">
                    {isMastered
                        ? "Great job! You've demonstrated strong understanding."
                        : "You're making progress, but there's room for improvement."}
                </p>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="glass-panel p-4 rounded-xl border border-white/5">
                        <span className="block text-2xl font-bold text-theme-text">{activeLoop.attempt}</span>
                        <span className="text-xs text-theme-muted uppercase">Attempts</span>
                    </div>
                    <div className="glass-panel p-4 rounded-xl border border-white/5">
                        <span className="block text-2xl font-bold text-theme-text">{activeLoop.weakPoints.length}</span>
                        <span className="text-xs text-theme-muted uppercase">Weak Points</span>
                    </div>
                </div>

                {/* Weak Points List */}
                {activeLoop.weakPoints.length > 0 && (
                    <div className="mb-8 text-left">
                        <h4 className="text-sm font-bold text-theme-muted uppercase mb-3 text-center">Focus Areas</h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {activeLoop.weakPoints.map((wp, idx) => (
                                <span key={idx} className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm border border-red-500/20">
                                    {wp}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                    {!isMastered && (
                        <button
                            onClick={() => advancePhase('analysis')}
                            className="px-6 py-3 bg-theme-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-theme-primary/30 hover:shadow-theme-primary/50 hover:scale-105 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Continue Loop</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisPhase;
