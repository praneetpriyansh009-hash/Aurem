import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Check, Activity, Bot, GraduationCap, Eye, Mic, Video, ClipboardList, FileText, Trophy, Sparkles } from 'lucide-react'; // Fallback icons if not present in custom

const SmilingBot = ({ className = "" }) => (
    <svg
        viewBox="0 0 200 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-32 h-40 drop-shadow-2xl animate-bounce-slow ${className}`}
    >
        {/* Body styling with gradients */}
        <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
        </defs>

        {/* Antenna */}
        <path d="M100 20 L100 40" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />
        <circle cx="100" cy="15" r="8" fill="#f59e0b" className="animate-pulse" />

        {/* Head */}
        <rect x="50" y="40" width="100" height="80" rx="20" fill="url(#bodyGrad)" />

        {/* Screen */}
        <rect x="60" y="50" width="80" height="50" rx="10" fill="url(#screenGrad)" />

        {/* Happy Eyes */}
        <path d="M 75 70 Q 80 60 85 70" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M 115 70 Q 120 60 125 70" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Blushing Cheeks */}
        <circle cx="70" cy="85" r="5" fill="#ec4899" fillOpacity="0.6" />
        <circle cx="130" cy="85" r="5" fill="#ec4899" fillOpacity="0.6" />

        {/* Smiling Mouth */}
        <path d="M 90 85 Q 100 95 110 85" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Neck */}
        <rect x="85" y="120" width="30" height="15" fill="#4c1d95" />

        {/* Body */}
        <rect x="40" y="135" width="120" height="85" rx="25" fill="url(#bodyGrad)" />
        <circle cx="100" cy="175" r="25" fill="#312e81" />
        <path d="M90 175 L110 175 M100 165 L100 185" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />

        {/* Arms */}
        <path d="M 40 160 Q 10 170 20 200" stroke="url(#bodyGrad)" strokeWidth="15" strokeLinecap="round" fill="none" className="origin-top-right animate-wave" />
        <path d="M 160 160 Q 190 170 180 200" stroke="url(#bodyGrad)" strokeWidth="15" strokeLinecap="round" fill="none" />

        {/* Base/Wheels */}
        <rect x="65" y="220" width="20" height="15" rx="5" fill="#1e1b4b" />
        <rect x="115" y="220" width="20" height="15" rx="5" fill="#1e1b4b" />
    </svg>
);

const steps = [
    {
        title: "Welcome to Aurem!",
        content: "Hi there! I'm Aura, your personal AI learning assistant. Let me give you a quick tour of your new superpowered study studio.",
        icon: <Sparkles className="w-8 h-8 text-amber-400" />,
        color: "from-violet-500 to-indigo-600"
    },
    {
        title: "Doubt Solver",
        content: "Stuck on a problem? Just ask! I can analyze text, images, or even math equations to give you step-by-step explanations.",
        icon: <Bot className="w-8 h-8 text-violet-400" />,
        color: "from-indigo-500 to-blue-600"
    },
    {
        title: "Aurem Lens",
        content: "Upload your PDFs, documents, or syllabus. I'll read through them, summarize key points, and prepare study materials in seconds.",
        icon: <Eye className="w-8 h-8 text-cyan-400" />,
        color: "from-blue-500 to-cyan-600"
    },
    {
        title: "College Compass",
        content: "Planning for college? Explore university details, admission cutoffs, rankings, and get a personalized roadmap for your dream college.",
        icon: <GraduationCap className="w-8 h-8 text-emerald-400" />,
        color: "from-cyan-500 to-teal-600"
    },
    {
        title: "Podcast Studio",
        content: "Turn your notes into a realistic, human-like AI podcast. Listen to your study material on the go with conversational voices.",
        icon: <Mic className="w-8 h-8 text-rose-400" />,
        color: "from-rose-500 to-pink-600"
    },
    {
        title: "AI Video Studio",
        content: "Visual learner? We've got you covered. Convert text or topics into engaging educational videos with smooth transitions.",
        icon: <Video className="w-8 h-8 text-fuchsia-400" />,
        color: "from-fuchsia-500 to-purple-600"
    },
    {
        title: "Quiz & Assessment",
        content: "Test your knowledge! Take daily quizzes, track your performance, and adapt your learning loop based on what you need to improve.",
        icon: <ClipboardList className="w-8 h-8 text-orange-400" />,
        color: "from-orange-500 to-amber-600"
    },
    {
        title: "Smart Paper Generator",
        content: "Generate CBSE or competitive exam sample papers instantly. Customize difficulty, syllabus, and get detailed marking schemes.",
        icon: <FileText className="w-8 h-8 text-indigo-400" />,
        color: "from-blue-600 to-indigo-700"
    },
    {
        title: "Competitive Hub",
        content: "Preparing for JEE, NEET, or UPSC? Access specialized resources, track syllabi, and conquer your exams with absolute confidence.",
        icon: <Trophy className="w-8 h-8 text-yellow-400" />,
        color: "from-yellow-500 to-orange-600"
    },
    {
        title: "Learn Loop",
        content: "Your personalized study engine. It combines reading, practicing, and reviewing automatically to help you master any subject!",
        icon: <Activity className="w-8 h-8 text-emerald-400" />,
        color: "from-emerald-500 to-green-600"
    }
];

const OnboardingGuide = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Slight delay before appearance for smooth entrance
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(() => {
            onComplete();
        }, 300); // Wait for exit animation
    };

    const step = steps[currentStep];

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={handleComplete} />

            <div className="relative z-10 flex flex-col items-center pointer-events-auto">
                <div className="relative mb-4">
                    <SmilingBot className="animate-bounce-slow drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]" />

                    {/* Speech Bubble */}
                    <div className="absolute top-1/2 left-[120%] -translate-y-1/2 w-80 md:w-96 text-left origin-left animate-bubble-in">
                        <div className={`relative bg-gradient-to-br ${step.color} p-1 rounded-3xl shadow-2xl`}>
                            <div className="bg-midnight-900 rounded-[22px] p-6 h-full flex flex-col border border-white/10">
                                {/* Triangle arrow pointing to bot */}
                                <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-0 h-0 border-y-[12px] border-y-transparent border-r-[16px] border-r-indigo-500/50" />

                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`p-2 rounded-xl bg-gradient-to-br ${step.color} bg-opacity-20`}>
                                        {step.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">{step.title}</h3>
                                </div>

                                <p className="text-indigo-100 leading-relaxed mb-6 font-medium text-sm md:text-base">
                                    {step.content}
                                </p>

                                <div className="mt-auto flex items-center justify-between">
                                    {/* Dots */}
                                    <div className="flex gap-1.5">
                                        {steps.map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-white' : 'w-2 bg-white/20'
                                                    }`}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        {currentStep > 0 && (
                                            <button
                                                onClick={prevStep}
                                                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={nextStep}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all
                                                bg-white text-midnight-900 hover:scale-105 active:scale-95 shadow-lg
                                            `}
                                        >
                                            {currentStep === steps.length - 1 ? (
                                                <>Get Started <Check className="w-4 h-4" /></>
                                            ) : (
                                                <>Next <ChevronRight className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleComplete}
                    className="mt-12 md:mt-16 text-white/50 hover:text-white flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4" /> Skip Walkthrough
                </button>
            </div>

            <style jsx>{`
                @keyframes bubble-in {
                    0% { opacity: 0; transform: translateY(-50%) scale(0.9) translateX(-20px); }
                    100% { opacity: 1; transform: translateY(-50%) scale(1) translateX(0); }
                }
                .animate-bubble-in {
                    animation: bubble-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-20deg); }
                    75% { transform: rotate(10deg); }
                }
                .animate-wave {
                    animation: wave 2.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default OnboardingGuide;
