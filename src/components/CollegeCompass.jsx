import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, MessageSquare, Loader2, Lightbulb, Link, Globe, Send, Sparkles, Brain, Trophy, MapPin, GraduationCap, Map, Crown, BookOpen, Target, Calendar, ChevronRight, Check, Activity, FileText, Download, AlertTriangle, Award } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { GROQ_API_URL, formatGroqPayload } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ───────────────────────────────────────────────
// Markdown Renderer — shared across all tabs
// ───────────────────────────────────────────────
const MarkdownBlock = ({ text }) => (
    <div className="space-y-1">
        {text.split('\n').map((line, idx) => {
            if (line.startsWith('## ')) return <h2 key={idx} className={`text-lg font-bold mt-4 mb-2 text-theme-primary`}>{line.replace('## ', '')}</h2>;
            if (line.startsWith('### ')) return <h3 key={idx} className={`text-md font-bold mt-3 mb-1 text-theme-text`}>{line.replace('### ', '')}</h3>;
            if (line.includes('**')) {
                const parts = line.split(/\*\*(.+?)\*\*/g);
                return <p key={idx} className="my-1.5 text-[15px]">{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-theme-primary">{p}</strong> : p)}</p>;
            }
            if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                return <div key={idx} className="flex gap-2 my-1 ml-2 text-[15px]"><span className="text-theme-primary">•</span><span>{line.trim().replace(/^[-•]\s*/, '')}</span></div>;
            }
            if (line.trim()) return <p key={idx} className="my-1.5 text-[15px] text-theme-text">{line}</p>;
            return <div key={idx} className="h-1.5" />;
        })}
    </div>
);

// Input field helper
const FormField = ({ label, children }) => (
    <div className="space-y-2">
        <label className={`text-[10px] font-black uppercase tracking-widest text-theme-muted ml-1`}>{label}</label>
        {children}
    </div>
);

const InputField = (props) => (
    <input
        {...props}
        className={`w-full p-4 rounded-[18px] text-sm font-medium outline-none transition-all duration-300 bg-theme-surface border-theme-border text-theme-text placeholder-theme-muted focus:border-theme-primary focus:shadow-[0_0_20px_var(--theme-primary)] opacity-80 border focus:opacity-100`}
    />
);

const TextareaField = (props) => (
    <textarea
        {...props}
        className={`w-full p-4 rounded-[18px] text-sm font-medium resize-none transition-all duration-300 bg-theme-surface border-theme-border text-theme-text placeholder-theme-muted focus:border-theme-primary focus:shadow-[0_0_20px_var(--theme-primary)] opacity-80 border focus:opacity-100`}
    />
);

const SelectField = ({ options, ...props }) => (
    <select
        {...props}
        className={`w-full p-4 rounded-xl text-sm bg-theme-surface border-theme-border text-theme-text border focus:border-theme-primary outline-none transition-all`}
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

    // SOP/Essay Expert (merged: review + coach + grader)
    const [essayPrompt, setEssayPrompt] = useState(''); // NEW for auto-generation
    const [essayText, setEssayText] = useState('');
    const [essayType, setEssayType] = useState('Personal Statement');
    const [essaySchool, setEssaySchool] = useState('');
    const [essayWordLimit, setEssayWordLimit] = useState('');
    const [essayResult, setEssayResult] = useState('');
    const [essayScore, setEssayScore] = useState(0);
    const [essayIteration, setEssayIteration] = useState(0);
    const [essayPhase, setEssayPhase] = useState('coach'); // 'coach' | 'grader' | 'generate'
    const essayPdfRef = useRef(null);

    // ─── Follow-up inputs for existing tabs ───
    const [careerFollowup, setCareerFollowup] = useState('');
    const [collegeFollowup, setCollegeFollowup] = useState('');

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
            ...formatGroqPayload(userQuery, systemPrompt),
            model: "llama-3.3-70b-versatile"
        };
        const result = await retryableFetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (result.error) {
            throw new Error(result.error);
        }
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

    // ─── ESSAY EXPERT (Auto-Generate Draft) ───
    const handleGenerateEssay = async () => {
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setEssayPhase('generate');
        setEssayResult("Generating initial draft based on your profile context...");
        try {
            const contextStr = [
                careerResult ? `--- CAREER ROADMAP & PROFILE ---\n${careerResult}` : '',
                collegeResult ? `--- TARGET COLLEGES & ANALYSIS ---\n${collegeResult}` : '',
                compareResult ? `--- COLLEGE COMPARISON ---\n${compareResult}` : '',
            ].filter(Boolean).join('\n\n');

            const text = await callAI(
                `Target School(s): ${essaySchool || 'Not specified'}\nEssay Type: ${essayType}\nWord Limit: ${essayWordLimit || 'Not specified'}\n\n${contextStr}\n\n--- STUDENT ADDITIONAL INSTRUCTIONS ---\n${essayPrompt || 'None'}\n--- END INSTRUCTIONS ---\n\nWrite the essay based ONLY on the context above.`,
                `You are an elite college admissions essay writer using the PASS, COFFEE, and NARRATIVE frameworks. 

You MUST WRITE the actual essay draft based on the student's profile context provided.
- Do NOT provide coaching feedback. Write the ESSAY.
- Adopt an authentic 16-17 year old extremely capable but emotionally honest voice (avoid generic "application voice").
- Incorporate specific details from their profile (AI, sports, etc.).
- Ensure strong hook, narrative flow, and memorable conclusion.
- Follow the specific prompt and word limit if provided.
- ONLY output the essay text itself, no meta-commentary.`
            );
            setEssayText(text);
            setEssayResult("Draft generated successfully! You can now review it below, make manual edits, and then click 'Coach Review' or 'Harsh Grade'.");
            incrementUsage('college-compass');
        } catch (err) { setEssayResult("Error generating draft: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── ESSAY EXPERT (MERGED: Coach + Grader) ───
    const handleEssaySubmit = async (e) => {
        e?.preventDefault();
        if (!essayText.trim()) return;
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setEssayResult('');
        setEssayPhase('coach');
        try {
            const text = await callAI(
                `Target School(s): ${essaySchool || 'Not specified'}\nEssay Type: ${essayType}\nWord Limit: ${essayWordLimit || 'Not specified'}\n\n--- STUDENT DRAFT ---\n${essayText}\n--- END DRAFT ---\n\nAnalyze this student's essay draft:`,
                `You are an elite college admissions essay coach trained on the exact frameworks from the Ultimate Mentor system (PASS, COFFEE, NARRATIVE, CHOICE, UNIQUE, Black Coffee Theory, etc.).

You MUST respond in this exact structure:
1. Overall Score (X/10) + 1-sentence summary
2. ✅ Strengths (3–5 bullets with quotes)
3. ⚠️ Weaknesses / Red Flags (3–6 bullets, quote problem sentences)
4. 📝 Structural Analysis (hook, flow, transitions, pacing, conclusion)
5. 🎯 Content Feedback (authenticity, narrative wiring, theme clarity)
6. ✍️ Suggested Rewrites (3–6 before/after rewrites)
7. 💡 Pro Tips / Next Steps (2–5 actionable improvements)

Tone: Direct, encouraging, zero fluff. Call out clichés and vagueness immediately. Preserve student's voice.
Start with: "College Compass Essay Coach — analyzing your draft…"`
            );
            setEssayResult(text);
            incrementUsage('college-compass');
        } catch (err) { setEssayResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── HARSH GRADER (within Essay Expert) ───
    const handleGraderSubmit = async () => {
        if (!essayText.trim()) return;
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setEssayPhase('grader');
        const iteration = essayIteration + 1;
        setEssayIteration(iteration);
        try {
            const text = await callAI(
                `ITERATION ${iteration}. Grade this essay BRUTALLY. Attempt #${iteration}.\n\n--- STUDENT ESSAY ---\n${essayText}\n--- END ---`,
                `You are the HARSHEST college essay grader. 10x STRICTER than admissions. Rules:
- BLUNT and MERCILESS. No sugar-coating.
- 10/10 = GUARANTEES admission to ANY school. Anything less gets torn apart.
- ANY cliché, generic phrasing, weak hook, unclear theme = DROP score severely.
- Quote EXACT weak sentences. NEVER give above 7/10 unless exceptional.
- Iteration 2+: acknowledge improvement but find NEW issues.

Response format:
## 💀 SCORE: X/10
One brutal sentence.
## 🔥 What's Wrong (be savage)
## 💪 What Survived
## 📌 Non-Negotiable Fixes
## ⚡ Verdict
"RESUBMIT" if under 10. "APPROVED FOR DOWNLOAD" if 10/10.

Start: "Essay Grader — Iteration ${iteration} — Let's see what you've got…"`
            );
            setEssayResult(text);
            const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
            if (scoreMatch) setEssayScore(parseInt(scoreMatch[1]));
            incrementUsage('college-compass');
        } catch (err) { setEssayResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── PDF DOWNLOAD ───
    const handlePdfDownload = async () => {
        const element = essayPdfRef.current;
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('Aurem_Perfect_Essay.pdf');
        } catch (err) { console.error('PDF generation failed:', err); }
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
                `You are the world's top AI College Admissions Counselor. Be specific, data-driven, and actionable. Use Markdown headers and emojis. Keep responses under 400 words unless depth is needed.`
            );
            setChatHistory(prev => [...prev, { role: 'model', text }]);
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        }
        finally { setIsLoading(false); }
    };

    // ─── FOLLOW-UP HANDLER ───
    const handleFollowup = async (context, question, setResult, setFollowup) => {
        if (!question.trim()) return;
        setIsLoading(true);
        try {
            const text = await callAI(
                `Context:\n\n${context}\n\nStudent asks: "${question}"\n\nProvide a focused follow-up response.`,
                `You are a world-class college admissions and career advisor. Be direct and specific. Use Markdown.`
            );
            setResult(prev => prev + '\n\n---\n\n## 💬 Your Follow-up\n> ' + question + '\n\n' + text);
            setFollowup('');
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    // ─── TAB DEFINITIONS ───
    const TABS = [
        { id: 'career', icon: <Brain className="w-4 h-4" />, label: 'Career AI' },
        { id: 'college', icon: <GraduationCap className="w-4 h-4" />, label: 'College Finder' },
        { id: 'scholarship', icon: <Trophy className="w-4 h-4" />, label: 'Scholarships' },
        { id: 'compare', icon: <Activity className="w-4 h-4" />, label: 'Compare' },
        { id: 'essay', icon: <BookOpen className="w-4 h-4" />, label: 'Essay Expert' },
        { id: 'chat', icon: <MessageSquare className="w-4 h-4" />, label: 'Counselor' },
    ];

    return (
        <div className={`flex flex-col h-full bg-theme-bg text-theme-text relative overflow-hidden transition-colors duration-300`}>
            {/* Background */}
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-theme-primary opacity-10 rounded-full blur-[120px] -z-10 animate-pulse`} />
            <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] bg-theme-secondary opacity-10 rounded-full blur-[120px] -z-10 animate-pulse delay-1000`} />

            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between z-30 glass-3d-elevated border-b rounded-b-3xl mx-4 mt-4 bg-theme-surface border-theme-border shadow-2xl`}>
                <div className="flex items-center gap-4 group cursor-default">
                    <div className={`p-3 rounded-2xl bg-theme-surface border border-theme-border shadow-xl shadow-theme-border/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                        <GraduationCap className="w-6 h-6 text-theme-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black bg-gradient-to-r from-theme-secondary via-theme-primary to-theme-secondary bg-clip-text text-transparent uppercase tracking-tightest">
                                Admissions Pilot
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-theme-bg text-theme-primary text-[10px] font-black uppercase tracking-widest border border-theme-border">Neural Core v3.0</span>
                        </div>
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] mt-0.5">Global Admissions Intelligence</p>
                    </div>
                </div>
            </div>

            {/* Sub-Nav Tabs */}
            <div className="px-6 py-4 flex items-center justify-center">
                <div className={`flex flex-wrap items-center justify-center p-2 rounded-[32px] glass-3d-elevated bg-theme-surface border-theme-border shadow-md`}>
                    {[
                        { id: 'career', label: 'Career Planner', icon: Target },
                        { id: 'college', label: 'University Hunt', icon: Globe },
                        { id: 'scholarship', label: 'Aid Finder', icon: Trophy },
                        { id: 'compare', label: 'Compare Hub', icon: Activity },
                        { id: 'essay', label: 'Essay Expert', icon: FileText },
                        { id: 'chat', label: 'Counselor Chat', icon: MessageSquare }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative group
                                ${activeTab === tab.id
                                    ? `bg-theme-bg border border-theme-primary text-theme-text shadow-xl shadow-theme-primary/20 scale-[1.08] -translate-y-1`
                                    : 'text-theme-muted hover:text-theme-primary hover:bg-theme-bg/50'}
                            `}
                        >
                            <tab.icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110 rotate-12 text-theme-primary' : 'group-hover:scale-110'}`} />
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
                            <form onSubmit={handleCareerSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-theme-primary to-theme-secondary" />
                                <div className="flex items-center gap-3 mb-6">
                                    <Brain className={`w-6 h-6 text-theme-primary`} />
                                    <div>
                                        <h3 className="text-lg font-bold text-theme-text">AI Career Architect</h3>
                                        <p className={`text-xs text-theme-muted`}>Discover careers that match your unique DNA</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Hobbies & Interests">
                                        <InputField name="hobbies" value={careerForm.hobbies} onChange={e => setCareerForm({ ...careerForm, hobbies: e.target.value })} required placeholder="e.g. coding, robotics, painting..." />
                                    </FormField>
                                    <FormField label="Deep Passions">
                                        <InputField name="passion" value={careerForm.passion} onChange={e => setCareerForm({ ...careerForm, passion: e.target.value })} required placeholder="e.g. climate change, AI ethics..." />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Current Study Field">
                                        <InputField value={careerForm.field} onChange={e => setCareerForm({ ...careerForm, field: e.target.value })} required placeholder="e.g. Computer Science, Arts..." />
                                    </FormField>
                                    <FormField label="Future Aspirations">
                                        <InputField value={careerForm.aspirations} onChange={e => setCareerForm({ ...careerForm, aspirations: e.target.value })} required placeholder="e.g. Lead a tech startup..." />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <FormField label="Budget Range">
                                        <InputField value={careerForm.budget} onChange={e => setCareerForm({ ...careerForm, budget: e.target.value })} placeholder="e.g. $20k/year, flexible" />
                                    </FormField>
                                    <FormField label="Preferred Country">
                                        <InputField value={careerForm.country} onChange={e => setCareerForm({ ...careerForm, country: e.target.value })} placeholder="e.g. USA, Germany, open..." />
                                    </FormField>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-theme-primary text-theme-bg rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_var(--theme-primary)] opacity-90 hover:opacity-100 hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center disabled:opacity-50 group">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Architect My Career Path
                                            <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                            {careerResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border animate-slide-up tilt-card perspective-1000`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-theme-border translate-z-10`}>
                                        <Sparkles className={`w-5 h-5 text-theme-primary`} />
                                        <h3 className="text-lg font-bold text-theme-text">Your Career Roadmap</h3>
                                    </div>
                                    <div className={`prose max-w-none prose-sm leading-relaxed text-theme-text translate-z-10`}>
                                        <MarkdownBlock text={careerResult} />
                                    </div>

                                    {/* Follow-up Input */}
                                    <div className={`mt-6 pt-4 border-t border-theme-border`}>
                                        <p className="text-xs font-black text-theme-muted uppercase tracking-widest mb-2">💬 What do you think?</p>
                                        <div className="flex gap-2">
                                            <input
                                                value={careerFollowup}
                                                onChange={e => setCareerFollowup(e.target.value)}
                                                placeholder="Ask a follow-up or share your thoughts..."
                                                className="flex-1 p-3 rounded-xl text-sm bg-theme-bg border-theme-border text-theme-text outline-none focus:border-theme-primary border transition-all"
                                                onKeyDown={e => e.key === 'Enter' && handleFollowup(careerResult, careerFollowup, setCareerResult, setCareerFollowup)}
                                            />
                                            <button
                                                onClick={() => handleFollowup(careerResult, careerFollowup, setCareerResult, setCareerFollowup)}
                                                disabled={isLoading || !careerFollowup.trim()}
                                                className="p-3 bg-theme-primary text-theme-bg rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Conditional Navigation */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button onClick={() => setActiveTab('college')} className="py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                            College Needed → Hunt <ChevronRight className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setActiveTab('chat')} className="py-3 bg-theme-surface border border-theme-border text-theme-text rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                            No College → Counselor <MessageSquare className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => { setCareerResult(''); setCareerForm({ hobbies: '', passion: '', field: '', aspirations: '', budget: '', country: '' }); }} className="py-3 bg-theme-bg border border-theme-border text-theme-muted rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-theme-text transition-all">
                                            I'm Done — Exit ✕
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ COLLEGE FINDER TAB (ENHANCED) ═══ */}
                    {activeTab === 'college' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleCollegeSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-theme-primary to-theme-secondary" />
                                <div className="flex items-center gap-3 mb-6">
                                    <GraduationCap className={`w-6 h-6 text-theme-primary`} />
                                    <div>
                                        <h3 className="text-lg font-bold text-theme-text">AI College Matcher</h3>
                                        <p className={`text-xs text-theme-muted`}>Safety, Target & Dream schools matched to your profile</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="GPA / Marks">
                                        <InputField value={collegeForm.gpa} onChange={e => setCollegeForm({ ...collegeForm, gpa: e.target.value })} required placeholder="e.g. 3.9/4.0 or 95%" />
                                    </FormField>
                                    <FormField label="Test Scores">
                                        <InputField value={collegeForm.testScores} onChange={e => setCollegeForm({ ...collegeForm, testScores: e.target.value })} placeholder="e.g. SAT 1520, GRE 330" />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Target Major">
                                        <InputField value={collegeForm.major} onChange={e => setCollegeForm({ ...collegeForm, major: e.target.value })} required placeholder="e.g. Computer Science" />
                                    </FormField>
                                    <FormField label="Study Level">
                                        <SelectField value={collegeForm.studyLevel} onChange={e => setCollegeForm({ ...collegeForm, studyLevel: e.target.value })} options={[
                                            { value: 'Undergraduate', label: 'Undergraduate (Bachelor\'s)' },
                                            { value: 'Graduate', label: 'Graduate (Master\'s)' },
                                            { value: 'PhD', label: 'PhD / Doctoral' },
                                            { value: 'MBA', label: 'MBA' },
                                        ]} />
                                    </FormField>
                                </div>
                                <FormField label="Extracurriculars & Achievements">
                                    <TextareaField value={collegeForm.extracurriculars} onChange={e => setCollegeForm({ ...collegeForm, extracurriculars: e.target.value })} required rows="3" placeholder="Projects, leadership, competitions, publications..." />
                                </FormField>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
                                    <FormField label="Preferred Country">
                                        <SelectField value={collegeForm.country} onChange={e => setCollegeForm({ ...collegeForm, country: e.target.value })} options={[
                                            { value: 'Any', label: 'Any Country' },
                                            { value: 'USA', label: '🇺🇸 United States' }, { value: 'UK', label: '🇬🇧 United Kingdom' },
                                            { value: 'Canada', label: '🇨🇦 Canada' }, { value: 'Australia', label: '🇦🇺 Australia' },
                                            { value: 'Germany', label: '🇩🇪 Germany' }, { value: 'India', label: '🇮🇳 India' },
                                            { value: 'Singapore', label: '🇸🇬 Singapore' }, { value: 'Netherlands', label: '🇳🇱 Netherlands' },
                                            { value: 'Japan', label: '🇯🇵 Japan' }, { value: 'Other', label: 'Other' },
                                        ]} />
                                    </FormField>
                                    <FormField label="Preferred Location">
                                        <InputField value={collegeForm.location} onChange={e => setCollegeForm({ ...collegeForm, location: e.target.value })} placeholder="e.g. East Coast, Berlin" />
                                    </FormField>
                                    <FormField label="Budget (per year)">
                                        <InputField value={collegeForm.budget} onChange={e => setCollegeForm({ ...collegeForm, budget: e.target.value })} placeholder="e.g. $40k, flexible" />
                                    </FormField>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-theme-primary text-theme-bg rounded-2xl font-bold text-sm uppercase tracking-widest shadow-[0_0_20px_var(--theme-primary)] opacity-90 hover:opacity-100 transition-all flex justify-center items-center disabled:opacity-50">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Match My Colleges"}
                                </button>
                            </form>
                            {collegeResult && (
                                <div className={`rounded-[40px] p-8 border glass-3d glow-border animate-page-enter bg-theme-surface border-theme-border
                            `}>
                                    <div className={`flex items-center gap-4 mb-8 pb-6 border-b border-theme-border`}>
                                        <div className="p-3 rounded-2xl bg-theme-bg text-theme-primary border border-theme-border">
                                            <Lightbulb className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-theme-text">University Analysis</h3>
                                            <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em]">Data-Driven Recommendations</p>
                                        </div>
                                    </div>
                                    <div className={`prose max-w-none prose-sm leading-relaxed text-theme-text`}>
                                        <MarkdownBlock text={collegeResult} />
                                    </div>

                                    {/* Follow-up Input */}
                                    <div className={`mt-6 pt-4 border-t border-theme-border`}>
                                        <p className="text-xs font-black text-theme-muted uppercase tracking-widest mb-2">💬 What do you think?</p>
                                        <div className="flex gap-2">
                                            <input
                                                value={collegeFollowup}
                                                onChange={e => setCollegeFollowup(e.target.value)}
                                                placeholder="Ask a follow-up about these colleges..."
                                                className="flex-1 p-3 rounded-xl text-sm bg-theme-bg border-theme-border text-theme-text outline-none focus:border-theme-primary border transition-all"
                                                onKeyDown={e => e.key === 'Enter' && handleFollowup(collegeResult, collegeFollowup, setCollegeResult, setCollegeFollowup)}
                                            />
                                            <button
                                                onClick={() => handleFollowup(collegeResult, collegeFollowup, setCollegeResult, setCollegeFollowup)}
                                                disabled={isLoading || !collegeFollowup.trim()}
                                                className="p-3 bg-theme-primary text-theme-bg rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Branching Navigation */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button onClick={() => setActiveTab('compare')} className="py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                            Confused? Compare → <Activity className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setActiveTab('essay')} className="py-3 bg-theme-surface border border-theme-primary text-theme-primary rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                            Skip to Essays → <FileText className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setActiveTab('chat')} className="py-3 bg-theme-surface border border-theme-border text-theme-text rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                            Talk to Counselor <MessageSquare className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ SCHOLARSHIP FINDER TAB (NEW) ═══ */}
                    {activeTab === 'scholarship' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleScholarshipSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-theme-primary to-theme-secondary" />
                                <div className="flex items-center gap-3 mb-6">
                                    <Trophy className={`w-6 h-6 text-theme-primary`} />
                                    <div>
                                        <h3 className="text-lg font-bold text-theme-text">AI Scholarship Finder</h3>
                                        <p className={`text-xs text-theme-muted`}>Find scholarships you actually qualify for</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Your Nationality">
                                        <InputField value={scholarshipForm.nationality} onChange={e => setScholarshipForm({ ...scholarshipForm, nationality: e.target.value })} required placeholder="e.g. Indian, Nigerian, Chinese..." />
                                    </FormField>
                                    <FormField label="GPA / Academic Score">
                                        <InputField value={scholarshipForm.gpa} onChange={e => setScholarshipForm({ ...scholarshipForm, gpa: e.target.value })} required placeholder="e.g. 3.8/4.0 or 92%" />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Field of Study">
                                        <InputField value={scholarshipForm.fieldOfStudy} onChange={e => setScholarshipForm({ ...scholarshipForm, fieldOfStudy: e.target.value })} required placeholder="e.g. Engineering, Medicine, Arts..." />
                                    </FormField>
                                    <FormField label="Target Country">
                                        <InputField value={scholarshipForm.targetCountry} onChange={e => setScholarshipForm({ ...scholarshipForm, targetCountry: e.target.value })} placeholder="e.g. USA, Germany, any..." />
                                    </FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Financial Need">
                                        <SelectField value={scholarshipForm.financialNeed} onChange={e => setScholarshipForm({ ...scholarshipForm, financialNeed: e.target.value })} options={[
                                            { value: 'High', label: 'High — Need full funding' },
                                            { value: 'Medium', label: 'Medium — Need partial support' },
                                            { value: 'Low', label: 'Low — Merit-based preferred' },
                                        ]} />
                                    </FormField>
                                    <FormField label="Key Achievements">
                                        <InputField value={scholarshipForm.achievements} onChange={e => setScholarshipForm({ ...scholarshipForm, achievements: e.target.value })} placeholder="e.g. Science Olympiad Gold, Published paper..." />
                                    </FormField>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-theme-primary text-theme-bg rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_var(--theme-primary)] opacity-90 hover:opacity-100 hover:-translate-y-0.5 transition-all flex justify-center items-center disabled:opacity-50 group">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Find My Scholarships
                                            <Trophy className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                            {scholarshipResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border animate-slide-up`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-theme-border`}>
                                        <Trophy className={`w-5 h-5 text-theme-primary`} />
                                        <h3 className="text-lg font-bold text-theme-text">Scholarship Matches</h3>
                                    </div>
                                    <div className={`prose max-w-none prose-sm leading-relaxed text-theme-text`}>
                                        <MarkdownBlock text={scholarshipResult} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ COMPARE COLLEGES TAB (NEW) ═══ */}
                    {activeTab === 'compare' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleCompareSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-theme-primary to-theme-secondary" />
                                <div className="flex items-center gap-3 mb-6">
                                    <Activity className={`w-6 h-6 text-theme-primary`} />
                                    <div>
                                        <h3 className="text-lg font-bold text-theme-text">Head-to-Head Comparison</h3>
                                        <p className={`text-xs text-theme-muted`}>Compare 2-3 colleges with data-driven analysis</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <FormField label="College 1">
                                        <InputField value={compareForm.college1} onChange={e => setCompareForm({ ...compareForm, college1: e.target.value })} required placeholder="e.g. MIT" />
                                    </FormField>
                                    <FormField label="College 2">
                                        <InputField value={compareForm.college2} onChange={e => setCompareForm({ ...compareForm, college2: e.target.value })} required placeholder="e.g. Stanford" />
                                    </FormField>
                                    <FormField label="College 3 (optional)">
                                        <InputField value={compareForm.college3} onChange={e => setCompareForm({ ...compareForm, college3: e.target.value })} placeholder="e.g. CMU" />
                                    </FormField>
                                </div>
                                <FormField label="Focus Criteria">
                                    <SelectField value={compareForm.criteria} onChange={e => setCompareForm({ ...compareForm, criteria: e.target.value })} options={[
                                        { value: 'Overall', label: '📊 Overall Comparison' },
                                        { value: 'Academics', label: '🎓 Academic Excellence' },
                                        { value: 'ROI', label: '💰 Cost & ROI' },
                                        { value: 'Career', label: '💼 Career Outcomes' },
                                        { value: 'StudentLife', label: '🏠 Student Life & Culture' },
                                        { value: 'Research', label: '🔬 Research Opportunities' },
                                    ]} />
                                </FormField>
                                <button type="submit" disabled={isLoading} className="w-full py-4 mt-4 bg-theme-primary text-theme-bg rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_var(--theme-primary)] opacity-90 hover:opacity-100 hover:-translate-y-0.5 transition-all flex justify-center items-center disabled:opacity-50 group">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Compare Strategic Profiles
                                            <Activity className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                            {compareResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border animate-slide-up`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-theme-border`}>
                                        <Activity className={`w-5 h-5 text-theme-primary`} />
                                        <h3 className="text-lg font-bold text-theme-text">Comparison Analysis</h3>
                                    </div>
                                    <div className={`prose max-w-none prose-sm leading-relaxed text-theme-text`}>
                                        <MarkdownBlock text={compareResult} />
                                    </div>
                                    {/* Navigate to Essays */}
                                    <button onClick={() => setActiveTab('essay')} className="w-full mt-4 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                        Colleges Decided → Write Essays <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ ESSAY EXPERT TAB (MERGED: Coach + Grader) ═══ */}
                    {activeTab === 'essay' && (
                        <div className="animate-fade-in space-y-6 relative">
                            {/* UNDER DEVELOPMENT OVERLAY */}
                            <div className="absolute inset-0 z-50 bg-theme-bg/60 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center border border-theme-border">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 mb-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                    Under Development
                                </span>
                                <h3 className="text-xl font-serif italic text-theme-text">Temporarily Unavailable</h3>
                                <p className="text-sm text-theme-muted mt-2 max-w-sm text-center">We are currently upgrading our AI models for the Essay Expert. Please check back later.</p>
                            </div>

                            <form onSubmit={handleEssaySubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden opacity-40 pointer-events-none`}>
                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-500 to-rose-500" />
                                <div className="flex items-center gap-3 mb-6">
                                    <Award className={`w-6 h-6 text-amber-500`} />
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-theme-text">Essay Expert</h3>
                                        </div>
                                        <p className={`text-xs text-theme-muted`}>Elite coach + Harsh grader — iterate until perfection</p>
                                    </div>
                                    {essayIteration > 0 && (
                                        <div className="ml-auto flex items-center gap-2">
                                            <span className={`text-xs font-black px-3 py-1 rounded-full ${essayScore >= 8 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                Score: {essayScore}/10 • Iteration #{essayIteration}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <FormField label="Target School(s)">
                                        <InputField value={essaySchool} onChange={e => setEssaySchool(e.target.value)} placeholder="e.g. Stanford, MIT, Oxford" />
                                    </FormField>
                                    <FormField label="Essay Type">
                                        <SelectField value={essayType} onChange={e => setEssayType(e.target.value)} options={[
                                            { value: 'Personal Statement', label: 'Personal Statement' },
                                            { value: 'Common App', label: 'Common App Essay' },
                                            { value: 'Why Us', label: 'Why Us / Supplemental' },
                                            { value: 'SOP', label: 'Statement of Purpose' },
                                            { value: 'Scholarship', label: 'Scholarship Essay' },
                                            { value: 'Activity', label: 'Activity Description' },
                                        ]} />
                                    </FormField>
                                    <FormField label="Word Limit">
                                        <InputField value={essayWordLimit} onChange={e => setEssayWordLimit(e.target.value)} placeholder="e.g. 650, 250" />
                                    </FormField>
                                </div>

                                {/* ─── NEW: Auto-Generate Section ─── */}
                                <div className="p-5 mb-6 rounded-2xl bg-gradient-to-r from-amber-500/5 to-rose-500/5 border border-amber-500/20">
                                    <h4 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Generate from Profile Context
                                    </h4>
                                    <p className="text-xs text-theme-muted mb-4 leading-relaxed">
                                        We'll use data gathered from your Career, College, and Compare tabs to write a highly personalized first draft. Add specific themes, stories, or tone requirements below:
                                    </p>
                                    <div id="essay-prompt-input">
                                        <FormField label="Specific Instructions (Optional)">
                                            <TextareaField value={essayPrompt} onChange={e => setEssayPrompt(e.target.value)} rows="3" placeholder="e.g. Focus on my AI project AUREM, breaking the basketball drought, and my emotional growth..." />
                                        </FormField>
                                    </div>
                                    <button type="button" onClick={handleGenerateEssay} disabled={isLoading} className="w-full py-3 mt-4 bg-theme-bg border border-amber-500/50 text-amber-500 rounded-xl font-black text-xs uppercase tracking-[0.1em] hover:bg-amber-500 hover:text-white transition-all flex justify-center items-center disabled:opacity-50">
                                        {isLoading && essayPhase === 'generate' ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>Auto-Generate Draft <Award className="w-4 h-4 ml-2" /></>)}
                                    </button>
                                </div>
                                <FormField label="Your Essay Draft">
                                    <TextareaField value={essayText} onChange={e => setEssayText(e.target.value)} required rows="12" placeholder="Paste your full essay draft here..." />
                                </FormField>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                    <button type="submit" disabled={isLoading || !essayText.trim()} className="py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-amber-500/30 hover:scale-[1.02] transition-all flex justify-center items-center disabled:opacity-50 group">
                                        {isLoading && essayPhase === 'coach' ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Coach Review <Award className="w-4 h-4 ml-2" /></>)}
                                    </button>
                                    <button type="button" onClick={handleGraderSubmit} disabled={isLoading || !essayText.trim()} className="py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-red-500/30 hover:scale-[1.02] transition-all flex justify-center items-center disabled:opacity-50 group">
                                        {isLoading && essayPhase === 'grader' ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>{essayIteration === 0 ? 'Harsh Grade' : `Re-Grade #${essayIteration + 1}`} <AlertTriangle className="w-4 h-4 ml-2" /></>)}
                                    </button>
                                </div>
                            </form>
                            {essayResult && (
                                <div className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border animate-slide-up`}>
                                    <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-theme-border`}>
                                        {essayPhase === 'coach' ? <Award className="w-5 h-5 text-amber-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                                        <h3 className="text-lg font-bold text-theme-text">
                                            {essayPhase === 'coach' ? 'Elite Coach Feedback' : `Grader Verdict — Iteration #${essayIteration}`}
                                        </h3>
                                    </div>
                                    <div ref={essayPdfRef} className={`prose max-w-none prose-sm leading-relaxed text-theme-text`}>
                                        <MarkdownBlock text={essayResult} />

                                        {/* NEW: Use Feedback to Improve Button */}
                                        {essayScore < 10 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEssayPrompt(`--- PREVIOUS FEEDBACK TO FIX ---\n${essayResult}\n\nRe-write my draft to address these exact weaknesses, red flags, and structural issues. Keep the strengths.`);
                                                    document.getElementById('essay-prompt-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }}
                                                className="mt-6 w-full py-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all"
                                            >
                                                {essayScore >= 8 ? "Keep Grinding for a Perfect 10 ✨" : "Use Feedback to Improve Draft ✨"}
                                            </button>
                                        )}

                                        {essayScore >= 8 && (
                                            <div className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-center">
                                                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                                <h4 className="text-lg font-black text-green-400">🎉 {essayScore === 10 ? 'PERFECT 10/10' : `${essayScore}/10 QUALIFIED`} — APPROVED!</h4>
                                                <p className="text-xs text-green-300 mt-1">Your essay is highly competitive. Download it now, or keep iterating for a 10/10.</p>
                                            </div>
                                        )}
                                    </div>
                                    {essayScore >= 8 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                            <button onClick={handlePdfDownload} className="py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                                Download PDF <Download className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setActiveTab('chat')} className="py-3 bg-theme-surface border border-theme-border text-theme-text rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                                                → Counselor for Final Qs <MessageSquare className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : essayPhase === 'grader' ? (
                                        <p className="text-center text-xs text-red-400 mt-4 font-bold">
                                            ⚠️ Score below 8 — revise using the feedback button above and hit "Harsh Grade" again.
                                        </p>
                                    ) : (
                                        <p className="text-center text-xs text-theme-muted mt-4 font-bold">
                                            💡 Happy with your draft? Hit "Harsh Grade" for the ultimate test.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ CHAT TAB ═══ */}
                    {activeTab === 'chat' && (
                        <div className={`animate-fade-in flex flex-col glass-panel rounded-3xl shadow-2xl border bg-theme-surface border-theme-border h-[75vh] md:h-[600px] overflow-hidden`}>
                            <div className={`p-3 border-b border-theme-border bg-theme-surface flex items-center gap-3`}>
                                <div className="p-2 rounded-xl bg-theme-bg border border-theme-border">
                                    <MessageSquare className={`w-4 h-4 text-theme-primary`} />
                                </div>
                                <span className="font-bold text-sm text-theme-text">Admissions AI Assistant</span>
                                <button
                                    onClick={() => setActiveTab('essay')}
                                    className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-theme-primary/10 border border-theme-primary/20 text-theme-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-theme-primary/20 transition-all"
                                >
                                    Ready for Essays <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-tr from-theme-primary to-theme-secondary text-theme-bg rounded-br-none'
                                            : `bg-theme-bg border-theme-border text-theme-text border rounded-tl-none`
                                            }`}>
                                            {msg.role === 'user' ? msg.text : (
                                                <MarkdownBlock text={msg.text} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className={`bg-theme-bg border-theme-border p-3 rounded-2xl rounded-tl-none border flex items-center gap-2`}>
                                            <Loader2 className={`w-4 h-4 animate-spin text-theme-primary`} />
                                            <span className={`text-xs text-theme-muted`}>Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleChatSubmit} className={`p-3 bg-theme-surface border-theme-border border-t flex gap-2`}>
                                <input
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    placeholder="Ask anything about colleges, admissions, visas..."
                                    className={`flex-1 p-3 rounded-xl text-sm bg-theme-bg border-theme-border text-theme-text outline-none focus:border-theme-primary border transition-all`}
                                />
                                <button type="submit" disabled={isLoading || !chatInput.trim()} className="p-3 bg-theme-primary text-theme-bg rounded-xl shadow-[0_0_15px_var(--theme-primary)] opacity-90 hover:opacity-100 transition-all disabled:opacity-50">
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
