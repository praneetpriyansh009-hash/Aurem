import React from 'react';
import { useLearnLoop } from '../../contexts/LearnLoopContext';
import { Play, FileText, ChevronRight, Mic } from '../Icons';

const ContentPhase = ({ mode, topic }) => {
    const { advancePhase } = useLearnLoop();

    const handleContinue = () => {
        advancePhase(mode === 'video' ? 'content_video' : 'content_notes');
    };

    return (
        <div className="h-full flex flex-col">
            {/* Content Display Area */}
            <div className="flex-1 bg-black/50 relative">
                {mode === 'video' ? (
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center mb-6 shadow-2xl shadow-theme-primary/30 animate-pulse-soft">
                            <Play className="w-10 h-10 text-white ml-1" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Smart Lecture: {topic}</h2>
                        <p className="text-white/60 max-w-md">
                            AI is generating a personalized lecture with slides and audio explanation...
                        </p>
                        <div className="mt-8 flex gap-3">
                            <div className="h-1 w-20 bg-theme-primary rounded-full animate-bounce delay-75"></div>
                            <div className="h-1 w-20 bg-theme-secondary rounded-full animate-bounce delay-150"></div>
                            <div className="h-1 w-20 bg-theme-primary rounded-full animate-bounce delay-300"></div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar bg-theme-bg">
                        <div className="max-w-3xl mx-auto prose dark:prose-invert">
                            <h1>Deep Dive Notes: {topic}</h1>
                            <p className="lead">Here is a comprehensive breakdown of the concepts based on your initial assessment performance.</p>

                            <h3>Key Concepts</h3>
                            <ul>
                                <li><strong>Definition:</strong> Core explanation of {topic}.</li>
                                <li><strong>Application:</strong> How it works in practice.</li>
                                <li><strong>Common Pitfalls:</strong> What to avoid.</li>
                            </ul>

                            <hr />

                            <h3>Detailed Analysis</h3>
                            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>

                            <div className="p-4 bg-theme-primary/10 border-l-4 border-theme-primary rounded-r-lg my-6">
                                <strong>Pro Tip:</strong> Remember that understanding the underlying principle is more important than memorizing the formula.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 border-t border-white/5 bg-theme-bg/80 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        className={`p-3 rounded-xl transition-all ${mode === 'video' ? 'bg-theme-primary text-white shadow-lg' : 'bg-white/5 text-theme-muted hover:bg-white/10'}`}
                        title="Smart Lecture"
                    >
                        <Play className="w-5 h-5" />
                    </button>
                    <button
                        className={`p-3 rounded-xl transition-all ${mode === 'notes' ? 'bg-theme-primary text-white shadow-lg' : 'bg-white/5 text-theme-muted hover:bg-white/10'}`}
                        title="Notes"
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                    <button
                        className="p-3 rounded-xl bg-white/5 text-theme-muted hover:bg-white/10"
                        title="Podcast Mode"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={handleContinue}
                    className="px-6 py-3 bg-theme-text text-theme-bg rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <span>{mode === 'video' ? "Read Notes" : "Take Mastery Check"}</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ContentPhase;
