import React from 'react';
import { useLearnLoop } from '../../contexts/LearnLoopContext';
import { Loader2, AlertCircle } from '../Icons';

// Sub-components (Will be implemented fully in next steps)
import AssessmentPhase from './AssessmentPhase';
import ContentPhase from './ContentPhase';
import AnalysisPhase from './AnalysisPhase';
import MasteryPhase from './MasteryPhase';

const LoopManager = () => {
    const { activeLoop, PHASES, exitLoop } = useLearnLoop();

    if (!activeLoop.isActive) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-theme-primary" />
                </div>
                <h2 className="text-2xl font-bold text-theme-text mb-2">No Active Loop</h2>
                <p className="text-theme-muted mb-6 max-w-md">
                    To start a Learn Loop, go to the Doubt Solver and click "Eradicate Doubt" on any answer.
                </p>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-600 dark:text-yellow-400 text-sm">
                    Debug Mode: You can trigger loops from the Doubt Solver.
                </div>
            </div>
        );
    }

    const renderPhase = () => {
        switch (activeLoop.phase) {
            case PHASES.ASSESSMENT_INITIAL:
                return <AssessmentPhase mode="initial" topic={activeLoop.topic} />;

            case PHASES.CONTENT_VIDEO:
            case PHASES.CONTENT_NOTES:
                return <ContentPhase mode={activeLoop.phase === PHASES.CONTENT_VIDEO ? 'video' : 'notes'} topic={activeLoop.topic} />;

            case PHASES.ASSESSMENT_FINAL:
                return <AssessmentPhase mode="final" topic={activeLoop.topic} />;

            case PHASES.MASTERY:
                return <MasteryPhase topic={activeLoop.topic} />;

            case PHASES.ANALYSIS:
                return <AnalysisPhase topic={activeLoop.topic} />;

            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
                    </div>
                );
        }
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            {/* Loop Header */}
            <header className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5 backdrop-blur-sm z-10">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary text-xs font-bold uppercase tracking-wider">
                            Loop In Progress
                        </span>
                        <span className="text-theme-muted text-xs">Attempt #{activeLoop.attempt}</span>
                    </div>
                    <h3 className="font-bold text-theme-text truncate max-w-sm md:max-w-md">
                        {activeLoop.topic}
                    </h3>
                </div>
                <button
                    onClick={exitLoop}
                    className="px-3 py-1.5 text-sm font-medium text-theme-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                    Exit Loop
                </button>
            </header>

            {/* Loop Content */}
            <div className="flex-1 overflow-hidden relative">
                {renderPhase()}
            </div>
        </div>
    );
};

export default LoopManager;
