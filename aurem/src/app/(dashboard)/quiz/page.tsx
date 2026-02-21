"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeakness } from "@/lib/weakness-context";
import { useSubscription } from "@/lib/subscription-context";
import type { QuizQuestion, QuizResult, Board, DifficultyLevel, QuestionType } from "@/types";
import {
    Brain, Sparkles, Zap, Target, Trophy, ChevronRight, ChevronLeft,
    CheckCircle, XCircle, AlertTriangle, BarChart3, BookOpen, GraduationCap,
    Loader2, RotateCcw, TrendingUp, TrendingDown, Minus, Clock, Award, Flame,
    Settings2, ListChecks, Layers,
} from "lucide-react";

const BOARDS: { value: Board; label: string; color: string }[] = [
    { value: "CBSE", label: "CBSE", color: "from-blue-500 to-cyan-500" },
    { value: "ICSE", label: "ICSE", color: "from-purple-500 to-pink-500" },
    { value: "State", label: "State Board", color: "from-green-500 to-emerald-500" },
    { value: "IB", label: "IB", color: "from-amber-500 to-orange-500" },
    { value: "JEE", label: "JEE", color: "from-red-500 to-rose-500" },
    { value: "NEET", label: "NEET", color: "from-teal-500 to-cyan-500" },
    { value: "SAT", label: "SAT", color: "from-indigo-500 to-violet-500" },
];

const SUBJECTS: Record<string, string[]> = {
    Science: ["Physics", "Chemistry", "Biology", "Computer Science"],
    Mathematics: ["Algebra", "Geometry", "Calculus", "Statistics & Probability", "Trigonometry"],
    "Social Science": ["History", "Geography", "Political Science", "Economics"],
    English: ["Grammar", "Literature", "Writing", "Comprehension"],
};

const QUESTION_COUNTS = [5, 10, 15, 20, 35];
const DIFFICULTIES: { value: DifficultyLevel; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "easy", label: "Easy", icon: <BookOpen className="w-4 h-4" />, color: "text-green-400" },
    { value: "medium", label: "Medium", icon: <Zap className="w-4 h-4" />, color: "text-amber-400" },
    { value: "hard", label: "Hard", icon: <Flame className="w-4 h-4" />, color: "text-red-400" },
    { value: "adaptive", label: "Adaptive", icon: <Brain className="w-4 h-4" />, color: "text-purple-400" },
];
const TYPES: { value: QuestionType; label: string }[] = [
    { value: "mcq", label: "MCQ Only" },
    { value: "theory", label: "Theory Only" },
    { value: "true-false", label: "True/False" },
    { value: "mixed", label: "Mixed" },
];

type Phase = "config" | "quiz" | "results";

export default function QuizPage() {
    const { weakPoints, addQuizResults, getWeakTopicNames } = useWeakness();
    const { canUseFeature, incrementUsage, triggerUpgradeModal } = useSubscription();

    // Config state
    const [phase, setPhase] = useState<Phase>("config");
    const [board, setBoard] = useState<Board>("CBSE");
    const [classLevel, setClassLevel] = useState("11");
    const [selectedSubjectGroup, setSelectedSubjectGroup] = useState("Science");
    const [subject, setSubject] = useState("Physics");
    const [chapters, setChapters] = useState("");
    const [questionCount, setQuestionCount] = useState(10);
    const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
    const [questionType, setQuestionType] = useState<QuestionType>("mcq");
    const [useWeakTopics, setUseWeakTopics] = useState(true);

    // Quiz state
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showExplanation, setShowExplanation] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<QuizResult[]>([]);
    const [startTime, setStartTime] = useState<number>(0);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval>>();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Timer
    useEffect(() => {
        if (phase === "quiz" && !showExplanation) {
            timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000);
            return () => clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [phase, startTime, showExplanation]);

    const weakTopicNames = getWeakTopicNames();

    const handleGenerate = async () => {
        if (!canUseFeature("quizzes")) {
            triggerUpgradeModal("quizzes");
            return;
        }

        setIsGenerating(true);
        try {
            const chaptersArray = chapters.split(",").map(c => c.trim()).filter(Boolean);
            const res = await fetch("/api/quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    board,
                    classLevel,
                    subject,
                    chapters: chaptersArray.length > 0 ? chaptersArray : undefined,
                    questionCount,
                    difficulty,
                    questionType,
                    weakTopics: useWeakTopics ? weakTopicNames : undefined,
                }),
            });
            const data = await res.json();
            if (data.questions?.length > 0) {
                setQuestions(data.questions);
                setCurrentQ(0);
                setAnswers({});
                setShowExplanation(false);
                setResults([]);
                setPhase("quiz");
                setStartTime(Date.now());
                setElapsed(0);
                incrementUsage("quizzes");
            } else {
                alert("Failed to generate questions. Try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Error generating quiz.");
        } finally {
            setIsGenerating(false);
        }
    };

    const selectAnswer = (answer: string) => {
        if (showExplanation) return;
        setAnswers(prev => ({ ...prev, [questions[currentQ].id]: answer }));
        setShowExplanation(true);
    };

    const nextQuestion = () => {
        setShowExplanation(false);
        if (currentQ < questions.length - 1) {
            setCurrentQ(prev => prev + 1);
            scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        clearInterval(timerRef.current);
        const newResults: QuizResult[] = questions.map(q => {
            const userAns = answers[q.id] || "";
            const isCorrect = userAns.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                || (q.options && q.options.findIndex(o => o === userAns) === q.options.findIndex(o => o === q.correctAnswer));
            return {
                questionId: q.id,
                userAnswer: userAns,
                isCorrect,
                marksObtained: isCorrect ? (q.marks || 1) : 0,
                maxMarks: q.marks || 1,
                topic: q.topic || "General",
                difficulty: q.difficulty,
            };
        });
        setResults(newResults);

        // Feed results into weakness tracking
        addQuizResults(
            newResults.map(r => ({
                topic: r.topic,
                subject,
                chapter: questions.find(q => q.id === r.questionId)?.chapter,
                isCorrect: r.isCorrect,
            }))
        );

        setPhase("results");
    };

    const score = results.reduce((a, r) => a + r.marksObtained, 0);
    const totalMarks = results.reduce((a, r) => a + r.maxMarks, 0);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const formatTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
    };

    // =========== CONFIG PHASE ===========
    if (phase === "config") {
        return (
            <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                                <Brain className="w-8 h-8 text-purple-400" />
                            </div>
                            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
                                Adaptive Quiz Engine
                            </h1>
                        </div>
                        <p className="text-gray-500 text-sm">AI-powered assessments that learn your weaknesses & adapt</p>
                        {weakTopicNames.length > 0 && (
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {weakTopicNames.length} weak topic{weakTopicNames.length > 1 ? "s" : ""} detected — quiz will adapt
                            </motion.div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Board + Class + Subject */}
                        <div className="space-y-6">
                            {/* Board Selection */}
                            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-purple-400" /> Board / Exam
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {BOARDS.map(b => (
                                        <button
                                            key={b.value}
                                            onClick={() => setBoard(b.value)}
                                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all duration-300 ${board === b.value
                                                ? `bg-gradient-to-r ${b.color} text-white shadow-lg scale-[1.05]`
                                                : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"}`}
                                        >
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Class Level */}
                            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-cyan-400" /> Class
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {["9", "10", "11", "12"].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setClassLevel(c)}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all ${classLevel === c
                                                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                                                : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"}`}
                                        >
                                            Class {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-emerald-400" /> Subject
                                </h3>
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                    {Object.keys(SUBJECTS).map(group => (
                                        <button
                                            key={group}
                                            onClick={() => { setSelectedSubjectGroup(group); setSubject(SUBJECTS[group][0]); }}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedSubjectGroup === group
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                                : "text-gray-500 hover:text-gray-300"}`}
                                        >
                                            {group}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {SUBJECTS[selectedSubjectGroup]?.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSubject(s)}
                                            className={`py-3 px-3 rounded-xl text-xs font-bold text-left transition-all ${subject === s
                                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                                : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chapter Input */}
                            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <ListChecks className="w-4 h-4 text-orange-400" /> Chapters (optional)
                                </h3>
                                <input
                                    value={chapters}
                                    onChange={e => setChapters(e.target.value)}
                                    placeholder="e.g., Kinematics, Laws of Motion, Work & Energy..."
                                    className="w-full p-4 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Right: Count + Difficulty + Type + Generate */}
                        <div className="space-y-6">
                            {/* Question Count */}
                            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-pink-400" /> Number of Questions
                                </h3>
                                <div className="flex gap-2">
                                    {QUESTION_COUNTS.map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setQuestionCount(n)}
                                            className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all ${questionCount === n
                                                ? "bg-gradient-to-b from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30"
                                                : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"}`}
                                        >
                                            {n}
                                            {n === 35 && <span className="block text-[10px] mt-1 opacity-70">Full Exam</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-amber-400" /> Difficulty
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {DIFFICULTIES.map(d => (
                                        <button
                                            key={d.value}
                                            onClick={() => setDifficulty(d.value)}
                                            className={`flex items-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${difficulty === d.value
                                                ? "bg-gray-700/80 ring-2 ring-amber-500/50 text-white"
                                                : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"}`}
                                        >
                                            <span className={d.color}>{d.icon}</span> {d.label}
                                            {d.value === "adaptive" && <Sparkles className="w-3 h-3 text-purple-400 ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Question Type */}
                            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-violet-400" /> Question Type
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => setQuestionType(t.value)}
                                            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all ${questionType === t.value
                                                ? "bg-violet-500/20 text-violet-300 ring-2 ring-violet-500/50"
                                                : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Weak Topic Toggle */}
                            {weakTopicNames.length > 0 && (
                                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <p className="text-sm font-bold text-amber-400">Target Weak Topics</p>
                                            <p className="text-xs text-gray-500 mt-1">40% of questions will focus on: {weakTopicNames.slice(0, 3).join(", ")}{weakTopicNames.length > 3 ? "..." : ""}</p>
                                        </div>
                                        <div
                                            onClick={() => setUseWeakTopics(!useWeakTopics)}
                                            className={`w-12 h-6 rounded-full transition-all relative ${useWeakTopics ? "bg-amber-500" : "bg-gray-700"}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${useWeakTopics ? "left-6" : "left-0.5"}`} />
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 group
                                    ${isGenerating
                                        ? "bg-gray-800 text-gray-600 cursor-wait"
                                        : "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-2xl shadow-purple-500/20 hover:scale-[1.02] hover:shadow-purple-500/40 active:scale-[0.98]"}`}
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Generating {questionCount} Questions...</>
                                ) : (
                                    <><Brain className="w-5 h-5 group-hover:animate-pulse" /> Generate Quiz</>
                                )}
                            </button>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                                    <p className="text-2xl font-black text-white">{weakPoints.length}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Topics Tracked</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                                    <p className="text-2xl font-black text-amber-400">{weakTopicNames.length}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Weak Areas</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 text-center">
                                    <p className="text-2xl font-black text-emerald-400">
                                        {weakPoints.length > 0 ? Math.round(weakPoints.reduce((a, w) => a + w.score, 0) / weakPoints.length) : 0}%
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Avg Mastery</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // =========== QUIZ PHASE ===========
    if (phase === "quiz") {
        const q = questions[currentQ];
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
            || (q.options && q.options.findIndex(o => o === userAnswer) === q.options.findIndex(o => o === q.correctAnswer));

        return (
            <div ref={scrollRef} className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-500">
                                Question {currentQ + 1} of {questions.length}
                            </span>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                    <Clock className="w-3.5 h-3.5" /> {formatTime(elapsed)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase
                                    ${q.difficulty === "easy" ? "bg-green-500/20 text-green-400" :
                                        q.difficulty === "medium" ? "bg-amber-500/20 text-amber-400" :
                                            "bg-red-500/20 text-red-400"}`}>
                                    {q.difficulty}
                                </span>
                            </div>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentQ + (showExplanation ? 1 : 0)) / questions.length) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        {/* Dot progress */}
                        <div className="flex gap-1 mt-3 justify-center flex-wrap">
                            {questions.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-all ${i === currentQ ? "bg-purple-500 scale-150" :
                                        i < currentQ ? (answers[questions[i].id] ? "bg-emerald-500" : "bg-red-500") :
                                            "bg-gray-700"}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Question Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQ}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className="p-8 rounded-3xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm mb-6"
                        >
                            {q.topic && (
                                <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-4">
                                    {q.topic}
                                </span>
                            )}
                            <h2 className="text-lg font-bold leading-relaxed mb-6">{q.question}</h2>

                            {/* Options */}
                            {q.type === "mcq" || q.type === "true-false" ? (
                                <div className="space-y-3">
                                    {(q.options || ["True", "False"]).map((option, idx) => {
                                        const isSelected = userAnswer === option;
                                        const isCorrectOption = showExplanation && option.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
                                        const isWrongSelected = showExplanation && isSelected && !isCorrectOption;

                                        return (
                                            <motion.button
                                                key={idx}
                                                whileHover={!showExplanation ? { scale: 1.01 } : {}}
                                                whileTap={!showExplanation ? { scale: 0.99 } : {}}
                                                onClick={() => selectAnswer(option)}
                                                disabled={showExplanation}
                                                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${isCorrectOption
                                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                                                    : isWrongSelected
                                                        ? "bg-red-500/10 border-red-500/40 text-red-300"
                                                        : isSelected
                                                            ? "bg-purple-500/10 border-purple-500/40 text-white"
                                                            : "bg-gray-800/40 border-gray-800 text-gray-300 hover:bg-gray-700/40 hover:border-gray-700"}`}
                                            >
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isCorrectOption ? "bg-emerald-500 text-white" :
                                                    isWrongSelected ? "bg-red-500 text-white" :
                                                        isSelected ? "bg-purple-500 text-white" :
                                                            "bg-gray-700 text-gray-400"}`}>
                                                    {isCorrectOption ? <CheckCircle className="w-4 h-4" /> :
                                                        isWrongSelected ? <XCircle className="w-4 h-4" /> :
                                                            String.fromCharCode(65 + idx)}
                                                </span>
                                                <span className="text-sm">{option}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Theory question */
                                <div>
                                    <textarea
                                        placeholder="Type your answer..."
                                        value={userAnswer || ""}
                                        onChange={e => !showExplanation && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        className="w-full h-32 p-4 rounded-xl bg-black/40 text-sm text-white placeholder-gray-600 border border-gray-800 focus:border-purple-500/50 outline-none resize-none"
                                    />
                                    {!showExplanation && (
                                        <button
                                            onClick={() => setShowExplanation(true)}
                                            disabled={!userAnswer}
                                            className="mt-3 px-6 py-3 rounded-xl bg-purple-600 text-white text-sm font-bold disabled:opacity-40"
                                        >
                                            Submit Answer
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Explanation */}
                    <AnimatePresence>
                        {showExplanation && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: 20 }}
                                className="mb-6"
                            >
                                <div className={`p-6 rounded-3xl border ${isCorrect
                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                    : "bg-red-500/5 border-red-500/30"}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        {isCorrect ? (
                                            <><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">Correct!</span></>
                                        ) : (
                                            <><XCircle className="w-5 h-5 text-red-400" /><span className="text-sm font-bold text-red-400">Incorrect</span></>
                                        )}
                                    </div>
                                    {!isCorrect && (
                                        <p className="text-xs text-gray-400 mb-2">
                                            Correct answer: <span className="text-white font-bold">{q.correctAnswer}</span>
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-300 leading-relaxed">{q.explanation}</p>
                                </div>
                                <button
                                    onClick={nextQuestion}
                                    className="mt-4 w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
                                >
                                    {currentQ < questions.length - 1 ? (
                                        <><span>Next Question</span><ChevronRight className="w-4 h-4" /></>
                                    ) : (
                                        <><Trophy className="w-4 h-4" /><span>See Results</span></>
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // =========== RESULTS PHASE ===========
    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
                {/* Score Hero */}
                <div className="text-center mb-10 p-10 rounded-[2rem] bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5" />
                    <div className="relative z-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 ${percentage >= 80 ? "bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/40" :
                                percentage >= 50 ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-amber-500/40" :
                                    "bg-gradient-to-br from-red-500/20 to-rose-500/20 border-2 border-red-500/40"}`}
                        >
                            <span className="text-4xl font-black">{percentage}%</span>
                        </motion.div>
                        <h2 className="text-2xl font-black mb-2">
                            {percentage >= 80 ? "Outstanding! 🏆" : percentage >= 50 ? "Good Effort! 💪" : "Keep Practicing! 📚"}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {score}/{totalMarks} marks · {results.filter(r => r.isCorrect).length}/{results.length} correct · {formatTime(elapsed)}
                        </p>
                    </div>
                </div>

                {/* Weakness Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Topic Performance */}
                    <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-purple-400" /> Topic Performance
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(
                                results.reduce((acc, r) => {
                                    if (!acc[r.topic]) acc[r.topic] = { correct: 0, total: 0 };
                                    acc[r.topic].total++;
                                    if (r.isCorrect) acc[r.topic].correct++;
                                    return acc;
                                }, {} as Record<string, { correct: number; total: number }>)
                            ).map(([topic, data]) => {
                                const pct = Math.round((data.correct / data.total) * 100);
                                return (
                                    <div key={topic}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-bold text-gray-300">{topic}</span>
                                            <span className={`font-bold ${pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400"}`}>
                                                {data.correct}/{data.total} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 }}
                                                className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Weak Areas Identified */}
                    <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400" /> Weak Areas Updated
                        </h3>
                        <div className="space-y-3">
                            {weakPoints.filter(w => w.score < 70).slice(0, 6).map(wp => (
                                <div key={wp.topic} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
                                    <div>
                                        <p className="text-sm font-bold text-gray-200">{wp.topic}</p>
                                        <p className="text-[10px] text-gray-500">{wp.subject} · {wp.totalAttempts} attempts</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-black ${wp.score < 40 ? "text-red-400" : "text-amber-400"}`}>{wp.score}%</span>
                                        {wp.recentTrend === "improving" ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                                            wp.recentTrend === "declining" ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                                                <Minus className="w-4 h-4 text-gray-500" />}
                                    </div>
                                </div>
                            ))}
                            {weakPoints.filter(w => w.score < 70).length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">No weak areas — excellent performance! 🎉</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Question Review */}
                <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 mb-8">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Question Review</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {questions.map((q, i) => {
                            const r = results[i];
                            return (
                                <div key={q.id} className={`p-4 rounded-xl border ${r?.isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${r?.isCorrect ? "bg-emerald-500" : "bg-red-500"}`}>
                                            {r?.isCorrect ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <XCircle className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-200 mb-1">{q.question}</p>
                                            {!r?.isCorrect && (
                                                <p className="text-xs text-gray-400">
                                                    Your answer: <span className="text-red-400">{r?.userAnswer || "Skipped"}</span> ·
                                                    Correct: <span className="text-emerald-400">{q.correctAnswer}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => { setPhase("config"); setQuestions([]); setResults([]); }}
                        className="py-5 rounded-3xl bg-gray-800 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 transition-all"
                    >
                        <RotateCcw className="w-4 h-4" /> New Quiz
                    </button>
                    <button
                        onClick={() => { setCurrentQ(0); setAnswers({}); setShowExplanation(false); setResults([]); setPhase("quiz"); setStartTime(Date.now()); setElapsed(0); }}
                        className="py-5 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
                    >
                        <Award className="w-4 h-4" /> Retry Same Quiz
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
