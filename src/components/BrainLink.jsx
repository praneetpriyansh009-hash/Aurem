import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Zap, Target, Shield, Clock, User, Cpu, ChevronRight, Check, X, Star, Gauge, Swords, BrainCircuit } from './Icons';

const BrainLink = ({ quizData, topic, difficulty, onExit, isDark }) => {
    const [gameState, setGameState] = useState('playing'); // playing | results
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userScore, setUserScore] = useState(0);
    const [spectreScore, setSpectreScore] = useState(0);
    const [userAnswerStatus, setUserAnswerStatus] = useState(null); // 'correct' | 'wrong' | null
    const [spectreAnswerStatus, setSpectreAnswerStatus] = useState(null);
    const [combo, setCombo] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [combatLog, setCombatLog] = useState(["Protocol Linked. Waiting for signal..."]);

    const logEndRef = useRef(null);
    const maxScore = quizData.length * 150;

    const timerRef = useRef(null);
    const spectreThoughtRef = useRef(null);

    // Auto-scroll combat log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [combatLog]);

    const addToLog = (msg) => {
        setCombatLog(prev => [...prev.slice(-4), msg]);
    };

    // --- Game Logic ---
    useEffect(() => {
        if (gameState === 'playing') {
            startTimer();
            simulateSpectre();
        }
        return () => {
            clearInterval(timerRef.current);
            clearTimeout(spectreThoughtRef.current);
        };
    }, [gameState, currentQuestionIndex]);

    const startTimer = () => {
        setTimeLeft(15);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleAnswer(null); // Time out
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const simulateSpectre = () => {
        const spectreConfig = {
            'Normal': { chance: 0.7, delay: 5000 },
            'Heroic': { chance: 0.85, delay: 3500 },
            'Godly': { chance: 0.98, delay: 1500 }
        };
        const config = spectreConfig[difficulty];

        const randomDelay = config.delay + (Math.random() * 2000);

        clearTimeout(spectreThoughtRef.current);
        spectreThoughtRef.current = setTimeout(() => {
            const isCorrect = Math.random() < config.chance;
            setSpectreAnswerStatus(isCorrect ? 'correct' : 'wrong');
            if (isCorrect) {
                setSpectreScore(prev => prev + 100);
                addToLog("Spectre-7 processed query correctly. Threat level rising.");
            } else {
                addToLog("Spectre-7 encountered a logic fault!");
            }
        }, randomDelay);
    };

    const handleAnswer = (option) => {
        if (userAnswerStatus || gameState !== 'playing') return;

        clearInterval(timerRef.current);
        const q = quizData[currentQuestionIndex];
        const isCorrect = (option === q.answer || option === q.correct_option);

        setUserAnswerStatus(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            const timeBonus = timeLeft * 10;
            const comboBonus = combo * 20;
            const points = 100 + timeBonus + comboBonus;
            setUserScore(prev => prev + points);
            setCombo(prev => prev + 1);
            addToLog(`Direct Hit! Scored ${points} units.`);
            if (combo + 1 > 3) addToLog(`COMBO x${combo + 1} ACTIVE!`);
        } else {
            setCombo(0);
            addToLog("Neural desync detected. Sequence broken.");
        }

        // Wait then move to next or results
        setTimeout(() => {
            if (currentQuestionIndex < quizData.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setUserAnswerStatus(null);
                setSpectreAnswerStatus(null);
            } else {
                setGameState('results');
            }
        }, 1500);
    };

    // Callback on battle end
    useEffect(() => {
        if (gameState === 'results' && onComplete) {
            onComplete({
                score: userScore,
                spectreScore: spectreScore,
                isWinner: userScore > spectreScore
            });
        }
    }, [gameState]);

    if (gameState === 'playing') {
        const q = quizData[currentQuestionIndex];
        const userHPPercent = Math.min((userScore / maxScore) * 100, 100);
        const spectreHPPercent = Math.min((spectreScore / maxScore) * 100, 100);

        return (
            <div className={`h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto w-full ${userAnswerStatus === 'wrong' ? 'animate-shake' : ''}`}>

                {/* HUD: Fighting Game Style Top Bar */}
                <div className={`flex items-center justify-between gap-4 w-full p-4 md:p-5 rounded-2xl border glass-3d relative transition-all duration-500 shrink-0 will-change-transform bg-theme-surface border-theme-border
                `}>
                    {/* User Health Bar */}
                    <div className="flex-1 space-y-2 relative">
                        <div className="flex justify-between items-center text-[9px] md:text-xs font-black uppercase tracking-widest text-theme-primary">
                            <span className="flex items-center gap-1.5"><BrainCircuit className="w-4 h-4" /> Challenger</span>
                            <span>{userScore}</span>
                        </div>
                        <div className={`h-3 md:h-4 w-full rounded-full overflow-hidden border relative bg-theme-bg border-theme-border`}>
                            <div
                                className="h-full bg-gradient-to-r from-theme-primary to-theme-secondary transition-all duration-700 shadow-[0_0_10px_var(--theme-primary)] opacity-80"
                                style={{ width: `${userHPPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* VS / Timer */}
                    <div className="flex flex-col items-center justify-center shrink-0 px-2 md:px-4 z-10">
                        <div className={`text-2xl md:text-3xl font-black tabular-nums transition-colors duration-300 drop-shadow-md leading-none
                            ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-theme-text'}
                        `}>
                            {timeLeft}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-theme-muted mt-0.5">TIME</span>
                    </div>

                    {/* Spectre Health Bar */}
                    <div className="flex-1 space-y-2 relative text-right">
                        <div className="flex justify-between items-center text-[9px] md:text-xs font-black uppercase tracking-widest text-rose-500">
                            <span>{spectreScore}</span>
                            <span className="flex items-center gap-1.5">Spectre-7 <Cpu className="w-4 h-4" /></span>
                        </div>
                        <div className={`h-3 md:h-4 w-full rounded-full overflow-hidden border relative rotate-180 bg-theme-bg border-theme-border`}>
                            <div
                                className="h-full bg-gradient-to-l from-rose-600 to-rose-400 transition-all duration-700 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                                style={{ width: `${spectreHPPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Main Battle Core: The Interactive Query Engine */}
                <div className={`flex-1 rounded-[24px] border glass-3d relative group/core overflow-hidden flex flex-col p-4 md:p-6 min-h-0 will-change-transform bg-theme-surface border-theme-border
                `}>
                    {/* Combat Log Overlay (Absolute top left) */}
                    <div className="absolute top-4 left-6 z-20 w-48 md:w-64 max-h-24 overflow-hidden pointer-events-none opacity-60">
                        <div className="flex flex-col gap-1">
                            {combatLog.map((log, i) => (
                                <div key={i} className="text-[9px] font-bold text-theme-primary uppercase tracking-tight bg-theme-bg opacity-90 px-2 py-0.5 rounded backdrop-blur-sm border-l-2 border-theme-primary animate-in fade-in slide-in-from-left-2">
                                    {log}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </div>

                    {/* Progress Bar Top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-theme-border">
                        <div
                            className="h-full transition-all duration-700 ease-out bg-theme-primary"
                            style={{ width: `${((currentQuestionIndex + 1) / quizData.length) * 100}%` }}
                        ></div>
                    </div>

                    {/* Question Section */}
                    <div className="text-center space-y-2 max-w-2xl mx-auto relative z-10 w-full mb-4 mt-6 md:mt-10">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-theme-muted">
                            NEURAL QUERY {currentQuestionIndex + 1} / {quizData.length}
                        </span>
                        <div className="relative group/q py-1">
                            <h2 className={`text-base md:text-lg font-extrabold leading-snug tracking-tight min-h-[2.5em] flex items-center justify-center relative z-10 text-theme-text`}>
                                {q.question}
                            </h2>
                        </div>
                    </div>

                    {/* Response Matrix: Options UI */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl mx-auto relative z-10 flex-1 content-center">
                        {q.options?.map((opt, i) => {
                            const isCorrectVal = opt === q.answer || opt === q.correct_option;
                            let btnStyle = "border-theme-border bg-theme-surface hover:border-theme-primary hover:bg-theme-primary hover:text-theme-bg shadow-[0_2px_10px_rgba(0,0,0,0.2)] text-theme-text";

                            if (userAnswerStatus) {
                                if (isCorrectVal) {
                                    btnStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                                } else if (userAnswerStatus === 'wrong' && opt === q.answer) {
                                    btnStyle = "border-emerald-500/30 bg-emerald-500/10 text-emerald-500/80";
                                } else if (userAnswerStatus === 'wrong') {
                                    btnStyle = "border-red-500/40 bg-red-500/10 text-red-500/80 opacity-50 grayscale-[0.3]";
                                } else {
                                    btnStyle = "opacity-30 grayscale";
                                }
                            }

                            return (
                                <button
                                    key={i}
                                    disabled={!!userAnswerStatus}
                                    onClick={() => handleAnswer(opt)}
                                    className={`group/opt p-4 md:p-5 rounded-xl border-2 text-left font-bold transition-all duration-300 flex items-center justify-between
                                        ${btnStyle}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors duration-300
                                            ${userAnswerStatus ? 'bg-black/10 text-theme-text' : 'bg-theme-bg border border-theme-border text-theme-primary group-hover/opt:bg-theme-bg group-hover/opt:text-theme-primary group-hover/opt:border-theme-bg'}
                                        `}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className={`text-xs md:text-sm leading-tight tracking-tight ${!userAnswerStatus ? 'text-theme-text group-hover/opt:text-theme-bg' : 'text-theme-text font-normal'}`}>{opt}</span>
                                    </div>
                                    {userAnswerStatus && isCorrectVal && (
                                        <Check className="w-5 h-5 text-emerald-500 animate-in zoom-in duration-300 shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'results') {
        const isWinner = userScore > spectreScore;
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-500">
                <div className={`p-16 rounded-[48px] border glass-3d text-center space-y-8 w-full relative overflow-hidden bg-theme-surface border-theme-border shadow-[0_0_40px_var(--theme-border)]
                `}>
                    <div className="relative z-10">
                        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl
                            ${isWinner ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}
                        `}>
                            {isWinner ? <Trophy className="w-12 h-12" /> : <Shield className="w-12 h-12" />}
                        </div>
                        <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-theme-text">
                            {isWinner ? 'Victory Unlocked' : 'Circuit Breach'}
                        </h2>
                        <p className="text-theme-muted font-bold text-lg mt-2">Simulation Synchronized</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-2xl mx-auto relative z-10">
                        <div className="bg-theme-bg p-6 rounded-3xl border border-theme-border">
                            <span className="text-[10px] font-black uppercase text-theme-primary block mb-2">Battle Rating</span>
                            <span className="text-3xl font-black text-theme-text">{userScore.toLocaleString()}</span>
                        </div>
                        <div className="bg-theme-bg p-6 rounded-3xl border border-theme-border">
                            <span className="text-[10px] font-black uppercase text-theme-secondary block mb-2">XP Gain</span>
                            <span className="text-3xl font-black text-theme-text">+{Math.round(userScore * 0.1 * ({ 'Normal': 1, 'Heroic': 1.5, 'Godly': 2.5 }[difficulty]))}</span>
                        </div>
                        <div className="bg-theme-bg p-6 rounded-3xl border border-theme-border opacity-60 hidden lg:block">
                            <span className="text-[10px] font-black uppercase text-rose-500 block mb-2">Opponent</span>
                            <span className="text-3xl font-black text-theme-text">{spectreScore.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4 pt-4">
                        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-theme-bg border border-theme-primary text-theme-primary font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_var(--theme-primary)] opacity-80">
                            {isWinner ? 'Dominance Protocol Executed' : 'Strategic Assessment Required'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <button
                        onClick={() => setGameState('lobby')}
                        className="py-4 rounded-2xl border border-theme-border bg-theme-surface font-bold hover:bg-theme-bg hover:border-theme-primary transition-all text-theme-text"
                    >
                        New Battle
                    </button>
                    <button
                        onClick={onExit}
                        className="py-4 rounded-2xl bg-theme-primary font-bold text-theme-bg shadow-xl shadow-theme-border/20 hover:scale-105 hover:bg-theme-secondary transition-all"
                    >
                        Exit Hub
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default BrainLink;
