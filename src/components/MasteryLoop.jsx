import React, { useState, useEffect } from 'react';
import { generateLensPrompt, fetchTranscript } from '../utils/youtubeService';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Assuming this is needed or used
import { Trophy, CheckCircle2, AlertCircle, RefreshCw, Loader2, ChevronRight, Check, X, Sparkles, Brain } from 'lucide-react';
import { callGemini } from '../utils/geminiClient';

const MASTERY_STATES = {
    IDLE: 'IDLE',
    QUIZ: 'QUIZ',
    SCORING: 'SCORING',
    REMEDIATION: 'REMEDIATION',
    MASTERED: 'MASTERED'
};

const MasteryLoop = ({ initialQuiz, onMastery, contextText, topic }) => {
    const [state, setState] = useState(MASTERY_STATES.IDLE); // Start IDLE, waits for user to start
    const [loopCount, setLoopCount] = useState(1);
    const [currentQuiz, setCurrentQuiz] = useState([]);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState([]); // List of weak topics
    const [isLoading, setIsLoading] = useState(false);

    // Remediation Content States
    const [assessmentReport, setAssessmentReport] = useState(null);
    const [remediationFlashcards, setRemediationFlashcards] = useState(null);
    const [remediationStep, setRemediationStep] = useState(0); // 0: Notes, 1: Flashcards
    const [timer, setTimer] = useState(0);

    // Initial load
    useEffect(() => {
        if (initialQuiz && initialQuiz.length > 0 && state === MASTERY_STATES.IDLE) {
            setState(MASTERY_STATES.QUIZ);
            setCurrentQuiz(initialQuiz);
        }
    }, [initialQuiz]);

    // Timer for remediation steps
    useEffect(() => {
        let interval;
        if (state === MASTERY_STATES.REMEDIATION && timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [state, timer]);

    const handleAnswer = (idx, option) => {
        setAnswers(prev => ({ ...prev, [idx]: option }));
    };

    const submitQuiz = async () => {
        setIsLoading(true);
        setState(MASTERY_STATES.SCORING);

        let correctCount = 0;
        const userResults = currentQuiz.map((q, idx) => {
            const isCorrect = answers[idx] === q.answer || answers[idx] === q.correct_option;
            if (isCorrect) correctCount++;
            return {
                question: q.question,
                userAnswer: answers[idx] || "No Answer",
                correctAnswer: q.answer || q.correct_option,
                isCorrect,
                topic: q.category || q.topic || "General"
            };
        });

        const calculatedScore = (correctCount / currentQuiz.length) * 100;
        setScore(calculatedScore);

        const wrongTopics = userResults.filter(r => !r.isCorrect).map(r => r.topic);
        const uniqueTopics = [...new Set(wrongTopics)];
        setFeedback(uniqueTopics);

        // Fetch Detailed Assessment Report
        try {
            const prompt = "You are an expert AI Assessor. The user completed a quiz on " + topic + ". Their score is " + calculatedScore.toFixed(0) + "%.\n" +
                "PERFORMANCE DATA: " + JSON.stringify(userResults) + "\n\n" +
                "OUTPUT STRICTLY AS JSON:\n" +
                "{\n" +
                "    \"overall_analysis\": \"A supportive but objective 3-sentence summary of their performance.\",\n" +
                "    \"strengths\": [\"List of 2-3 specific topics or concepts they understand closely\"],\n" +
                "    \"weaknesses\": [\"List of 2-3 specific topics they struggled with\"],\n" +
                "    \"detailed_feedback\": [\n" +
                "        { \"question_snippet\": \"First 5 words of the question...\", \"explanation\": \"Explain exactly why the correct answer is correct, and why their answer was wrong. Be extremely clear.\" }\n" +
                "    ],\n" +
                "    \"remediation_notes\": \"If score < 60, provide a robust, bulleted crash-course exclusively teaching their weak points. If >= 60, output an empty string.\"\n" +
                "}";
            const response = await callGemini([{ role: 'user', content: prompt }]);

            let jsonStr = response.choices?.[0]?.message?.content || "{}";
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            } else {
                jsonStr = jsonStr.replace(new RegExp('\\x60\\x60\\x60(?:json)?', 'gi'), '').trim();
            }

            const data = JSON.parse(jsonStr);
            setAssessmentReport(data);

        } catch (err) {
            console.error("Assessment Gen Error", err);
            // Fallback
            setAssessmentReport({
                overall_analysis: "Quiz evaluation completed but detailed analysis failed to load.",
                strengths: [], weaknesses: uniqueTopics,
                detailed_feedback: [], remediation_notes: "Focus on reviewing: " + uniqueTopics.join(", ")
            });
        }

        setIsLoading(false);
        if (calculatedScore >= 60) {
            setState(MASTERY_STATES.MASTERED);
            onMastery && onMastery({ score: calculatedScore, weakPoints: uniqueTopics });
        } else {
            setState(MASTERY_STATES.REMEDIATION);
            setRemediationStep(0);
            setTimer(15); // Require 15 seconds reading notes
        }
    };

    const advanceRemediation = async () => {
        if (timer > 0) return;
        if (remediationStep === 0) {
            setRemediationStep(1); // Move to Flashcards
            setTimer(10); // Require 10 seconds of flashcards

            // Generate Flashcards while they enter step
            try {
                const prompt = "Generate 4 intense, highly targeted flashcards to help a student memorize these exact concepts they failed in a quiz: [" + feedback.join(", ") + "].\n" +
                    "Output strictly as a JSON object: { \"flashcards\": [{ \"question\": \"...\", \"answer\": \"...\" }] }";
                const r = await callGemini([{ role: 'user', content: prompt }]);

                let jStr = r.choices?.[0]?.message?.content || "{}";
                const jMatch = jStr.match(/\{[\s\S]*\}/);
                if (jMatch) jStr = jMatch[0];
                else jStr = jStr.replace(new RegExp('\\x60\\x60\\x60(?:json)?', 'gi'), '').trim();

                setRemediationFlashcards(JSON.parse(jStr).flashcards);
            } catch (e) {
                console.error("Flashcards failed", e);
                setRemediationFlashcards([]);
            }

        } else {
            // Restart quiz
            setAnswers({});
            setLoopCount(c => c + 1);
            setState(MASTERY_STATES.QUIZ);
        }
    };

    // Flashcard UI Component
    const RemedialCard = ({ card }) => {
        const [flipped, setFlipped] = useState(false);
        return (
            <div onClick={() => setFlipped(!flipped)} className="relative h-48 w-full cursor-pointer perspective-1000 group">
                <div className={`relative w - full h - full transition - all duration - 500 preserve - 3d ${flipped ? 'rotate-y-180' : ''} `}>
                    <div className="absolute inset-0 backface-hidden p-6 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-center items-center text-center">
                        <Brain className="w-6 h-6 text-orange-500/50 mb-3" />
                        <h4 className="font-bold text-slate-200">{card.question}</h4>
                        <p className="text-[10px] text-slate-500 uppercase mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to reveal</p>
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 p-6 rounded-2xl bg-orange-600 border border-orange-500 flex flex-col justify-center items-center text-center text-white shadow-xl shadow-orange-500/20">
                        <Sparkles className="w-5 h-5 text-white/50 absolute top-4 right-4" />
                        <p className="font-bold text-lg">{card.answer}</p>
                    </div>
                </div>
            </div>
        );
    };

    if (state === MASTERY_STATES.SCORING) {
        return (
            <div className="py-24 text-center space-y-6">
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto" />
                <h3 className="text-2xl font-black text-white">Analyzing Assessment...</h3>
                <p className="text-slate-400 max-w-sm mx-auto">Evaluating responses, identifying knowledge gaps, and generating personalized intelligence report.</p>
            </div>
        );
    }

    if (state === MASTERY_STATES.MASTERED) {
        return (
            <div className="space-y-8 animate-in zoom-in duration-500">
                <div className="p-12 text-center bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                        <span className="text-4xl">🏆</span>
                    </div>
                    <h2 className="text-3xl font-black mb-2">Topic Mastered</h2>
                    <p className="text-emerald-500 font-bold mb-6 text-xl">Score: {score.toFixed(0)}%</p>
                    <p className="text-slate-300 max-w-md mx-auto">{assessmentReport?.overall_analysis}</p>
                </div>

                {assessmentReport && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                            <h4 className="text-emerald-400 font-bold mb-4 uppercase tracking-widest text-sm">Strong Points</h4>
                            <ul className="space-y-2 text-sm text-slate-300">
                                {assessmentReport.strengths?.map((s, i) => <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" />{s}</li>)}
                            </ul>
                        </div>
                        <div className="p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                            <h4 className="text-orange-400 font-bold mb-4 uppercase tracking-widest text-sm">Areas for Growth</h4>
                            <ul className="space-y-2 text-sm text-slate-300">
                                {assessmentReport.weaknesses?.map((w, i) => <li key={i} className="flex gap-2"><X className="w-4 h-4 text-orange-500 shrink-0" />{w}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                {assessmentReport?.detailed_feedback?.length > 0 && (
                    <div className="p-6 border border-slate-800 rounded-2xl bg-slate-900/50">
                        <h4 className="font-black text-white mb-6">Detailed Answer Feedback</h4>
                        <div className="space-y-4">
                            {assessmentReport.detailed_feedback.map((f, i) => (
                                <div key={i} className="p-4 bg-slate-800/50 rounded-xl text-sm">
                                    <p className="text-slate-400 italic mb-2">"{f.question_snippet}..."</p>
                                    <p className="text-slate-200">{f.explanation}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (state === MASTERY_STATES.REMEDIATION) {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-red-500/5 p-8 rounded-3xl border border-red-500/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-red-500 mb-1 flex items-center gap-3">
                                <AlertCircle className="w-6 h-6" /> Assessment Failed ({score.toFixed(0)}%)
                            </h3>
                            <p className="text-slate-400 text-sm">Score must be {'>'} 60% to progress. Forced Remediation initiated.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {remediationStep === 0 && (
                            <div className="animate-in fade-in">
                                <h4 className="text-red-400 uppercase tracking-widest text-sm font-black mb-4 flex items-center gap-2">
                                    <span className="bg-red-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">1</span>
                                    Targeted Remediation Notes
                                </h4>
                                <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 prose prose-invert max-w-none prose-sm">
                                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {assessmentReport?.remediation_notes || "Reviewing foundational concepts for missed questions."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {remediationStep === 1 && (
                            <div className="animate-in fade-in slide-in-from-right">
                                <h4 className="text-orange-400 uppercase tracking-widest text-sm font-black mb-4 flex items-center gap-2">
                                    <span className="bg-orange-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">2</span>
                                    Flashcard Review
                                </h4>

                                <div className="p-8 pb-12 bg-slate-900 rounded-2xl border border-orange-500/30">
                                    <div className="text-center mb-8">
                                        <Trophy className="w-12 h-12 text-orange-500/50 mx-auto mb-4" />
                                        <h5 className="text-xl font-bold text-white mb-2">Concept Reinforcement</h5>
                                        <p className="text-slate-400 max-w-sm mx-auto">Mentally review the missed connections. We are aggressively targeting your weak points before the retest.</p>
                                    </div>

                                    {!remediationFlashcards ? (
                                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {remediationFlashcards.map((c, i) => <RemedialCard key={i} card={c} />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={advanceRemediation}
                            disabled={timer > 0}
                            className={`w - full py - 5 rounded - 2xl font - black text - lg transition - all transform hover: scale - [1.02] active: scale - 95 flex items - center justify - center gap - 3 ${timer > 0
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                : 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-xl shadow-red-500/30'
                                } `}
                        >
                            {timer > 0 ? `REQUIRED REVIEW(${timer}s)` : (remediationStep === 0 ? 'PROCEED TO FLASHCARDS' : 'RETAKE ASSESSMENT')}
                            {timer === 0 && <ChevronRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (state === MASTERY_STATES.QUIZ) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div>
                        <h3 className="text-xl font-black tracking-tight">Concept Check</h3>
                        <p className="text-slate-500 text-xs font-bold uppercase">Topic: {topic}</p>
                    </div>
                    <div className="text-sm font-black bg-orange-500/10 text-orange-500 px-5 py-2 rounded-2xl border border-orange-500/20">
                        {Object.keys(answers).length} / {currentQuiz.length} COMPLETED
                    </div>
                </div>

                <div className="space-y-6">
                    {currentQuiz.map((q, i) => (
                        <div key={i} className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50 hover:border-orange-500/30 transition-all group">
                            <h4 className="font-bold text-lg mb-6 leading-relaxed group-hover:text-white transition-colors">{i + 1}. {q.question}</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {q.options.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(i, opt)}
                                        className={`p - 4 rounded - 2xl text - left transition - all border font - medium text - sm flex items - center justify - between ${answers[i] === opt
                                            ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-lg shadow-orange-500/5'
                                            : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-400'
                                            } `}
                                    >
                                        <span>{opt}</span>
                                        {answers[i] === opt && <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-8 pb-12">
                    <button
                        onClick={submitQuiz}
                        disabled={Object.keys(answers).length < currentQuiz.length}
                        className="px-12 py-4 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-orange-500/30 flex items-center gap-3"
                    >
                        COMPLETE ASSESSMENT <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return <div>Initializing Mastery Loop...</div>;
};

export default MasteryLoop;
