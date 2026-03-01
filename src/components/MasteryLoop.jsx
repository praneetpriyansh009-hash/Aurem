import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle2, AlertCircle, RefreshCw, Loader2, ChevronRight, Check, X, Sparkles, Brain, FileText, CreditCard } from 'lucide-react';
import { retryableFetch, GROQ_API_URL } from '../utils/api';

const MASTERY_STATES = {
    IDLE: 'IDLE',
    QUIZ: 'QUIZ',
    SCORING: 'SCORING',
    REVIEW: 'REVIEW',
    REMEDIATION: 'REMEDIATION'
};

const fetchGroq = async (prompt) => {
    const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4
    };
    const res = await retryableFetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return res;
};

const MasteryLoop = ({ initialQuiz, onMastery, contextText, topic, isDark, MarkdownRenderer }) => {
    const [state, setState] = useState(MASTERY_STATES.IDLE);
    const [loopCount, setLoopCount] = useState(1);
    const [currentQuiz, setCurrentQuiz] = useState([]);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Remediation Content States
    const [assessmentReport, setAssessmentReport] = useState(null);
    const [remediationFlashcards, setRemediationFlashcards] = useState(null);
    const [remediationStep, setRemediationStep] = useState(0); // 0: Notes, 1: Flashcards

    const [loadingNotes, setLoadingNotes] = useState(false);
    const [remedialNotesContent, setRemedialNotesContent] = useState('');
    const [loadingCards, setLoadingCards] = useState(false);

    // Initial load
    useEffect(() => {
        if (initialQuiz && initialQuiz.length > 0 && state === MASTERY_STATES.IDLE) {
            setState(MASTERY_STATES.QUIZ);
            setCurrentQuiz(initialQuiz);
        }
    }, [initialQuiz, state]);

    // Auto-generate content when entering remediation steps
    useEffect(() => {
        if (state === MASTERY_STATES.REMEDIATION) {
            if (remediationStep === 0 && !remedialNotesContent && !loadingNotes) {
                generateRemedialNotes();
            } else if (remediationStep === 1 && !remediationFlashcards && !loadingCards) {
                generateRemedialCards();
            }
        }
    }, [state, remediationStep, remedialNotesContent, remediationFlashcards, loadingNotes, loadingCards]);


    const handleAnswer = (idx, option) => {
        setAnswers(prev => ({ ...prev, [idx]: option }));
    };

    const submitQuiz = async () => {
        setIsLoading(true);
        setState(MASTERY_STATES.SCORING);

        let totalPoints = 0;
        let earnedPoints = 0;

        const finalResults = [];

        for (let i = 0; i < currentQuiz.length; i++) {
            const q = currentQuiz[i];
            const userAnswer = answers[i] || "";

            if (q.type === 'subjective') {
                totalPoints += 10;
                // AI GRADING PROTOCOL
                try {
                    const gradePrompt = `Act as an expert academic grader. Grade the following student response for a ${q.difficulty} level question based on the document topic.
QUESTION: ${q.question}
MODEL ANSWER/KEY POINTS: ${q.answer}
STUDENT ANSWER: ${userAnswer}

CRITERIA:
- Correctness (Is it factually accurate?)
- Depth (Does it cover nuances or just surface level?)
- Clarity (Is it well-explained?)

Return ONLY a JSON object: { "score": 0-10, "assessment": "1 sentence feedback", "missing_points": ["point 1", "point 2"] }`;
                    const res = await fetchGroq(gradePrompt);
                    let gradeData = { score: 0, assessment: "Could not evaluate.", missing_points: [] };
                    try {
                        const match = res.choices?.[0]?.message?.content.match(/\{[\s\S]*\}/);
                        if (match) gradeData = JSON.parse(match[0]);
                    } catch (e) { }

                    earnedPoints += gradeData.score;
                    finalResults.push({
                        ...q,
                        userAnswer,
                        correctAnswer: q.answer,
                        isCorrect: gradeData.score >= 7,
                        explanation: gradeData.assessment + (gradeData.missing_points.length ? " Missing: " + gradeData.missing_points.join(", ") : ""),
                        topic: q.weak_point || q.concept || "General"
                    });
                } catch (e) {
                    finalResults.push({ ...q, userAnswer, isCorrect: false, explanation: "Grading failed." });
                }
            } else {
                // MCQ logic
                totalPoints += 1;
                const isCorrect = userAnswer === q.answer || userAnswer === q.correct_option;
                if (isCorrect) earnedPoints += 1;
                finalResults.push({
                    ...q,
                    userAnswer,
                    correctAnswer: q.answer || q.correct_option,
                    isCorrect,
                    topic: q.weak_point || q.concept || "General"
                });
            }
        }

        const calculatedScore = (earnedPoints / totalPoints) * 100;
        setScore(calculatedScore);

        const wrongTopics = finalResults.filter(r => !r.isCorrect).map(r => r.topic);
        const uniqueTopics = [...new Set(wrongTopics)];
        setFeedback(uniqueTopics);

        const assessmentReportData = {
            overall_analysis: calculatedScore >= 60 ? "Great job! Your depth of understanding is impressive." : "You have significant gaps, particularly in analytical depth. Let's fix that.",
            strengths: finalResults.filter(r => r.isCorrect).map(r => r.concept || r.topic).filter((v, i, a) => v && a.indexOf(v) === i),
            weaknesses: uniqueTopics,
            detailed_feedback: finalResults.map(r => ({
                question_snippet: r.question,
                explanation: r.explanation || "No explanation provided.",
                concept: r.concept || "General",
                approach: r.approach || "N/A",
                weak_point: r.weak_point || "N/A",
                isCorrect: r.isCorrect,
                userAnswer: r.userAnswer,
                correctAnswer: r.correctAnswer
            }))
        };

        setAssessmentReport(assessmentReportData);
        setIsLoading(false);
        setState(MASTERY_STATES.REVIEW);
    };

    const generateRemedialNotes = async () => {
        setLoadingNotes(true);
        try {
            const prompt = `Construct an EXHAUSTIVE, ELITE CRASH-COURSE teaching these specific missed concepts: ${feedback.join(", ")}.
This is not a summary; it is a high-intensity analytical deep-dive designed to bridge the gap to total mastery.

INSTRUCTIONAL REQUIREMENTS:
1.  **High-Octane Analysis**: Explain each concept from the ground up, then scale to advanced synthesis. Target high density of detail.
2.  **Structural Rigor**: Use ## headers for each concept, #### for granular definitions, and > blockquotes for critical 'Mastery Insights'.
3.  **Visual Intelligence**: Use markdown tables to compare subtle differences between the missed topics.
4.  **Tone**: Expert mentor. Academic, precise, and uncompromising on depth.

DO NOT include pleasantries. Start immediately with the headers.`;
            const r = await fetchGroq(prompt);
            setRemedialNotesContent(r.choices?.[0]?.message?.content || "Could not generate notes.");
        } catch (e) {
            setRemedialNotesContent("Failed to generate notes. Please check connection.");
        }
        setLoadingNotes(false);
    };

    const generateRemedialCards = async () => {
        setLoadingCards(true);
        try {
            const prompt = `Generate EXACTLY 10 intense, highly targeted flashcards to help a student memorize these exact concepts they failed in a quiz: [${feedback.join(", ")}].
CRITICAL RULE: The flashcard "answer" MUST be incredibly concise (maximum 1-3 short sentences). Do not write paragraphs or the text will overflow the card UI. Use punchy, impactful statements.
Output strictly as a JSON object: { "flashcards": [{ "question": "...", "answer": "..." }] }`;
            const r = await fetchGroq(prompt);

            let jStr = r.choices?.[0]?.message?.content || "{}";
            const jMatch = jStr.match(/\{[\s\S]*\}/);
            if (jMatch) jStr = jMatch[0];
            else jStr = jStr.replace(new RegExp('\\x60\\x60\\x60(?:json)?', 'gi'), '').trim();

            setRemediationFlashcards(JSON.parse(jStr).flashcards);
        } catch (e) {
            console.error("Flashcards failed", e);
            setRemediationFlashcards([]);
        }
        setLoadingCards(false);
    };

    const handleContinueFromReview = () => {
        if (score >= 60) {
            // Success! Trigger mastery callback.
            onMastery && onMastery({ score, weakPoints: feedback });
        } else {
            // Failed. Go to Remediation Notes.
            setState(MASTERY_STATES.REMEDIATION);
            setRemediationStep(0);
            setRemedialNotesContent('');
            setRemediationFlashcards(null);
        }
    };

    const advanceRemediation = () => {
        if (remediationStep === 0) {
            setRemediationStep(1); // Move to Flashcards
        } else {
            // Restart quiz
            setAnswers({});
            setCurrentQuestionIndex(0);
            setRemediationFlashcards(null);
            setRemedialNotesContent('');
            setLoopCount(c => c + 1);
            setState(MASTERY_STATES.QUIZ);
        }
    };

    // Flashcard UI Component
    const RemedialCard = ({ card }) => {
        const [flipped, setFlipped] = useState(false);
        return (
            <div onClick={() => setFlipped(!flipped)} className="relative h-48 w-full cursor-pointer perspective-1000 group">
                <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>
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

    if (state === MASTERY_STATES.REVIEW) {
        const passed = score >= 60;
        return (
            <div className="space-y-8 animate-in zoom-in duration-500">
                <div className={`p-10 text-center rounded-3xl border ${passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${passed ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                        <span className="text-4xl">{passed ? '🏆' : '⚠️'}</span>
                    </div>
                    <h2 className="text-3xl font-black mb-2">{passed ? 'Assessment Passed' : 'Assessment Failed'}</h2>
                    <p className={`font-bold mb-6 text-xl ${passed ? 'text-emerald-500' : 'text-red-500'}`}>Score: {score.toFixed(0)}% (Min 60%)</p>
                    <p className="text-slate-300 max-w-md mx-auto">{assessmentReport?.overall_analysis}</p>
                </div>

                {assessmentReport?.detailed_feedback?.length > 0 && (
                    <div className="p-6 border border-slate-800 rounded-2xl bg-slate-900/50">
                        <h4 className="font-black text-white mb-6 text-xl">Detailed Question Feedback</h4>
                        <div className="space-y-6">
                            {assessmentReport.detailed_feedback.map((f, i) => (
                                <div key={i} className="p-5 bg-slate-800/50 rounded-xl text-sm border border-slate-700/50">
                                    <p className="text-slate-200 font-bold mb-3 text-lg">{i + 1}. {f.question_snippet}</p>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="p-4 bg-slate-900/80 rounded-lg">
                                            <span className="text-[10px] text-slate-500 uppercase font-black block mb-1">Your Answer</span>
                                            <span className={`font-medium ${f.isCorrect ? "text-emerald-400" : "text-red-400"}`}>{f.userAnswer}</span>
                                        </div>
                                        <div className="p-4 bg-emerald-500/10 rounded-lg">
                                            <span className="text-[10px] text-emerald-500/70 uppercase font-black block mb-1">Correct Answer</span>
                                            <span className="text-emerald-400 font-medium">{f.correctAnswer}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3 bg-slate-900/60 p-4 rounded-lg text-slate-300">
                                        <p><span className="font-bold text-indigo-400 block mb-1 text-xs uppercase tracking-wider">Concept Tested</span> {f.concept}</p>
                                        <p><span className="font-bold text-violet-400 block mb-1 text-xs uppercase tracking-wider">Solving Approach</span> {f.approach}</p>
                                        <p><span className="font-bold text-orange-400 block mb-1 text-xs uppercase tracking-wider">Detailed Explanation</span> {f.explanation}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleContinueFromReview}
                    className={`w-full py-5 rounded-2xl font-black text-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-white shadow-xl ${passed ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30' : 'bg-gradient-to-r from-red-500 to-orange-600 shadow-red-500/30'}`}
                >
                    {passed ? 'UNLOCK NEXT LEVEL' : 'BEGIN TARGETED REMEDIATION'} <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    }

    if (state === MASTERY_STATES.REMEDIATION) {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-red-500/10 p-6 border-b border-red-500/20 flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center"><Brain className="w-6 h-6" /></div>
                        <div>
                            <h3 className="text-xl font-black text-white">Targeted Remediation Loop</h3>
                            <p className="text-slate-400 text-sm">Master your weak points before the retest</p>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {remediationStep === 0 && (
                            <div className="animate-in fade-in">
                                <h4 className="text-orange-400 uppercase tracking-widest text-sm font-black mb-6 flex items-center gap-2">
                                    <span className="bg-orange-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">1</span>
                                    Concept Crash Course
                                </h4>

                                <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-6">
                                    <p className="text-slate-200 font-bold mb-3">Target Weaknesses:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {feedback.map((f, i) => <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/20">{f}</span>)}
                                    </div>
                                </div>

                                {loadingNotes ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                        <p className="text-slate-400 font-bold">Generating hyper-specific study notes...</p>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-900/80 border border-slate-700/80 rounded-2xl text-slate-300 text-sm max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {MarkdownRenderer ? (
                                            <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                                                <MarkdownRenderer text={remedialNotesContent} isDark={isDark || true} />
                                            </div>
                                        ) : (
                                            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                                                {remedialNotesContent}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {remediationStep === 1 && (
                            <div className="animate-in fade-in slide-in-from-right">
                                <h4 className="text-orange-400 uppercase tracking-widest text-sm font-black mb-6 flex items-center gap-2">
                                    <span className="bg-orange-500 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">2</span>
                                    Active Recall Flashcards
                                </h4>

                                <div className="p-8 pb-12 bg-slate-800/30 rounded-2xl border border-orange-500/30">
                                    {loadingCards ? (
                                        <div className="flex flex-col justify-center items-center py-12 space-y-4">
                                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                            <p className="text-slate-400 font-bold">Crafting active recall flashcards...</p>
                                        </div>
                                    ) : remediationFlashcards && remediationFlashcards.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {remediationFlashcards.map((c, i) => <RemedialCard key={i} card={c} />)}
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-500 py-10">Failed to load flashcards. Try proceeding to retest.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={advanceRemediation}
                            disabled={(remediationStep === 0 && loadingNotes) || (remediationStep === 1 && loadingCards)}
                            className="w-full py-5 rounded-2xl font-black text-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xl shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {remediationStep === 0 ? 'I HAVE STUDIED THIS - PROCEED TO FLASHCARDS' : 'RETAKE ASSESSMENT'}
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (state === MASTERY_STATES.QUIZ && currentQuiz.length > 0) {
        const q = currentQuiz[currentQuestionIndex];
        const isAnswered = answers[currentQuestionIndex] !== undefined;
        const isLastQuestion = currentQuestionIndex === currentQuiz.length - 1;

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center bg-midnight-800/80 border border-white/[0.08] p-6 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] glass-3d">
                    <div>
                        <h3 className="text-xl font-black tracking-tight text-white mb-1">Concept Check</h3>
                        <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">{topic}</p>
                    </div>
                    <div className="text-sm font-black bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300 px-5 py-2.5 rounded-2xl border border-indigo-500/30 shadow-inner ring-1 ring-inset ring-white/10">
                        <span className="text-white">{currentQuestionIndex + 1}</span> / {currentQuiz.length}
                    </div>
                </div>

                <div className="bg-midnight-900/60 p-8 md:p-10 rounded-[32px] border border-white/[0.06] transition-all relative shadow-[0_20px_60px_rgba(0,0,0,0.3)] glass-3d overflow-hidden">
                    {/* Decorative Ambient Background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    {q.difficulty && (
                        <div className={"absolute top-8 right-8 text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg ring-1 ring-inset z-10 " + (q.difficulty.toLowerCase() === 'hard' ? 'bg-red-500/10 text-red-400 ring-red-500/30' : q.difficulty.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-400 ring-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30')}>
                            {q.difficulty}
                        </div>
                    )}

                    <h4 className="relative z-10 font-black text-xl md:text-[22px] mb-12 leading-[1.6] text-white pr-20 mt-4 tracking-tight drop-shadow-sm">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 mr-4 text-[26px] drop-shadow-sm">{currentQuestionIndex + 1}.</span>
                        {q.question}
                    </h4>

                    <div className="grid grid-cols-1 gap-5 relative z-10">
                        {q.type === 'subjective' ? (
                            <div className="space-y-4">
                                <textarea
                                    className={`w-full p-6 rounded-2xl border-2 bg-white/[0.02] text-white font-medium text-[15px] focus:outline-none focus:border-indigo-500 transition-all min-h-[200px] resize-none
                                        ${answers[currentQuestionIndex] ? 'border-indigo-500/50' : 'border-white/[0.05]'}
                                    `}
                                    placeholder="Type your detailed analytical response here..."
                                    value={answers[currentQuestionIndex] || ""}
                                    onChange={(e) => handleAnswer(currentQuestionIndex, e.target.value)}
                                />
                                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase truncate">
                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                    AI will evaluate depth, accuracy, and reasoning.
                                </div>
                            </div>
                        ) : (
                            q.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(currentQuestionIndex, opt)}
                                    className={`group p-6 rounded-[24px] text-left transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] transform-gpu border font-bold text-[15px] flex items-center justify-between overflow-hidden relative
                                        ${answers[currentQuestionIndex] === opt
                                            ? 'border-indigo-500/50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-600/20 to-violet-600/10 text-white shadow-[0_15px_40px_-10px_rgba(99,102,241,0.3)] -translate-y-1 ring-1 ring-inset ring-indigo-500/30'
                                            : 'border-white/[0.04] bg-white/[0.02] text-slate-300 hover:border-indigo-400/40 hover:bg-white/[0.04] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:text-white'}
                                    `}
                                >
                                    {/* Selected State Glow Background */}
                                    {answers[currentQuestionIndex] === opt && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none blur-sm"></div>
                                    )}

                                    <span className="leading-relaxed relative z-10 pr-6 drop-shadow-sm">{opt}</span>

                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu relative z-10
                                        ${answers[currentQuestionIndex] === opt
                                            ? 'border-indigo-400 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-110'
                                            : 'border-white/10 group-hover:border-indigo-400/30 group-hover:bg-white/[0.02]'}
                                    `}>
                                        {answers[currentQuestionIndex] === opt && <Check className="w-4 h-4 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] animate-in zoom-in duration-300" />}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-8 pb-12">
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-8 py-4 bg-slate-800 text-slate-300 font-black rounded-2xl hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        PREVIOUS
                    </button>
                    {!isLastQuestion ? (
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            disabled={!isAnswered}
                            className="px-10 py-4 bg-indigo-500 text-white font-black rounded-2xl hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-3 active:scale-95"
                        >
                            NEXT <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={submitQuiz}
                            disabled={Object.keys(answers).length < currentQuiz.length}
                            className="px-12 py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-emerald-500/30 flex items-center gap-3 active:scale-95"
                        >
                            SUBMIT <Check className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return <div className="py-20 text-center text-slate-500 animate-pulse">Initializing Mastery Loop...</div>;
};

export default MasteryLoop;
