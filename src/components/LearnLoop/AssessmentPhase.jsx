import React, { useState } from 'react';
import { useLearnLoop } from '../../contexts/LearnLoopContext';
import { Bot, Check, ChevronRight } from '../Icons';

const AssessmentPhase = ({ mode, topic }) => {
    const { advancePhase } = useLearnLoop();
    const [answers, setAnswers] = useState({});

    // MOCK DATA - In real implementation, fetch from API
    const questions = [
        { id: 1, text: `What is the core concept of ${topic}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'] },
        { id: 2, text: `How does ${topic} apply to real-world scenarios?`, options: ['Option A', 'Option B', 'Option C', 'Option D'] },
        { id: 3, text: `Which formula relates to ${topic}?`, options: ['Option A', 'Option B', 'Option C', 'Option D'] },
    ];

    const handleSubmit = () => {
        // Mock scoring logic
        const score = Math.floor(Math.random() * 40) + 60; // Random score 60-100
        const weakPoints = score < 80 ? ['Concept A', 'Application B'] : [];

        advancePhase(mode === 'initial' ? 'assessment_initial' : 'assessment_final', { score, weakPoints });
    };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-theme-text mb-2">
                        {mode === 'initial' ? 'Diagnostic Assessment' : 'Mastery Check'}
                    </h2>
                    <p className="text-theme-muted">
                        {mode === 'initial'
                            ? "Let's see what you already know about this topic."
                            : "Let's verify your mastery after the learning session."}
                    </p>
                </div>

                <div className="space-y-6 mb-10">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="glass-panel p-6 rounded-2xl border border-white/5 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                            <p className="font-medium text-theme-text mb-4">
                                <span className="text-theme-primary mr-2">Q{idx + 1}.</span>
                                {q.text}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((opt, optIdx) => (
                                    <button
                                        key={optIdx}
                                        onClick={() => setAnswers({ ...answers, [q.id]: optIdx })}
                                        className={`
                                            p-3 rounded-xl text-left text-sm transition-all
                                            ${answers[q.id] === optIdx
                                                ? 'bg-theme-primary text-white shadow-lg shadow-theme-primary/25'
                                                : 'bg-white/5 hover:bg-white/10 text-theme-muted hover:text-theme-text'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${answers[q.id] === optIdx ? 'border-white bg-white/20' : 'border-theme-muted/30'}`}>
                                                {answers[q.id] === optIdx && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                            </div>
                                            {opt}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleSubmit}
                        disabled={Object.keys(answers).length < questions.length}
                        className={`
                            px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl
                            ${Object.keys(answers).length < questions.length
                                ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-theme-primary to-theme-secondary text-white shadow-theme-primary/25 hover:scale-105 active:scale-95'
                            }
                        `}
                    >
                        <span>Submit Assessment</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssessmentPhase;
