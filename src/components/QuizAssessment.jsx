import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, BookOpen, ChevronRight, Brain, Trophy, AlertCircle, RefreshCw, Sparkles, Youtube, Crown, Upload } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { GROQ_API_URL, formatGroqPayload } from '../utils/api';
import CloudService from '../utils/cloudService';
import RagService from '../utils/ragService';
import { MOCK_SYLLABUS } from '../data/mockData';
import SamplePaperGenerator from './SamplePaperGenerator';



const QuizAssessment = ({ retryableFetch, onNavigate }) => {
    const { isDark } = useTheme();
    const { canUseFeature, incrementUsage, triggerUpgradeModal, isPro, getRemainingUses } = useSubscription();
    const [viewMode, setViewMode] = useState('quiz'); // 'quiz' or 'paper-gen'
    const [step, setStep] = useState('setup'); // setup, taking, grading, result
    const [config, setConfig] = useState({
        curriculum: 'CBSE', // CBSE or ICSE
        classGrade: '10', // 9, 10, 11, 12
        subject: '',
        topic: '',
        difficulty: 'Medium',
        count: 5,
        type: 'Both',
        docId: 'internal'
    });
    const [documents, setDocuments] = useState([]);
    const [quizData, setQuizData] = useState(null);
    const [answers, setAnswers] = useState({});
    const [gradingResult, setGradingResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [assessmentStats, setAssessmentStats] = useState(null);

    useEffect(() => {
        const loadDocs = async () => {
            try {
                const docs = await CloudService.listDocuments();
                setDocuments(docs);
            } catch (e) {
                console.error("Failed to load documents", e);
            }
        };
        loadDocs();
    }, []);

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        let newConfig = { ...config, [name]: value };

        // Auto-switch to Mixed for Full Length Test
        if (name === 'count' && parseInt(value) === 35) {
            newConfig.type = 'Mixed';
        }

        setConfig(newConfig);
    };

    const generateQuiz = async (e) => {
        e.preventDefault();

        if (!canUseFeature('quiz')) {
            triggerUpgradeModal('quiz');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Intelligent Logic Construction
            let structuralInstructions = "";
            let qualityInstructions = "Ensure questions are non-repetitive, conceptually deep, and free of ambiguity.";
            let isFullLength = parseInt(config.count) === 35;
            let isSenior = ['11', '12'].includes(config.classGrade);
            let isScienceMath = /physics|math|chem/i.test(config.subject);

            let mimicContext = "";
            if (config.docId !== 'internal') {
                const doc = await CloudService.getDocument(config.docId);
                if (doc) {
                    mimicContext = `
                     STYLE REFERENCE (SAMPLE PAPER):
                     ${doc.content.substring(0, 15000)}
                     
                     INSTRUCTION: Analyze the above Sample Paper. Create a NEW assessment that mimics its exact Difficulty, Question Types, and Phrasing Style. 
                     Do NOT copy questions. Create ORIGINAL questions for the Topic: "${config.topic}" that feel like they belong in this sample paper.
                     `;
                }
            }

            // 1. Define Difficulty & Style Profile based on User Request
            if (!mimicContext) {
                // JEE is ONLY for Physics, Chemistry, Maths in Class 11-12
                const isJEEEligible = isSenior && isScienceMath;

                // Difficulty Logic
                if (config.difficulty === 'Easy') {
                    qualityInstructions = "LEVEL: EASY (BOARD/SCHOOL EXAM). Focus on Theory, Definitions, and Direct Concepts. 90% Theory / 10% Very Basic Numericals. Avoid complex calculations.";
                } else if (config.difficulty === 'Medium') {
                    qualityInstructions = "LEVEL: MEDIUM (STANDARD BOARD). EXACTLY 50% Theory (Conceptual) and 50% Numericals. Numericals should increase in difficulty from basic to moderate application.";
                } else if (config.difficulty === 'Hard') {
                    if (isJEEEligible) {
                        // JEE Advanced Level for Physics/Chemistry/Maths Class 11-12
                        qualityInstructions = `
                        🔥 LEVEL: HARD (JEE ADVANCED / OLYMPIAD LEVEL) 🔥
                        
                        MANDATORY REQUIREMENTS:
                        - 100% NUMERICAL PROBLEMS - NO direct theory questions
                        - Every question must combine 2-3 concepts from the chapter
                        - Questions should require 3-5 steps minimum to solve
                        - Include problems that require deriving formulas, not just applying them
                        - Add tricky conditions (friction, resistance, real-world constraints)
                        
                        QUESTION DIFFICULTY EXAMPLES:
                        - Physics: Projectile on inclined plane with air resistance, Combination of SHM, Rotational + Translational motion combined
                        - Chemistry: Equilibrium with Le Chatelier shifts, Multi-step organic synthesis, Buffer calculations with back-titration
                        - Maths: Integration requiring substitution + partial fractions, Complex number geometry, Probability with permutations
                        
                        DO NOT CREATE:
                        ❌ Direct formula substitution (like "Find velocity if s=10, t=2")
                        ❌ Single-concept problems
                        ❌ NCERT textbook example-level questions
                        ❌ Questions solvable in 1-2 steps
                        
                        EACH QUESTION SHOULD MAKE A JEE ASPIRANT THINK FOR 3-5 MINUTES.
                        `;
                    } else {
                        // Tough CBSE/ICSE Board Level for ALL other subjects/classes
                        qualityInstructions = `
                        LEVEL: HARD (CHALLENGING ${config.curriculum} BOARD)
                        - Focus on HOTS (Higher Order Thinking Skills)
                        - Application-based problems requiring analysis
                        - Case-study type questions
                        - Questions that test deep understanding, not rote learning
                        - 70% Application/Analysis / 30% Conceptual
                        `;
                    }
                }

                // Structure Logic
                if (isFullLength) {
                    structuralInstructions = `
                    STRICT MANDATE: GENERATE EXACTLY 35 QUESTIONS.
                    Structure:
                    - Section A: 15 MCQs (1-mark). 
                    - Section B: 8 Very Short (2-marks).
                    - Section C: 6 Short (3-marks).
                    - Section D: 4 Long (5-marks).
                    - Section E: 2 Case-Based (4-marks).
                    `;
                } else {
                    if (config.type === 'Objective') {
                        structuralInstructions = `Generate EXACTLY ${config.count} Questions. ALL MUST BE Multiple Choice Questions (MCQs) with 4 options. 1 Mark each. NO Subjective questions.`;
                    } else if (config.type === 'Subjective') {
                        structuralInstructions = `Generate EXACTLY ${config.count} Questions. ALL MUST BE Subjective (Short/Long Answer). NO MCQs. Mix of 3-mark and 5-mark questions.`;
                    } else { // Mixed
                        structuralInstructions = `Generate EXACTLY ${config.count} Questions. Divide into sections: Section A (MCQs) and Section B (Subjective).`;
                    }
                }

                // Image/Visual Constraint
                if (config.difficulty === 'Hard' || config.difficulty === 'Medium') {
                    qualityInstructions += " Include Visual/Diagram-based questions where relevant (describe the image in 'image_description').";
                }
            }
            // Build subject-specific instructions
            let subjectPatterns = '';
            const subjectLower = config.subject.toLowerCase();

            if (subjectLower.includes('english')) {
                subjectPatterns = `
                ENGLISH PAPER PATTERN (${config.curriculum} CLASS ${config.classGrade}):
                - MUST include 1-2 Unseen Passage/Comprehension questions (read passage + answer questions)
                - Include Grammar-based MCQs (tenses, voice, articles, prepositions, etc.)
                - Include Literature-based questions from Class ${config.classGrade} ${config.curriculum} syllabus ONLY
                - Include Writing Skills questions (letter, essay, notice, etc.) for subjective
                - DO NOT use poems/chapters from other classes
                `;
            } else if (subjectLower.includes('physics') || subjectLower.includes('chemistry') || subjectLower.includes('math')) {
                subjectPatterns = `
                SCIENCE/MATH PATTERN (${config.curriculum} CLASS ${config.classGrade}):
                - Questions MUST be from Class ${config.classGrade} ${config.curriculum} syllabus ONLY
                - Include Conceptual MCQs testing understanding of principles
                - Include Numerical problems with step-by-step application
                - Include Diagram/Visual-based questions where relevant
                - Use formulas and concepts taught in Class ${config.classGrade} ONLY, not higher classes
                `;
            } else if (subjectLower.includes('biology') || subjectLower.includes('science')) {
                subjectPatterns = `
                BIOLOGY/SCIENCE PATTERN (${config.curriculum} CLASS ${config.classGrade}):
                - Questions MUST be from Class ${config.classGrade} ${config.curriculum} syllabus ONLY
                - Include Diagram-based questions (label parts, identify structures)
                - Include Assertion-Reason type MCQs
                - Include Case-Study based questions for full papers
                - Test understanding of processes, cycles, and biological concepts
                `;
            } else if (subjectLower.includes('social') || subjectLower.includes('history') || subjectLower.includes('geography') || subjectLower.includes('civics')) {
                subjectPatterns = `
                SOCIAL SCIENCE PATTERN (${config.curriculum} CLASS ${config.classGrade}):
                - Questions MUST be from Class ${config.classGrade} ${config.curriculum} syllabus ONLY
                - Include Map-based questions for Geography
                - Include Source-based questions for History
                - Include Case-Study questions for Civics/Political Science
                - Test factual knowledge, dates, events, concepts specific to Class ${config.classGrade}
                `;
            }

            const prompt = `
                ⚠️ CRITICAL CONSTRAINTS - READ CAREFULLY:
                
                1. CLASS LEVEL: You are generating questions for CLASS ${config.classGrade} ONLY.
                   - DO NOT include ANY content from Class ${parseInt(config.classGrade) + 1} or higher
                   - DO NOT include ANY content from Class ${parseInt(config.classGrade) - 1} or lower
                   - Every question MUST be answerable by a Class ${config.classGrade} student using ONLY their Class ${config.classGrade} textbook
                
                2. BOARD: ${config.curriculum} Board
                   - Follow ${config.curriculum} exam pattern EXACTLY
                   - Use ${config.curriculum} textbook chapter references
                   - Question style should match ${config.curriculum} board papers
                
                3. SUBJECT: ${config.subject}
                4. TOPIC/CHAPTER: ${config.topic}
                5. DIFFICULTY: ${config.difficulty}
                
                ${subjectPatterns}
                
                ${mimicContext ? mimicContext : `STRUCTURAL INSTRUCTIONS:
                ${structuralInstructions}
                
                QUALITY INSTRUCTIONS:
                ${qualityInstructions}`}
                
                🚨 VALIDATION CHECKLIST (All must be TRUE):
                - [ ] Every question is from Class ${config.classGrade} ${config.curriculum} syllabus
                - [ ] No advanced concepts from higher classes
                - [ ] Questions match ${config.curriculum} board paper format
                - [ ] Difficulty matches "${config.difficulty}" level
                - [ ] Topic "${config.topic}" is covered correctly
                
                Respond ONLY with valid JSON (no markdown, no explanation):
                {
                  "quiz_metadata": {
                    "subject": "${config.subject}",
                    "topic": "${config.topic}",
                    "difficulty": "${config.difficulty}",
                    "board": "${config.curriculum}",
                    "class": "${config.classGrade}"
                  },
                  "questions": [
                    {
                      "id": 1,
                      "section": "Section A",
                      "marks": 1,
                      "type": "objective",
                      "question": "Your question text here",
                      "image_description": "Optional: Description of diagram if visual question",
                      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                      "correct_answer": "A) Option 1",
                      "explanation": "Brief explanation"
                    }
                  ]
                }
                
                Generate EXACTLY ${config.count} questions.
            `;

            // Call Groq with strict class-level system message
            const systemMessage = `You are a Senior ${config.curriculum} Board Exam Paper Setter with 20+ years of experience. 
            
CRITICAL RULES:
1. You ONLY create questions for CLASS ${config.classGrade} ${config.curriculum} syllabus
2. You NEVER include content from higher or lower classes
3. You follow ${config.curriculum} board exam patterns EXACTLY
4. Every question must be solvable using Class ${config.classGrade} textbook knowledge ONLY

You will be FIRED if you include content from wrong class levels.`;
            const payload = formatGroqPayload(prompt, systemMessage);
            const result = await retryableFetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const text = result.choices?.[0]?.message?.content || "";
            const parsedQuiz = RagService.extractJson(text);

            // Post-processing to ensure sections exist if missing in simple mode
            if (!parsedQuiz.questions[0].section) {
                parsedQuiz.questions.forEach(q => q.section = "Practice Section");
            }

            setQuizData(parsedQuiz);
            setStep('taking');
            incrementUsage('quiz');

        } catch (err) {
            console.error("Quiz Gen Error:", err);
            setError(err.message || "Failed to generate assessment. Please try again.");
        } finally { setIsLoading(false); }
    };

    const submitQuiz = async () => {
        setIsLoading(true);
        try {
            // Calculate Score
            let correctCount = 0;
            let objectiveTotal = 0;
            const detailedAnswers = quizData.questions.map(q => {
                const studentAns = answers[q.id] || "Not Attempted";
                const isCorrect = q.type === 'objective' && studentAns === q.correct_answer;
                if (q.type === 'objective') {
                    objectiveTotal++;
                    if (isCorrect) correctCount++;
                }
                return { ...q, student_answer: studentAns, is_correct: isCorrect };
            });

            const objectiveScore = objectiveTotal > 0 ? Math.round((correctCount / objectiveTotal) * 100) : 0;

            // AI Analysis
            const analysisPrompt = `
                Analyze Student Performance(Class ${config.classGrade} - ${config.subject}).
    Topic: ${config.topic}

DATA: ${JSON.stringify(detailedAnswers.map(a => ({ q: a.question, type: a.type, ans: a.student_answer, correct: a.correct_answer })))}

                OUTPUT JSON:
{
    "overall_feedback": "Constructive feedback string",
        "weak_concepts": [
            { "concept": "Topic Name", "revision_note": "Short revision note", "youtube_query": "Search query" }
        ]
}
`;

            const payload = formatGroqPayload(analysisPrompt, "You are an expert tutor.");
            const result = await retryableFetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const analysisJson = RagService.extractJson(result.choices?.[0]?.message?.content || "{}");

            setAssessmentStats({
                score: objectiveScore,
                correct: correctCount,
                total: objectiveTotal,
                detailedAnswers,
                analysis: analysisJson
            });
            setGradingResult("Analyzed");
            setStep('result');
        } catch (err) {
            setError(err.message);
            setStep('result'); // Allow viewing key even if AI fails
        } finally { setIsLoading(false); }
    };

    const handleRetake = () => { /* ... existing retake logic ... */ };

    // Helper to group questions by section for display
    const groupQuestionsBySection = (questions) => {
        const groups = {};
        questions.forEach(q => {
            const sec = q.section || "General";
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(q);
        });
        return groups;
    };

    return (
        <div className={`flex flex-col h-full ${isDark ? 'bg-gray-900' : 'bg-warm-100'} text-theme-primary relative overflow-y-auto custom-scrollbar p-4 md:p-8 transition-colors duration-300 section-quiz`}>
            <div className={`absolute top-0 right-0 w-[600px] h-[600px] ${isDark ? 'bg-purple-900/10' : 'bg-purple-400/10'} rounded-full blur-[100px] -z-10 pointer-events-none`} />
            <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] ${isDark ? 'bg-rose-900/10' : 'bg-rose-400/10'} rounded-full blur-[100px] -z-10 pointer-events-none`} />

            {/* View Mode Toggle / Header logic if needed could go here, but we put it inside setup for now */}

            {viewMode === 'paper-gen' && (
                <div className="h-full flex flex-col">
                    <button
                        onClick={() => setViewMode('quiz')}
                        className="mb-4 self-start flex items-center gap-2 text-sm font-bold text-theme-muted hover:text-theme-primary transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Quiz Setup
                    </button>
                    <SamplePaperGenerator retryableFetch={retryableFetch} />
                </div>
            )}

            {viewMode === 'quiz' && step === 'setup' && (
                <div className="flex-1 flex flex-col h-full animate-slide-up">
                    {/* Hero Header */}
                    <div className="text-center py-6 space-y-3">
                        <div className="flex items-center justify-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-rose-500 rounded-2xl shadow-lg">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">
                                Quiz Generator
                            </h1>
                        </div>
                        <p className="text-theme-muted text-lg max-w-xl mx-auto">
                            AI-powered assessments tailored to your syllabus
                            {!isPro && <span className="text-purple-500 ml-2">({getRemainingUses('quiz')} free left)</span>}
                        </p>
                        <button
                            type="button"
                            onClick={() => setViewMode('paper-gen')}
                            className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold rounded-full shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105"
                        >
                            <Sparkles className="w-5 h-5" />
                            ✨ Upload Sample Paper & Generate New
                        </button>
                    </div>

                    {/* Main Form */}
                    <form onSubmit={generateQuiz} className="flex-1 flex flex-col gap-5 px-4 md:px-8 pb-6 max-w-6xl mx-auto w-full overflow-y-auto">

                        {/* Row 1: Board & Class */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg border ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-purple-500" /> Board
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {['CBSE', 'ICSE'].map(b => (
                                        <button key={b} type="button" onClick={() => setConfig({ ...config, curriculum: b })}
                                            className={`p-4 rounded-xl font-bold text-lg transition-all ${config.curriculum === b
                                                ? 'bg-gradient-to-r from-purple-600 to-rose-500 text-white shadow-lg'
                                                : `${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} text-theme-secondary`}`}>
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg border ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-purple-500" /> Class
                                </h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {['9', '10', '11', '12'].map(c => (
                                        <button key={c} type="button" onClick={() => setConfig({ ...config, classGrade: c })}
                                            className={`p-4 rounded-xl font-bold text-lg transition-all ${config.classGrade === c
                                                ? 'bg-gradient-to-r from-purple-600 to-rose-500 text-white shadow-lg'
                                                : `${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} text-theme-secondary`}`}>
                                            {c}<sup className="text-xs">th</sup>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Subject & Topic */}
                        <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg border ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-2">📚 Subject</h3>
                                    <input name="subject" value={config.subject} onChange={handleConfigChange} required
                                        placeholder="Physics, Chemistry, Maths, Biology, English..."
                                        className={`w-full p-4 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-white/5 placeholder-gray-500' : 'bg-gray-50 placeholder-gray-400'} text-theme-primary`} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-2">📖 Chapter / Topic</h3>
                                    <input name="topic" value={config.topic} onChange={handleConfigChange} required
                                        placeholder="Electrostatics, Quadratic Equations, Photosynthesis..."
                                        className={`w-full p-4 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-white/5 placeholder-gray-500' : 'bg-gray-50 placeholder-gray-400'} text-theme-primary`} />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Quiz Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Questions */}
                            <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg border ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-3">🔢 Questions</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {[5, 10, 15, 20, 35].map(n => (
                                        <button key={n} type="button"
                                            onClick={() => { let c = { ...config, count: n }; if (n === 35) c.type = 'Mixed'; setConfig(c); }}
                                            className={`p-3 rounded-lg font-bold transition-all ${config.count === n
                                                ? 'bg-gradient-to-r from-purple-600 to-rose-500 text-white shadow-md'
                                                : `${isDark ? 'bg-white/5' : 'bg-gray-100'} text-theme-secondary hover:opacity-80`} ${n === 35 ? 'col-span-3 text-sm' : ''}`}>
                                            {n === 35 ? '📄 35 - Full Board Exam' : n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Difficulty */}
                            <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg border ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-3">🎯 Difficulty</h3>
                                <div className="space-y-2">
                                    {[{ v: 'Easy', l: '🟢 Easy', d: 'Basics & Theory' }, { v: 'Medium', l: '🟡 Medium', d: '50/50 Mix' }, { v: 'Hard', l: '🔴 Hard', d: 'HOTS & Application' }].map(d => (
                                        <button key={d.v} type="button" onClick={() => setConfig({ ...config, difficulty: d.v })}
                                            className={`w-full p-3 rounded-lg text-left flex justify-between items-center transition-all ${config.difficulty === d.v
                                                ? 'bg-gradient-to-r from-purple-600 to-rose-500 text-white shadow-md'
                                                : `${isDark ? 'bg-white/5' : 'bg-gray-100'} text-theme-secondary`}`}>
                                            <span className="font-bold">{d.l}</span>
                                            <span className={`text-xs ${config.difficulty === d.v ? 'text-white/80' : 'text-theme-muted'}`}>{d.d}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Type */}
                            <div className={`p-5 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg border ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-3">📝 Type</h3>
                                <div className="space-y-2">
                                    {[{ v: 'Objective', l: '✅ MCQs Only' }, { v: 'Subjective', l: '📝 Theory Only' }, { v: 'Mixed', l: '📋 Mixed Pattern' }].map(t => (
                                        <button key={t.v} type="button" onClick={() => setConfig({ ...config, type: t.v })}
                                            className={`w-full p-3 rounded-lg font-bold transition-all ${config.type === t.v
                                                ? 'bg-gradient-to-r from-purple-600 to-rose-500 text-white shadow-md'
                                                : `${isDark ? 'bg-white/5' : 'bg-gray-100'} text-theme-secondary`}`}>
                                            {t.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={isLoading || !config.subject || !config.topic}
                            className="w-full py-5 bg-gradient-to-r from-purple-600 via-rose-500 to-orange-400 text-white rounded-2xl font-black text-xl shadow-2xl hover:shadow-purple-500/40 transition-all transform hover:scale-[1.01] disabled:opacity-50 flex justify-center items-center gap-3">
                            {isLoading ? <><Loader2 className="w-6 h-6 animate-spin" /> Crafting Your Assessment...</> : <><Brain className="w-6 h-6" /> Generate Assessment 🚀</>}
                        </button>
                        {error && <div className="text-rose-500 text-center p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-center gap-3"><AlertCircle className="w-5 h-5" />{error}</div>}
                    </form>
                </div>
            )}

            {step === 'taking' && quizData && (
                <div className="max-w-4xl mx-auto w-full animate-slide-up space-y-8 pb-20">
                    <div className="glass-panel-lighter p-6 rounded-2xl flex justify-between items-center sticky top-0 z-30 backdrop-blur-xl shadow-xl border-b border-white/10">
                        <div>
                            <h3 className="text-xl font-bold text-theme-primary">{config.subject} Assessment</h3>
                            <div className="flex items-center gap-2 text-xs font-bold text-theme-muted uppercase tracking-wider">
                                <span className="text-purple-500">Class {config.classGrade}</span>
                                <span>•</span>
                                <span>{config.difficulty}</span>
                            </div>
                        </div>
                        <button onClick={submitQuiz} className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg font-bold shadow-lg hover:shadow-green-500/20 transition-all text-white text-sm">
                            Submit Exam
                        </button>
                    </div>

                    <div className="space-y-8">
                        {Object.entries(groupQuestionsBySection(quizData.questions)).sort().map(([sectionName, questions]) => (
                            <div key={sectionName} className="space-y-4">
                                {(config.type === 'Mixed' || parseInt(config.count) === 35) && (
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                                        <h4 className="text-lg font-bold text-purple-500 uppercase tracking-widest">{sectionName}</h4>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                                    </div>
                                )}

                                {questions.map((q, i) => (
                                    <div key={q.id} className="glass-panel p-8 rounded-3xl shadow-sm hover:shadow-md transition-all border border-transparent hover:border-purple-500/20">
                                        <div className="flex gap-5">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-theme-bg-secondary text-theme-muted flex items-center justify-center font-bold text-sm">
                                                {q.id}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-lg font-medium text-theme-primary leading-relaxed">{q.question}</p>
                                                        {q.image_description && (
                                                            <div className={`mt-4 p-5 rounded-2xl ${isDark ? 'bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border-indigo-500/30' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'} border-2 border-dashed`}>
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className="p-2 rounded-xl bg-indigo-500/20">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-bold text-indigo-500 text-sm uppercase tracking-wide">📐 Diagram Required</span>
                                                                        <p className="text-xs text-theme-muted">Visualize this for the question</p>
                                                                    </div>
                                                                </div>
                                                                <div className={`p-4 rounded-xl ${isDark ? 'bg-black/30' : 'bg-white/80'} text-theme-secondary leading-relaxed`}>
                                                                    {q.image_description}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-theme-muted px-2 py-1 rounded bg-theme-bg-secondary flex-shrink-0 ml-2">{q.marks} Marks</span>
                                                </div>

                                                {q.type === 'objective' ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {q.options.map((opt, idx) => (
                                                            <label key={idx} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${answers[q.id] === opt ? 'bg-purple-600/20 border-purple-500 shadow-md' : 'bg-theme-bg-secondary border-transparent hover:bg-theme-bg-secondary/80'}`}>
                                                                <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} className="hidden" />
                                                                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${answers[q.id] === opt ? 'border-purple-500 bg-purple-500' : 'border-gray-400'}`}>
                                                                    {answers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                                                                </div>
                                                                <span className={`${answers[q.id] === opt ? 'text-purple-400 font-semibold' : 'text-theme-secondary'}`}>{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        rows="3"
                                                        className="w-full glass-input p-4 rounded-xl focus:outline-none text-base resize-none"
                                                        placeholder="Type your answer here..."
                                                        value={answers[q.id] || ''}
                                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(step === 'grading' || step === 'result') && assessmentStats && (
                <div className="max-w-4xl mx-auto w-full animate-slide-up space-y-8 pb-20">
                    {/* ... Result View (Kept mostly same, just ensuring variables match) ... */}
                    <div className="space-y-8 pb-10">
                        {/* Score Dashboard */}
                        <div className={`glass-panel p-8 rounded-[32px] relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-indigo-900/30 to-purple-900/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                {/* Main Score */}
                                <div className="md:col-span-1 flex flex-col items-center justify-center">
                                    <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black bg-gradient-to-br ${assessmentStats.score >= 75 ? 'from-emerald-500 to-green-600' : assessmentStats.score >= 50 ? 'from-yellow-500 to-orange-500' : 'from-rose-500 to-red-600'} text-white shadow-2xl`}>
                                        {assessmentStats.score}%
                                    </div>
                                    <p className="text-lg font-bold text-theme-primary mt-3">
                                        {assessmentStats.score >= 90 ? '🎉 Outstanding!' : assessmentStats.score >= 75 ? '👏 Great Job!' : assessmentStats.score >= 50 ? '💪 Keep Going!' : '📚 Need Practice'}
                                    </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg`}>
                                        <p className="text-3xl font-black text-emerald-500">{assessmentStats.correct}</p>
                                        <p className="text-xs font-bold text-theme-muted uppercase tracking-wider">Correct</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg`}>
                                        <p className="text-3xl font-black text-rose-500">{assessmentStats.total - assessmentStats.correct}</p>
                                        <p className="text-xs font-bold text-theme-muted uppercase tracking-wider">Incorrect</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg`}>
                                        <p className="text-3xl font-black text-purple-500">{assessmentStats.total}</p>
                                        <p className="text-xs font-bold text-theme-muted uppercase tracking-wider">Total MCQs</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-lg`}>
                                        <p className="text-3xl font-black text-indigo-500">{config.difficulty}</p>
                                        <p className="text-xs font-bold text-theme-muted uppercase tracking-wider">Difficulty</p>
                                    </div>
                                </div>
                            </div>

                            {/* AI Feedback */}
                            {assessmentStats.analysis?.overall_feedback && (
                                <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/80'} border border-purple-500/20`}>
                                    <p className="text-theme-secondary text-center">💡 {assessmentStats.analysis.overall_feedback}</p>
                                </div>
                            )}
                        </div>

                        {/* Weak Concepts */}
                        {assessmentStats.analysis?.weak_concepts?.length > 0 && (
                            <div className="glass-panel p-8 rounded-[40px]">
                                <h3 className="text-xl font-bold text-theme-primary mb-6 flex items-center gap-2"><Brain className="w-6 h-6 text-purple-500" /> Smart Remedial Plan</h3>
                                <div className="grid gap-4">
                                    {assessmentStats.analysis.weak_concepts.map((c, i) => (
                                        <div key={i} className="p-5 rounded-2xl bg-theme-bg-secondary border border-theme-border">
                                            <h4 className="font-bold text-rose-500 mb-2">{c.concept}</h4>
                                            <p className="text-sm text-theme-secondary mb-3">{c.revision_note}</p>
                                            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(c.youtube_query + " class " + config.classGrade)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                                                <Youtube className="w-3 h-3" /> Watch Lesson
                                            </a >
                                        </div >
                                    ))}
                                </div >
                            </div >
                        )}

                        {/* Answer Key */}
                        <div className="glass-panel p-8 rounded-[40px]">
                            <h3 className="text-xl font-bold text-theme-primary mb-6">Detailed Solutions</h3>
                            <div className="space-y-6">
                                {assessmentStats.detailedAnswers.map((a, i) => (
                                    <div key={i} className="border-b border-theme-border pb-6 last:border-0">
                                        <p className="font-medium text-theme-primary mb-3">Q{i + 1}. {a.question}</p>
                                        <div className="text-sm space-y-2">
                                            <div className={`p-3 rounded-lg ${a.is_correct ? 'bg-green-500/10 text-green-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                <span className="font-bold text-xs uppercase opacity-70 block mb-1">Your Answer</span>
                                                {a.student_answer}
                                            </div>
                                            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
                                                <span className="font-bold text-xs uppercase opacity-70 block mb-1">Correct Answer</span>
                                                {a.correct_answer}
                                            </div>
                                            {a.explanation && <p className="text-xs text-theme-muted mt-2 italic">💡 {a.explanation}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setStep('setup')} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg">Start New Assessment</button>
                    </div >
                </div >
            )}
        </div >
    );
};

export default QuizAssessment;
