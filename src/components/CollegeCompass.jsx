import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, MessageSquare, Loader2, Lightbulb, Link, Globe, Send, Sparkles, Brain, Trophy, MapPin, GraduationCap, Map, Crown, BookOpen, Target, Calendar, ChevronRight, Check, Activity, FileText } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { GROQ_API_URL, formatGroqPayload } from '../utils/api';

// ───────────────────────────────────────────────
// Markdown Renderer — shared across all tabs
// ───────────────────────────────────────────────
const MarkdownBlock = ({ text, isDark }) => (
    <div className="space-y-1">
        {text.split('\n').map((line, idx) => {
            if (line.startsWith('## ')) return <h2 key={idx} className={`text-lg font-bold mt-4 mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{line.replace('## ', '')}</h2>;
            if (line.startsWith('### ')) return <h3 key={idx} className={`text-md font-bold mt-3 mb-1 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>{line.replace('### ', '')}</h3>;
            if (line.includes('**')) {
                const parts = line.split(/\*\*(.+?)\*\*/g);
                return <p key={idx} className="my-1.5 text-[15px]">{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-indigo-500">{p}</strong> : p)}</p>;
            }
            if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                return <div key={idx} className="flex gap-2 my-1 ml-2 text-[15px]"><span className="text-indigo-500">•</span><span>{line.trim().replace(/^[-•]\s*/, '')}</span></div>;
            }
            if (line.trim()) return <p key={idx} className="my-1.5 text-[15px]">{line}</p>;
            return <div key={idx} className="h-1.5" />;
        })}
    </div>
);

// Input field helper
const FormField = ({ label, children, isDark }) => (
    <div className="space-y-2">
        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'} ml-1`}>{label}</label>
        {children}
    </div>
);

const InputField = ({ isDark, ...props }) => (
    <input
        {...props}
        className={`w-full p-4 rounded-[18px] text-sm font-medium outline-none transition-all duration-300
            ${isDark
                ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-slate-600 focus:border-indigo-500/50 focus:shadow-[0_0_20px_hsla(var(--theme-primary)/0.1)]'
                : 'bg-warm-50/50 border-warm-200/60 text-slate-800 placeholder-slate-400 focus:border-indigo-400/50 focus:shadow-[0_0_15px_hsla(var(--theme-primary)/0.05)]'} 
            border
        `}
    />
);

const TextareaField = ({ isDark, ...props }) => (
    <textarea
        {...props}
        className={`w-full p-4 rounded-[18px] text-sm font-medium resize-none transition-all duration-300
            ${isDark
                ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-slate-600 focus:border-indigo-500/50 focus:shadow-[0_0_20px_hsla(var(--theme-primary)/0.1)]'
                : 'bg-warm-50/50 border-warm-200/60 text-slate-800 placeholder-slate-400 focus:border-indigo-400/50 focus:shadow-[0_0_15px_hsla(var(--theme-primary)/0.05)]'} 
            border
        `}
    />
);

const SelectField = ({ isDark, options, ...props }) => (
    <select
        {...props}
        className={`w-full p-4 rounded-xl text-sm ${isDark ? 'bg-gray-800/50 border-white/10 text-white' : 'bg-white border-gray-200 text-slate-800'} border focus:border-indigo-500 outline-none transition-all`}
    >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
);

// ───────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────
const CollegeCompass = ({ retryableFetch }) => {
    const { isDark } = useTheme();
    const { canUseFeature, incrementUsage, triggerUpgradeModal, isPro, getRemainingUses } = useSubscription();

    // Tab state
    const [activeTab, setActiveTab] = useState('career');

    // Career AI
    const [careerForm, setCareerForm] = useState({ hobbies: '', passion: '', field: '', aspirations: '', budget: '', country: '' });
    const [careerResult, setCareerResult] = useState('');

    // College Finder (enhanced)
    const [collegeForm, setCollegeForm] = useState({
        gpa: '', major: '', extracurriculars: '', location: '',
        budget: '', testScores: '', studyLevel: 'Undergraduate', country: 'Any'
    });
    const [collegeResult, setCollegeResult] = useState('');
    const [citations, setCitations] = useState([]);

    // Scholarship Finder (NEW)
    const [scholarshipForm, setScholarshipForm] = useState({
        nationality: '', gpa: '', fieldOfStudy: '', financialNeed: 'Medium', targetCountry: '', achievements: ''
    });
    const [scholarshipResult, setScholarshipResult] = useState('');

    // Compare Colleges (NEW)
    const [compareForm, setCompareForm] = useState({ college1: '', college2: '', college3: '', criteria: 'Overall' });
    const [compareResult, setCompareResult] = useState('');

    // SOP/Essay Reviewer (NEW)
    const [essayText, setEssayText] = useState('');
    const [essayType, setEssayType] = useState('SOP');
    const [essayResult, setEssayResult] = useState('');

    // Chat
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([{ role: 'model', text: "Hello! I'm your elite AI College Counselor. Ask me anything — admissions strategy, country comparisons, visa guidance, ranking analysis, financial planning, or career alignment. I use comprehensive data to give you world-class recommendations." }]);

    // Shared
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

    // ─── AI CALL HELPER ───
    const callAI = async (userQuery, systemPrompt) => {
        const payload = {
            ...formatGroqPayload(userQuery, systemPrompt)
        };
        const result = await retryableFetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return result.choices?.[0]?.message?.content || "No response generated. Please try again.";
    };

    // ─── CAREER AI ───
    const handleCareerSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setCareerResult('');
        try {
            const text = await callAI(
                `Analyze this student's profile and create a comprehensive, personalized career roadmap.

--- STUDENT PROFILE ---
Hobbies & Interests: ${careerForm.hobbies}
Deep Passions: ${careerForm.passion}
Current Field of Study: ${careerForm.field}
Future Aspirations: ${careerForm.aspirations}
Budget Constraints: ${careerForm.budget || 'Not specified'}
Preferred Country: ${careerForm.country || 'Open to any'}
--- END PROFILE ---

Provide:
## 🎯 Top 3 Career Paths
For each: name, why it fits, salary range (entry/mid/senior), growth outlook 2025-2035.

## 📚 Education Roadmap
Degree recommendations, certifications, online courses, bootcamps.

## 🏆 Skills to Build
Technical + soft skills with specific resources (courses, books, platforms).

## 🌍 Global Opportunities
Best countries/cities for each career, remote work potential, visa-friendly nations.

## 💡 Action Plan (Next 12 Months)
Month-by-month breakdown of concrete steps.

## ⚡ Hidden Gems
Unconventional paths, emerging roles, or interdisciplinary opportunities most people miss.

Format with clear headers, emojis, and actionable bullet points.`,
                `You are the world's best AI Career Architect. You combine data from LinkedIn trends, Bureau of Labor Statistics, Glassdoor, and global employment data. You give specific, actionable, data-backed career advice tailored to the student's unique profile. Never be generic — every recommendation must be personalized. Use clear Markdown formatting.`
            );
            setCareerResult(text);
            incrementUsage('college-compass');
        } catch (err) { setCareerResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── COLLEGE FINDER (ENHANCED) ───
    const handleCollegeSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setCollegeResult('');
        setCitations([]);
        try {
            const text = await callAI(
                `Analyze this student profile and provide the most comprehensive college recommendation in the world.

--- STUDENT PROFILE ---
GPA/Marks: ${collegeForm.gpa}
Test Scores: ${collegeForm.testScores || 'Not provided'}
Desired Major: ${collegeForm.major}
Study Level: ${collegeForm.studyLevel}
Extracurriculars: ${collegeForm.extracurriculars}
Preferred Location: ${collegeForm.location || 'No preference'}
Preferred Country: ${collegeForm.country}
Budget: ${collegeForm.budget || 'Not specified'}
--- END PROFILE ---

Provide a DETAILED analysis:

## 🔒 Safety Schools (3 colleges)
For each: Name, Location, Acceptance Rate, Why It Fits, Tuition, Unique Advantage, Notable Alumni.

## 🎯 Target Schools (3 colleges)
Same format as above.

## 🚀 Reach/Dream Schools (2 colleges)
Same format as above.

## 📊 Acceptance Probability Analysis
Table-style breakdown with estimated chances (High/Medium/Low) and reasoning.

## 💰 Financial Breakdown
Tuition comparison, scholarship opportunities at each school, cost of living.

## 📝 Application Strategy
Timeline, required documents, tips for each school, ED/EA recommendations.

## 🌟 Hidden Gems
2-3 lesser-known but excellent programs that perfectly match the profile.

Use the latest available data. Be specific with numbers, rankings, and percentages.`,
                `You are the world's most knowledgeable AI College Admissions Consultant, combining data from US News, QS World Rankings, THE Rankings, Niche, CollegeBoard, and UCAS. You provide hyper-personalized, data-driven recommendations. Every suggestion must include specific numbers (acceptance rates, tuition, rankings). Use clear Markdown with emojis for visual hierarchy.`
            );
            setCollegeResult(text);
            incrementUsage('college-compass');
        } catch (err) { setCollegeResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── SCHOLARSHIP FINDER (NEW) ───
    const handleScholarshipSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setScholarshipResult('');
        try {
            const text = await callAI(
                `Find the best scholarships for this student profile:

--- PROFILE ---
Nationality: ${scholarshipForm.nationality}
GPA: ${scholarshipForm.gpa}
Field of Study: ${scholarshipForm.fieldOfStudy}
Financial Need Level: ${scholarshipForm.financialNeed}
Target Country: ${scholarshipForm.targetCountry || 'Any'}
Key Achievements: ${scholarshipForm.achievements}
--- END ---

Provide a comprehensive guide:

## 🏆 Top 10 Matching Scholarships
For each: Name, Amount, Deadline (approximate), Eligibility, How to Apply, Success Tips.

## 🌍 Country-Specific Scholarships
Government and institutional scholarships in the target country.

## 💡 Merit vs Need-Based Analysis
Which type suits this profile better and strategic recommendations.

## 📝 Application Tips
Common mistakes, essay strategies, recommendation letter advice.

## 🎯 Hidden Scholarships
Lesser-known scholarships with high acceptance rates.

Include real scholarship names and approximate amounts. Be specific and actionable.`,
                `You are the world's top Scholarship Advisor AI. You have comprehensive knowledge of scholarships globally — government programs (Fulbright, Chevening, DAAD, CSC, Erasmus+, etc.), university-specific aid, private foundations, and niche scholarships. Every recommendation must be specific and real. Use Markdown formatting with emojis.`
            );
            setScholarshipResult(text);
            incrementUsage('college-compass');
        } catch (err) { setScholarshipResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── COMPARE COLLEGES (NEW) ───
    const handleCompareSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setCompareResult('');
        try {
            const colleges = [compareForm.college1, compareForm.college2, compareForm.college3].filter(Boolean);
            const text = await callAI(
                `Compare these colleges head-to-head: ${colleges.join(' vs ')}.
Focus criteria: ${compareForm.criteria}

Provide an exhaustive comparison:

## 📊 Quick Comparison Table
Rankings (QS, US News, THE), Acceptance Rate, Tuition (Int'l), Student Population, Student-Faculty Ratio.

## 🎓 Academic Excellence
Program strength in various fields, research output, faculty quality, industry connections.

## 🏠 Campus & Student Life
Location, housing, clubs, diversity, safety, social scene, sports.

## 💰 Financial Comparison
Full cost breakdown: tuition, living, scholarships available, ROI analysis.

## 🌍 Career Outcomes
Employment rate, median starting salary, top recruiters, alumni network strength.

## ⚖️ Verdict
Who should pick which college and why (personality types, career goals, preferences).

Be objective, data-driven, and specific. Present as a structured comparison.`,
                `You are the world's best College Comparison Analyst. You combine data from official sources, student reviews (Niche, Unigo), employment statistics, and financial data. Present balanced, objective comparisons. Use clear Markdown with comparison tables where possible.`
            );
            setCompareResult(text);
            incrementUsage('college-compass');
        } catch (err) { setCompareResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── SOP/ESSAY REVIEWER (NEW) ───
    const handleEssaySubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setEssayResult('');
        try {
            const text = await callAI(
                `Review this ${essayType} (Statement of Purpose / Application Essay) and provide expert feedback:

--- ${essayType.toUpperCase()} TEXT ---
${essayText}
--- END ---

Provide comprehensive feedback:

## 📊 Overall Score: X/10

## ✅ Strengths
What works well — specific lines/sections that are strong and why.

## ⚠️ Weaknesses
What needs improvement — be specific about which parts and why.

## 📝 Structural Analysis
Opening hook, narrative flow, coherence, conclusion strength.

## 🎯 Content Feedback
Specificity, personal voice, authenticity, evidence of growth.

## ✍️ Suggested Rewrites
Provide improved versions of 2-3 weak sentences/paragraphs.

## 💡 Pro Tips
Admissions committee perspective — what they want to see vs what's missing.

Be constructive but honest. Reference specific lines from the text.`,
                `You are a veteran college admissions essay reviewer who has read 50,000+ SOPs and personal essays. You worked at top university admissions offices (Stanford, MIT, Harvard). You give brutally honest but constructive feedback that helps students genuinely improve. Rate harshly but fairly. Use Markdown formatting.`
            );
            setEssayResult(text);
            incrementUsage('college-compass');
        } catch (err) { setEssayResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── ADMISSIONS CHAT ───
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const userMsg = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);
        const historyText = chatHistory.slice(-10).map(m => `${m.role === 'user' ? 'Student' : 'Counselor'}: ${m.text}`).join('\n');
        try {
            const text = await callAI(
                `${historyText}\nStudent: ${userMsg}`,
                `You are the world's top AI College Admissions Counselor. You have comprehensive knowledge of global universities, admission processes, visa requirements, scholarship opportunities, standardized testing, application strategies, and career planning. Be specific, data-driven, and actionable. Use Markdown headers and emojis for clarity. Keep responses focused and under 400 words unless the question requires depth.`
            );
            setChatHistory(prev => [...prev, { role: 'model', text }]);
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        }
        finally { setIsLoading(false); }
    };

    // ─── TAB DEFINITIONS ───
    const TABS = [
        { id: 'career', icon: <Brain className="w-4 h-4" />, label: 'Career AI' },
        { id: 'college', icon: <GraduationCap className="w-4 h-4" />, label: 'College Finder' },
        { id: 'scholarship', icon: <Trophy className="w-4 h-4" />, label: 'Scholarships' },
        { id: 'compare', icon: <Activity className="w-4 h-4" />, label: 'Compare' },
        { id: 'essay', icon: <BookOpen className="w-4 h-4" />, label: 'Essay Review' },
        { id: 'chat', icon: <MessageSquare className="w-4 h-4" />, label: 'Chat' },
    ];

    return (
        <div className={`flex flex-col h-full ${isDark ? 'bg-midnight-900 text-white' : 'bg-warm-50 text-warm-800'} relative overflow-hidden transition-colors duration-300`}>
            {/* Background */}
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/10'} rounded-full blur-[120px] -z-10`} />
            <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] ${isDark ? 'bg-blue-600/10' : 'bg-blue-400/10'} rounded-full blur-[120px] -z-10`} />

            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between z-30 glass-3d border-b rounded-b-3xl mx-4 mt-4
                ${isDark ? 'bg-midnight-900/40 border-white/[0.08]' : 'bg-white/40 border-warm-200/50'}
            `}>
                <div className="flex items-center gap-4 group">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500`}>
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black bg-gradient-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent uppercase tracking-tight">
                            College Compass
                        </h1>
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mt-0.5">Strategic Global Admissions</p>
                    </div>
                </div>
            </div>

            {/* Sub-Nav Tabs */}
            <div className="px-6 py-4 flex items-center justify-center">
                <div className={`flex items-center p-1.5 rounded-[24px] glass-3d
                    ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-warm-100/50 border-warm-200/40'}
                `}>
                    {[
                        { id: 'career', label: 'Career Planner', icon: Target, color: 'from-violet-500 to-indigo-600' },
                        { id: 'college', label: 'University Hunt', icon: Globe, color: 'from-blue-500 to-cyan-600' },
                        { id: 'scholarship', label: 'Aid Finder', icon: Trophy, color: 'from-amber-500 to-orange-500' },
                        { id: 'compare', label: 'Compare Hub', icon: Activity, color: 'from-green-500 to-emerald-600' },
                        { id: 'essay', label: 'Essay/SOP Expert', icon: FileText, color: 'from-rose-500 to-pink-500' },
                        { id: 'chat', label: 'Counselor Chat', icon: MessageSquare, color: 'from-indigo-500 to-violet-500' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all duration-500 relative group
                                ${activeTab === tab.id
                                    ? `bg-gradient-to-r ${tab.color} text-white shadow-xl shadow-indigo-500/20 scale-[1.05]`
                                    : 'text-theme-muted hover:text-indigo-500 hover:bg-white/5'}
                            `}
                        >
                            {activeTab === tab.id && (
                                <div className="absolute -inset-0.5 bg-inherit rounded-[20px] blur opacity-40 animate-pulse -z-10" />
                            )}
                            <tab.icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110 rotate-12' : 'group-hover:scale-110'}`} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-12 pb-24">
                    {activeTab === 'career' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleCareerSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                                <div className="flex items-center gap-3 mb-6">
                                    <Brain className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                    <div>
                                        <h3 className="text-lg font-bold">AI Career Architect</h3>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Discover careers that match your unique DNA</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Hobbies & Interests" isDark={isDark}>
                                        <InputField isDark={isDark} name="hobbies" value={careerForm.hobbies} onChange={e => setCareerForm({ ...careerForm, hobbies: e.target.value })} required placeholder="e.g. coding, robotics, painting..." />
                                    </FormField>
                                    <FormField label="Deep Passions" isDark={isDark}>
                                        <InputField isDark={isDark} name="passion" value={careerForm.passion} onChange={e => setCareerForm({ ...careerForm, passion: e.target.value })} required placeholder="e.g. climate change, AI ethics..." />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Current Study Field" isDark={isDark}>
                                        <InputField isDark={isDark} value={careerForm.field} onChange={e => setCareerForm({ ...careerForm, field: e.target.value })} required placeholder="e.g. Computer Science, Arts..." />
                                    </FormField>
                                    <FormField label="Future Aspirations" isDark={isDark}>
                                        <InputField isDark={isDark} value={careerForm.aspirations} onChange={e => setCareerForm({ ...careerForm, aspirations: e.target.value })} required placeholder="e.g. Lead a tech startup..." />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <FormField label="Budget Range" isDark={isDark}>
                                        <InputField isDark={isDark} value={careerForm.budget} onChange={e => setCareerForm({ ...careerForm, budget: e.target.value })} placeholder="e.g. $20k/year, flexible" />
                                    </FormField>
                                    <FormField label="Preferred Country" isDark={isDark}>
                                        <InputField isDark={isDark} value={careerForm.country} onChange={e => setCareerForm({ ...careerForm, country: e.target.value })} placeholder="e.g. USA, Germany, open..." />
                                    </FormField>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center disabled:opacity-50 group">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Architect My Career Path
                                            <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                            {careerResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} animate-slide-up tilt-card perspective-1000`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} translate-z-10`}>
                                        <Sparkles className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-amber-500'}`} />
                                        <h3 className="text-lg font-bold">Your Career Roadmap</h3>
                                    </div>
                                    <div className={`prose ${isDark ? 'prose-invert text-slate-300' : 'prose-slate'} max-w-none prose-sm leading-relaxed translate-z-10`}>
                                        <MarkdownBlock text={careerResult} isDark={isDark} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ COLLEGE FINDER TAB (ENHANCED) ═══ */}
                    {activeTab === 'college' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleCollegeSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-cyan-500" />
                                <div className="flex items-center gap-3 mb-6">
                                    <GraduationCap className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                    <div>
                                        <h3 className="text-lg font-bold">AI College Matcher</h3>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Safety, Target & Dream schools matched to your profile</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="GPA / Marks" isDark={isDark}>
                                        <InputField isDark={isDark} value={collegeForm.gpa} onChange={e => setCollegeForm({ ...collegeForm, gpa: e.target.value })} required placeholder="e.g. 3.9/4.0 or 95%" />
                                    </FormField>
                                    <FormField label="Test Scores" isDark={isDark}>
                                        <InputField isDark={isDark} value={collegeForm.testScores} onChange={e => setCollegeForm({ ...collegeForm, testScores: e.target.value })} placeholder="e.g. SAT 1520, GRE 330" />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Target Major" isDark={isDark}>
                                        <InputField isDark={isDark} value={collegeForm.major} onChange={e => setCollegeForm({ ...collegeForm, major: e.target.value })} required placeholder="e.g. Computer Science" />
                                    </FormField>
                                    <FormField label="Study Level" isDark={isDark}>
                                        <SelectField isDark={isDark} value={collegeForm.studyLevel} onChange={e => setCollegeForm({ ...collegeForm, studyLevel: e.target.value })} options={[
                                            { value: 'Undergraduate', label: 'Undergraduate (Bachelor\'s)' },
                                            { value: 'Graduate', label: 'Graduate (Master\'s)' },
                                            { value: 'PhD', label: 'PhD / Doctoral' },
                                            { value: 'MBA', label: 'MBA' },
                                        ]} />
                                    </FormField>
                                </div>
                                <FormField label="Extracurriculars & Achievements" isDark={isDark}>
                                    <TextareaField isDark={isDark} value={collegeForm.extracurriculars} onChange={e => setCollegeForm({ ...collegeForm, extracurriculars: e.target.value })} required rows="3" placeholder="Projects, leadership, competitions, publications..." />
                                </FormField>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
                                    <FormField label="Preferred Country" isDark={isDark}>
                                        <SelectField isDark={isDark} value={collegeForm.country} onChange={e => setCollegeForm({ ...collegeForm, country: e.target.value })} options={[
                                            { value: 'Any', label: 'Any Country' },
                                            { value: 'USA', label: '🇺🇸 United States' }, { value: 'UK', label: '🇬🇧 United Kingdom' },
                                            { value: 'Canada', label: '🇨🇦 Canada' }, { value: 'Australia', label: '🇦🇺 Australia' },
                                            { value: 'Germany', label: '🇩🇪 Germany' }, { value: 'India', label: '🇮🇳 India' },
                                            { value: 'Singapore', label: '🇸🇬 Singapore' }, { value: 'Netherlands', label: '🇳🇱 Netherlands' },
                                            { value: 'Japan', label: '🇯🇵 Japan' }, { value: 'Other', label: 'Other' },
                                        ]} />
                                    </FormField>
                                    <FormField label="Preferred Location" isDark={isDark}>
                                        <InputField isDark={isDark} value={collegeForm.location} onChange={e => setCollegeForm({ ...collegeForm, location: e.target.value })} placeholder="e.g. East Coast, Berlin" />
                                    </FormField>
                                    <FormField label="Budget (per year)" isDark={isDark}>
                                        <InputField isDark={isDark} value={collegeForm.budget} onChange={e => setCollegeForm({ ...collegeForm, budget: e.target.value })} placeholder="e.g. $40k, flexible" />
                                    </FormField>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center disabled:opacity-50">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Match My Colleges"}
                                </button>
                            </form>
                            {collegeResult && (
                                <div className={`rounded-[40px] p-8 border glass-3d glow-border animate-page-enter
                                ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-warm-200/50 shadow-2xl'}
                            `}>
                                    <div className={`flex items-center gap-4 mb-8 pb-6 border-b ${isDark ? 'border-white/[0.08]' : 'border-warm-200/50'}`}>
                                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                                            <Lightbulb className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">University Analysis</h3>
                                            <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em]">Data-Driven Recommendations</p>
                                        </div>
                                    </div>
                                    <div className={`prose ${isDark ? 'prose-invert text-slate-300' : 'prose-slate'} max-w-none prose-sm leading-relaxed`}>
                                        <MarkdownBlock text={collegeResult} isDark={isDark} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ SCHOLARSHIP FINDER TAB (NEW) ═══ */}
                    {activeTab === 'scholarship' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleScholarshipSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-500 to-orange-500" />
                                <div className="flex items-center gap-3 mb-6">
                                    <Trophy className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                                    <div>
                                        <h3 className="text-lg font-bold">AI Scholarship Finder</h3>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Find scholarships you actually qualify for</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Your Nationality" isDark={isDark}>
                                        <InputField isDark={isDark} value={scholarshipForm.nationality} onChange={e => setScholarshipForm({ ...scholarshipForm, nationality: e.target.value })} required placeholder="e.g. Indian, Nigerian, Chinese..." />
                                    </FormField>
                                    <FormField label="GPA / Academic Score" isDark={isDark}>
                                        <InputField isDark={isDark} value={scholarshipForm.gpa} onChange={e => setScholarshipForm({ ...scholarshipForm, gpa: e.target.value })} required placeholder="e.g. 3.8/4.0 or 92%" />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Field of Study" isDark={isDark}>
                                        <InputField isDark={isDark} value={scholarshipForm.fieldOfStudy} onChange={e => setScholarshipForm({ ...scholarshipForm, fieldOfStudy: e.target.value })} required placeholder="e.g. Engineering, Medicine, Arts..." />
                                    </FormField>
                                    <FormField label="Target Country" isDark={isDark}>
                                        <InputField isDark={isDark} value={scholarshipForm.targetCountry} onChange={e => setScholarshipForm({ ...scholarshipForm, targetCountry: e.target.value })} placeholder="e.g. USA, Germany, any..." />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Financial Need" isDark={isDark}>
                                        <SelectField isDark={isDark} value={scholarshipForm.financialNeed} onChange={e => setScholarshipForm({ ...scholarshipForm, financialNeed: e.target.value })} options={[
                                            { value: 'High', label: 'High — Need full funding' },
                                            { value: 'Medium', label: 'Medium — Need partial support' },
                                            { value: 'Low', label: 'Low — Merit-based preferred' },
                                        ]} />
                                    </FormField>
                                    <FormField label="Key Achievements" isDark={isDark}>
                                        <InputField isDark={isDark} value={scholarshipForm.achievements} onChange={e => setScholarshipForm({ ...scholarshipForm, achievements: e.target.value })} placeholder="e.g. Science Olympiad Gold, Published paper..." />
                                    </FormField>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all flex justify-center items-center disabled:opacity-50 group">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Find My Scholarships
                                            <Trophy className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                            {scholarshipResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} animate-slide-up`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                        <Trophy className={`w-5 h-5 text-amber-500`} />
                                        <h3 className="text-lg font-bold">Scholarship Matches</h3>
                                    </div>
                                    <div className={`prose ${isDark ? 'prose-invert text-slate-300' : 'prose-slate'} max-w-none prose-sm leading-relaxed`}>
                                        <MarkdownBlock text={scholarshipResult} isDark={isDark} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ COMPARE COLLEGES TAB (NEW) ═══ */}
                    {activeTab === 'compare' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleCompareSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-green-500 to-emerald-500" />
                                <div className="flex items-center gap-3 mb-6">
                                    <Activity className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                    <div>
                                        <h3 className="text-lg font-bold">Head-to-Head Comparison</h3>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Compare 2-3 colleges with data-driven analysis</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <FormField label="College 1" isDark={isDark}>
                                        <InputField isDark={isDark} value={compareForm.college1} onChange={e => setCompareForm({ ...compareForm, college1: e.target.value })} required placeholder="e.g. MIT" />
                                    </FormField>
                                    <FormField label="College 2" isDark={isDark}>
                                        <InputField isDark={isDark} value={compareForm.college2} onChange={e => setCompareForm({ ...compareForm, college2: e.target.value })} required placeholder="e.g. Stanford" />
                                    </FormField>
                                    <FormField label="College 3 (optional)" isDark={isDark}>
                                        <InputField isDark={isDark} value={compareForm.college3} onChange={e => setCompareForm({ ...compareForm, college3: e.target.value })} placeholder="e.g. CMU" />
                                    </FormField>
                                </div>
                                <FormField label="Focus Criteria" isDark={isDark}>
                                    <SelectField isDark={isDark} value={compareForm.criteria} onChange={e => setCompareForm({ ...compareForm, criteria: e.target.value })} options={[
                                        { value: 'Overall', label: '📊 Overall Comparison' },
                                        { value: 'Academics', label: '🎓 Academic Excellence' },
                                        { value: 'ROI', label: '💰 Cost & ROI' },
                                        { value: 'Career', label: '💼 Career Outcomes' },
                                        { value: 'StudentLife', label: '🏠 Student Life & Culture' },
                                        { value: 'Research', label: '🔬 Research Opportunities' },
                                    ]} />
                                </FormField>
                                <button type="submit" disabled={isLoading} className="w-full py-4 mt-4 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all flex justify-center items-center disabled:opacity-50 group">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Compare Strategic Profiles
                                            <Activity className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                            {compareResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} animate-slide-up`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                        <Activity className={`w-5 h-5 text-green-500`} />
                                        <h3 className="text-lg font-bold">Comparison Analysis</h3>
                                    </div>
                                    <div className={`prose ${isDark ? 'prose-invert text-slate-300' : 'prose-slate'} max-w-none prose-sm leading-relaxed`}>
                                        <MarkdownBlock text={compareResult} isDark={isDark} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ ESSAY REVIEW TAB (NEW) ═══ */}
                    {activeTab === 'essay' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleEssaySubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-rose-500 to-pink-500" />
                                <div className="flex items-center gap-3 mb-6">
                                    <BookOpen className={`w-6 h-6 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                                    <div>
                                        <h3 className="text-lg font-bold">AI Essay & SOP Reviewer</h3>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Get expert feedback from an AI trained on 50,000+ essays</p>
                                    </div>
                                </div>
                                <FormField label="Essay Type" isDark={isDark}>
                                    <SelectField isDark={isDark} value={essayType} onChange={e => setEssayType(e.target.value)} options={[
                                        { value: 'SOP', label: 'Statement of Purpose (SOP)' },
                                        { value: 'Personal Statement', label: 'Personal Statement' },
                                        { value: 'Common App Essay', label: 'Common App Essay' },
                                        { value: 'Supplemental Essay', label: 'Supplemental Essay' },
                                        { value: 'Scholarship Essay', label: 'Scholarship Essay' },
                                        { value: 'LOR Draft', label: 'Letter of Recommendation Draft' },
                                    ]} />
                                </FormField>
                                <div className="mt-4">
                                    <FormField label="Paste Your Essay / SOP" isDark={isDark}>
                                        <TextareaField isDark={isDark} value={essayText} onChange={e => setEssayText(e.target.value)} required rows="10" placeholder="Paste your full essay or SOP text here for AI review..." />
                                    </FormField>
                                </div>
                                <button type="submit" disabled={isLoading || !essayText.trim()} className="w-full py-4 mt-4 bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-0.5 transition-all flex justify-center items-center disabled:opacity-50 group">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Submit for Expert Review
                                            <Sparkles className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                            {essayResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} animate-slide-up`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                        <BookOpen className={`w-5 h-5 text-rose-500`} />
                                        <h3 className="text-lg font-bold">Expert Review</h3>
                                    </div>
                                    <div className={`prose ${isDark ? 'prose-invert text-slate-300' : 'prose-slate'} max-w-none prose-sm leading-relaxed`}>
                                        <MarkdownBlock text={essayResult} isDark={isDark} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ CHAT TAB ═══ */}
                    {activeTab === 'chat' && (
                        <div className={`animate-fade-in flex flex-col glass-panel rounded-3xl shadow-2xl border ${isDark ? 'border-white/10' : 'border-gray-200'} h-[75vh] md:h-[600px] overflow-hidden`}>
                            <div className={`p-3 border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white/50'} flex items-center gap-3`}>
                                <MessageSquare className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                <span className="font-bold text-sm">Admissions AI Assistant</span>
                                <span className={`text-[10px] ml-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ask anything about colleges, visas, deadlines...</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-br-none'
                                            : `${isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white border-gray-200 shadow-inner'} border rounded-tl-none`
                                            }`}>
                                            {msg.role === 'user' ? msg.text : (
                                                <MarkdownBlock text={msg.text} isDark={isDark} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} p-3 rounded-2xl rounded-tl-none border flex items-center gap-2`}>
                                            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleChatSubmit} className={`p-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border-t flex gap-2`}>
                                <input
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    placeholder="Ask anything about colleges, admissions, visas..."
                                    className={`flex-1 p-3 rounded-xl text-sm ${isDark ? 'bg-gray-800/50 border-white/10 text-white' : 'bg-white border-gray-200'} outline-none focus:border-indigo-500 border transition-all`}
                                />
                                <button type="submit" disabled={isLoading || !chatInput.trim()} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CollegeCompass;
