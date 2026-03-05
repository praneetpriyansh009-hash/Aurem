import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardList, MessageSquare, Loader2, Lightbulb, Link, Globe, Send, Sparkles, Brain, Trophy, MapPin, GraduationCap, Map, Crown, BookOpen, Target, Calendar, ChevronRight, Check, Activity, FileText, Download, AlertTriangle, Award, ShieldAlert } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { GROQ_API_URL, formatGroqPayload } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    const [activeTab, setActiveTab] = useState('jee');

    // ─── SHARED STUDENT PROFILE (persists across all tabs) ───
    const [studentProfile, setStudentProfile] = useState({
        hobbies: '', passions: '', field: '', aspirations: '',
        gpa: '', testScores: '', major: '', extracurriculars: '',
        achievements: '', targetSchools: '', careerGoals: '',
        uploadedDocs: '', // Extracted text from uploaded PDFs/TXTs
        uploadedFileName: '',
    });
    const fileInputRef = useRef(null);

    // Update profile helper — merges new data without overwriting existing
    const updateProfile = useCallback((newData) => {
        setStudentProfile(prev => {
            const merged = { ...prev };
            for (const [key, value] of Object.entries(newData)) {
                if (value && value.trim()) merged[key] = value; // Only overwrite if non-empty
            }
            return merged;
        });
    }, []);

    // PDF/TXT upload handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            let extractedText = '';
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const pages = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    pages.push(content.items.map(item => item.str).join(' '));
                }
                extractedText = pages.join('\n\n');
            } else {
                // .txt or other text files
                extractedText = await file.text();
            }
            updateProfile({ uploadedDocs: extractedText.substring(0, 8000), uploadedFileName: file.name });
        } catch (err) {
            console.error('File upload error:', err);
        }
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Build a structured student profile block for AI prompts
    const buildProfileBlock = () => {
        const p = studentProfile;
        const parts = [];
        if (p.hobbies) parts.push(`Hobbies & Interests: ${p.hobbies}`);
        if (p.passions) parts.push(`Deep Passions: ${p.passions}`);
        if (p.field) parts.push(`Field of Study: ${p.field}`);
        if (p.aspirations) parts.push(`Future Aspirations: ${p.aspirations}`);
        if (p.gpa) parts.push(`GPA/Marks: ${p.gpa}`);
        if (p.testScores) parts.push(`Test Scores: ${p.testScores}`);
        if (p.major) parts.push(`Target Major: ${p.major}`);
        if (p.extracurriculars) parts.push(`Extracurriculars & Achievements:\n${p.extracurriculars}`);
        if (p.achievements) parts.push(`Key Achievements: ${p.achievements}`);
        if (p.targetSchools) parts.push(`Target Schools: ${p.targetSchools}`);
        if (p.careerGoals) parts.push(`Career Goals: ${p.careerGoals}`);
        if (p.uploadedDocs) parts.push(`--- UPLOADED DOCUMENT CONTENT ---\n${p.uploadedDocs}\n--- END UPLOADED DOCUMENT ---`);
        if (parts.length === 0) return '';
        return `\n\n=== COMPLETE STUDENT PROFILE (USE ALL OF THIS) ===\n${parts.join('\n')}\n=== END STUDENT PROFILE ===\n\n`;
    };
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

    // JEE Predictor (WORLD-CLASS)
    const [jeeMode, setJeeMode] = useState('marks'); // 'marks' or 'percentile'
    const [jeeForm, setJeeForm] = useState({ marks: '', percentile: '', category: 'OPEN', homeState: '', targetBranch: '', gender: 'Male', pwd: 'No' });
    const [jeeRankData, setJeeRankData] = useState(null);
    const [jeeCollegeResult, setJeeCollegeResult] = useState('');
    const jeePdfRef = useRef(null);

    // Multi-Exam State
    const [selectedExam, setSelectedExam] = useState(null); // 'jee', 'neet', 'cat', 'nda'

    // NEET State
    const [neetForm, setNeetForm] = useState({ marks: '', category: 'UR', state: '', preference: 'AIQ' });
    const [neetRankData, setNeetRankData] = useState(null);
    const [neetCollegeResult, setNeetCollegeResult] = useState('');
    const neetPdfRef = useRef(null);

    // CAT State
    const [catForm, setCatForm] = useState({ percentile: '', category: 'General', stream: 'Engineering', workEx: '0', spec: 'Finance' });
    const [catResultData, setCatResultData] = useState(null);
    const [catCollegeResult, setCatCollegeResult] = useState('');
    const catPdfRef = useRef(null);

    // NDA State
    const [ndaForm, setNdaForm] = useState({ marks: '', wing: 'Army' });
    const [ndaResultData, setNdaResultData] = useState(null);
    const [ndaCollegeResult, setNdaCollegeResult] = useState('');
    const ndaPdfRef = useRef(null);


    // SOP/Essay Expert (merged: review + coach + grader)
    const [essayPrompt, setEssayPrompt] = useState(''); // NEW for auto-generation
    const [essayText, setEssayText] = useState('');
    const [essayType, setEssayType] = useState('Personal Statement');
    const [essaySchool, setEssaySchool] = useState('');
    const [essayWordLimit, setEssayWordLimit] = useState('');
    const [essayStory, setEssayStory] = useState(''); // Key story / anecdote
    const [essayTrait, setEssayTrait] = useState(''); // Core trait to highlight
    const [essayTone, setEssayTone] = useState('Reflective'); // Essay tone
    const [essayResult, setEssayResult] = useState('');
    const [essayScore, setEssayScore] = useState(0);
    const [essayIteration, setEssayIteration] = useState(0);
    const [essayPhase, setEssayPhase] = useState('coach'); // 'coach' | 'grader' | 'generate'
    const [essayFeedbackHistory, setEssayFeedbackHistory] = useState([]); // Accumulated feedback from all iterations
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
    const callAI = async (userQuery, systemPrompt, temperature = 0.4) => {
        const payload = {
            ...formatGroqPayload(userQuery, systemPrompt, { temperature, max_tokens: 8192 }),
            model: "llama-3.3-70b-versatile",
            temperature: temperature
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
        // Save to shared profile
        updateProfile({
            hobbies: careerForm.hobbies,
            passions: careerForm.passion,
            field: careerForm.field,
            aspirations: careerForm.aspirations,
        });
        try {
            const profileBlock = buildProfileBlock();
            const text = await callAI(
                `Analyze this student's profile and create a highly dynamic, out-of-the-box personalized career roadmap. Do not stick to generic or fixed lists of careers. Think expansively.

--- STUDENT PROFILE (ACTIVE FORM) ---
Hobbies & Interests: ${careerForm.hobbies}
Deep Passions: ${careerForm.passion}
Current Field of Study: ${careerForm.field}
Future Aspirations: ${careerForm.aspirations}
Budget Constraints: ${careerForm.budget || 'Not specified'}
Preferred Country: ${careerForm.country || 'Open to any'}
--- END ACTIVE FORM ---
${profileBlock}

Provide:
## 🎯 Top 5-8 Dynamic Career Paths
For each: name, why it fits THIS SPECIFIC student (merge their hobbies and passions in unique ways), salary range, and future growth.

## 📚 Education Roadmap
Degree recommendations, certifications, online courses, bootcamps.

## 🏆 Skills to Build
Technical + soft skills with specific resources.

## 🌍 Global Opportunities
Best countries/cities for each career, remote work potential, visa-friendly nations.

## 💡 Action Plan (Next 12 Months)
Month-by-month breakdown of concrete steps.

## ⚡ Hidden & Emerging Gems
Unconventional paths, AI-integrated roles, or interdisciplinary opportunities most people miss.

Format with clear headers, emojis, and actionable bullet points.`,
                `You are the world's most dynamic AI Career Architect.
CRITICAL RULES:
- Deeply synthesize ALL of the user's inputs. Do NOT give generic paths (e.g. "Software Engineer"). Break constraints and suggest interdisciplinary, future-proof careers.
- Read and use ALL data in the STUDENT PROFILE.
- Output 5 to 8 unique career ideas.
- Use clear Markdown with emojis.`
            );
            setCareerResult(text);
            updateProfile({ careerGoals: text.substring(0, 500) });
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
        updateProfile({
            gpa: collegeForm.gpa,
            testScores: collegeForm.testScores,
            major: collegeForm.major,
            extracurriculars: collegeForm.extracurriculars,
        });
        try {
            const profileBlock = buildProfileBlock();
            const text = await callAI(
                `Analyze this student profile and provide the most comprehensive, brutally honest college recommendation in the world.

--- STUDENT PROFILE (ACTIVE FORM) ---
GPA/Marks: ${collegeForm.gpa}
Test Scores: ${collegeForm.testScores || 'Not provided'}
Desired Major: ${collegeForm.major}
Study Level: ${collegeForm.studyLevel}
Extracurriculars & Achievements: ${collegeForm.extracurriculars}
Preferred Location: ${collegeForm.location || 'No preference'}
Preferred Country: ${collegeForm.country}
Budget: ${collegeForm.budget || 'Not specified'}
--- END ACTIVE FORM ---
${profileBlock}

CRITICAL INSTRUCTIONS FOR WEAK PROFILES:
If the student has NO test scores (SAT/ACT/AP/JEE), low GPA, or weak extracurriculars, DO NOT recommend MIT, Stanford, Harvards, or top-tier schools. Instead, output a "🛑 HARSH REALITY CHECK" section right at the top. Tell them bluntly that top schools are impossible right now, and FORCE them to start using the "Competitive Prep / Preparation Hub" in this app to take SAT/ACT/AP or other standardized exams to build their stats. 

COLLEGE LIST (Provide 20-30 Realistic Colleges):
Group these 20-30 colleges into realistic tiers based strictly on their actual stats. Look beyond just America if they chose "Any" or a different country. For EACH college, explain in 1 sentence WHY it fits their specific extracurriculars or constraints in the profile.

## 🛑 HARSH REALITY CHECK & RESUME MANDATE
(Only include if stats are weak/missing. Instruct them to use the Preparation Hub immediately to fix their testing and extracurricular gaps for guaranteed admission).

## 🔒 Safety Schools (10-15 colleges)
Name, Location, Acceptance Rate, Fit Reason.

## 🎯 Target Schools (5-10 colleges)
Name, Location, Acceptance Rate, Fit Reason.

## 🚀 Reach Schools (2-5 colleges - ONLY if realistic)
Name, Location, Acceptance Rate, Fit Reason.

## 📊 Probability Analysis & Financial Breakdown
Brief summary of chances, tuition, and basic scholarship advice.`,
                `You are the world's most knowledgeable and brutally honest AI College Admissions Consultant.
CRITICAL RULES:
- Provide up to 20-30 colleges total.
- If stats are weak, you MUST reject top-tier Ivies/Stanford immediately. Break their illusions gracefully but firmly, and TELL them to use the "Preparation Hub" to fix their SAT/ACT/AP stats.
- Match colleges to their exact extracurriculars and documents.
- Provide international diversity if the country is open. Don't default to only US.
- Use clear Markdown formatting with emojis.`
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

    // ─── MARKS → PERCENTILE PREDICTOR (NTA Historical Mapping) ───
    const marksToPercentile = (marks) => {
        const m = parseFloat(marks);
        if (isNaN(m) || m < 0) return 0;
        if (m > 300) return 99.99;
        // Piecewise interpolation based on NTA 2024 JEE Main Session 2 data
        const data = [
            [0, 0], [10, 15.5], [20, 32.0], [30, 45.2], [40, 55.8],
            [50, 64.0], [60, 71.5], [70, 77.2], [80, 82.0], [90, 86.0],
            [100, 89.2], [110, 91.5], [120, 93.2], [130, 94.6], [140, 95.7],
            [150, 96.5], [160, 97.2], [170, 97.7], [180, 98.15], [190, 98.5],
            [200, 98.8], [210, 99.05], [220, 99.25], [230, 99.42], [240, 99.56],
            [250, 99.68], [260, 99.78], [270, 99.86], [280, 99.92], [290, 99.96], [300, 99.997]
        ];
        for (let i = 0; i < data.length - 1; i++) {
            if (m >= data[i][0] && m <= data[i + 1][0]) {
                const ratio = (m - data[i][0]) / (data[i + 1][0] - data[i][0]);
                return parseFloat((data[i][1] + ratio * (data[i + 1][1] - data[i][1])).toFixed(7));
            }
        }
        return 99.99;
    };

    const getRankTier = (rank) => {
        if (rank <= 250) return { label: 'IIT Material', color: 'text-yellow-400', emoji: '🏆' };
        if (rank <= 1000) return { label: 'Top NIT CSE', color: 'text-green-400', emoji: '🔥' };
        if (rank <= 5000) return { label: 'NIT Core Branches', color: 'text-blue-400', emoji: '🎯' };
        if (rank <= 15000) return { label: 'NIT / Top IIIT', color: 'text-indigo-400', emoji: '🏛️' };
        if (rank <= 35000) return { label: 'IIIT / GFTI', color: 'text-purple-400', emoji: '🎓' };
        if (rank <= 75000) return { label: 'State Colleges / Private', color: 'text-orange-400', emoji: '📚' };
        return { label: 'Explore All Options', color: 'text-red-400', emoji: '🛡️' };
    };

    // ─── JEE RANK PREDICTOR (WORLD-CLASS) ───
    const handleJeeSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setJeeRankData(null);
        setJeeCollegeResult('');
        try {
            let percent;
            let estimatedMarks = '';
            if (jeeMode === 'marks') {
                const m = parseFloat(jeeForm.marks);
                if (isNaN(m) || m < 0 || m > 300) throw new Error('Enter valid marks between 0 and 300');
                percent = marksToPercentile(m);
                estimatedMarks = m;
            } else {
                percent = parseFloat(jeeForm.percentile);
                if (isNaN(percent) || percent < 0 || percent > 100) throw new Error('Enter a valid percentile between 0 and 100');
            }

            const totalCandidates = 1450000; // 2026 projection
            const crlRank = Math.max(1, Math.floor(((100 - percent) * totalCandidates) / 100));
            const tier = getRankTier(crlRank);
            setJeeRankData({ crl: crlRank, percentile: percent, category: jeeForm.category, marks: estimatedMarks, tier, homeState: jeeForm.homeState, targetBranch: jeeForm.targetBranch, gender: jeeForm.gender, pwd: jeeForm.pwd });

            const text = await callAI(
                `A JEE Main 2026 aspirant's profile:
- Estimated Percentile: ${percent}%
- Calculated All India CRL Rank: ~${crlRank}
- Category: ${jeeForm.category}
- Gender: ${jeeForm.gender}
- PwD Status: ${jeeForm.pwd}
- Home State: ${jeeForm.homeState || 'Not specified'}
- Target Branch: ${jeeForm.targetBranch || 'Any / Open to all'}
${estimatedMarks ? `- Estimated Marks: ${estimatedMarks}/300` : ''}

Based on JoSAA 2024 closing rank data, provide the most accurate, comprehensive prediction:

## 🏆 Rank Analysis
Where this rank stands among ~14.15 lakh candidates. IIT eligibility? NIT tier? Competitive standing.

## 🏛️ Best NITs You Can Get (Top 5)
For each NIT: Full Name, Branch, Opening Rank, Closing Rank (2024 ${jeeForm.category} category), Home State vs Other State quota note. Present as a clear list.

## 🎓 Best IIITs & GFTIs (Top 5)
Same format — full college name, branch, closing ranks from 2024.

## 💎 Hidden Gems (3 Underrated Picks)
Lesser-known excellent colleges with great placement records that accept this rank.

## 🛡️ Safe Backup Options (3-4)
Private universities (BITS, VIT, SRM, Manipal, etc.) and state-level options.

## 📋 Complete JoSAA / CSAB Process Guide
- Step-by-step registration and choice filling timeline (with dates)
- How many rounds, when CSAB starts
- Choice filling strategy: How to order preferences for maximum benefit
- Documents needed
- Seat acceptance and reporting process
- Upgrade & float options explained

## ⚡ Pro Tips
3-5 insider tips for maximizing admission outcomes at this rank level.

Use REAL data. Be brutally honest. No sugarcoating. Use Markdown with emojis.`,
                `You are India's #1 JEE Main Counseling Expert with 20+ years of experience. You have memorized every JoSAA opening and closing rank from 2020-2024 for all NITs, IIITs, and GFTIs across all categories and quotas. You give hyper-specific, data-backed predictions. You know every branch, every quota, every special round. Your advice has helped 50,000+ students get into their dream colleges. Be thorough, specific, and use actual rank numbers from 2024 data.`
            );
            setJeeCollegeResult(text);
            incrementUsage('college-compass');
        } catch (err) { setJeeCollegeResult('Error: ' + err.message); }
        finally { setIsLoading(false); }
    };

    const handleJeePdfDownload = async () => {
        const element = jeePdfRef.current;
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a', useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            let heightLeft = pdfHeight;
            let position = 0;
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
            while (heightLeft > 0) {
                position -= pdf.internal.pageSize.getHeight();
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
            pdf.save(`Aurem_JEE_Report_Rank_${jeeRankData?.crl || 'NA'}.pdf`);
        } catch (err) { console.error('PDF generation failed:', err); }
    };


    // ─── NEET PREDICTOR (NEW) ───
    const neetMarksToRank = (marks) => {
        // Approximate 2025 mappings
        if (marks >= 715) return Math.floor(Math.random() * 50) + 1;
        if (marks >= 700) return 500;
        if (marks >= 680) return 2500;
        if (marks >= 650) return 8000;
        if (marks >= 600) return 30000;
        if (marks >= 550) return 65000;
        return 100000 + (600 - marks) * 1000;
    };

    const handleNeetSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true); setNeetRankData(null); setNeetCollegeResult('');
        try {
            const m = parseFloat(neetForm.marks);
            if (isNaN(m) || m < 0 || m > 720) throw new Error('Enter valid NEET marks (0-720)');
            const rank = neetMarksToRank(m);
            const tier = m >= 680 ? 'Top AIIMS / GMC' : m >= 620 ? 'Govt Medical College' : m >= 550 ? 'State GMC / Semi-Govt' : 'Private / Deemed';
            setNeetRankData({ rank, marks: m, category: neetForm.category, tier, state: neetForm.state });

            const reqText = `A NEET UG 2026 Aspirant profile:
Marks: ${m}/720
Estimated Rank: ~${rank}
Category: ${neetForm.category}
State: ${neetForm.state || 'Not specified'}
Preference: ${neetForm.preference}

Analyze based on NEET 2024 cutoff logic:
## 🩺 Overall MBBS/BDS Prospects
## 🏥 Top 5 Colleges Available
## 📊 AIQ vs State Quota Strategy
## 🛡️ Safe Private/Deemed Options (if applicable)
Use emojis and bold formatting.`;
            const result = await callAI(reqText, "You are India's #1 Medical Counseling Expert specializing in NEET UG MCC counseling. Be brutally realistic about govt seat chances.");
            setNeetCollegeResult(result);
            incrementUsage('college-compass');
        } catch (err) { setNeetCollegeResult('Error: ' + err.message); }
        finally { setIsLoading(false); }
    };

    const handleNeetPdfDownload = async () => {
        const element = neetPdfRef.current;
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a', useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Aurem_NEET_Report_${neetRankData?.marks}.pdf`);
        } catch (err) { console.error(err); }
    };

    // ─── CAT PREDICTOR (NEW) ───
    const handleCatSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true); setCatResultData(null); setCatCollegeResult('');
        try {
            const p = parseFloat(catForm.percentile);
            if (isNaN(p) || p < 0 || p > 100) throw new Error('Enter valid percentile');
            const tier = p >= 99 ? 'BLACKI Capable' : p >= 95 ? 'New IIMs / IITs' : p >= 90 ? 'Baby IIMs / Tier 2' : 'Tier 3 B-Schools';
            setCatResultData({ percentile: p, category: catForm.category, tier, stream: catForm.stream });

            const reqText = `A CAT 2025 Aspirant profile:
Percentile: ${p}%
Category: ${catForm.category}
Academic Stream: ${catForm.stream}
Work Ex: ${catForm.workEx} months
Target Spec: ${catForm.spec}

Analyze based on IIM admission criteria:
## 🎓 IIM Shortlist Probability (BLACKI vs New vs Baby)
## 🏢 Top 5 Non-IIM Options (FMS, SPJIMR, IITs, etc.)
## 💼 Profile Analysis (Work Ex & Stream Impact)
## 🎙️ WAT-PI Prep Strategy
Use emojis and bold formatting.`;
            const result = await callAI(reqText, "You are India's top B-School Admissions Consultant. Provide realistic evaluation of IIM call chances based on composite score logic.");
            setCatCollegeResult(result);
            incrementUsage('college-compass');
        } catch (err) { setCatCollegeResult('Error: ' + err.message); }
        finally { setIsLoading(false); }
    };

    const handleCatPdfDownload = async () => {
        const element = catPdfRef.current;
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a', useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Aurem_CAT_Report_${catResultData?.percentile}.pdf`);
        } catch (err) { console.error(err); }
    };

    // ─── NDA PREDICTOR (NEW) ───
    const handleNdaSubmit = async (e) => {
        e.preventDefault();
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true); setNdaResultData(null); setNdaCollegeResult('');
        try {
            const m = parseFloat(ndaForm.marks);
            if (isNaN(m) || m < 0 || m > 900) throw new Error('Enter valid written marks (out of 900)');
            const cutoffExpected = ndaForm.wing === 'Air Force' ? 360 : ndaForm.wing === 'Navy' ? 350 : 340;
            const diff = m - cutoffExpected;
            const tier = diff >= 40 ? 'High Chance' : diff >= 0 ? 'Borderline' : 'Tough Chances';
            setNdaResultData({ marks: m, wing: ndaForm.wing, tier, expectedCutoff: cutoffExpected });

            const reqText = `An NDA Aspirant profile:
Written Marks: ${m}/900
Preferred Wing: ${ndaForm.wing}

Analyze prospects:
## 🪖 Written Cleared? (Cutoff Analysis)
## 🎖️ SSB Interview Strategy for ${ndaForm.wing}
## 📈 Merit List Probability
## 💪 Physical & Medical Standards Required
Use emojis and bold formatting.`;
            const result = await callAI(reqText, "You are an ex-SSB Assessor and NDA prep expert. Provide accurate, no-nonsense defense career guidance.");
            setNdaCollegeResult(result);
            incrementUsage('college-compass');
        } catch (err) { setNdaCollegeResult('Error: ' + err.message); }
        finally { setIsLoading(false); }
    };

    const handleNdaPdfDownload = async () => {
        const element = ndaPdfRef.current;
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#0f172a', useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Aurem_NDA_Report_${ndaResultData?.marks}.pdf`);
        } catch (err) { console.error(err); }
    };

    //     // ─── ESSAY EXPERT (Auto-Generate Draft) ───
    const handleGenerateEssay = async () => {
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setEssayPhase('generate');
        setEssayResult("Generating initial draft based on your profile context...");
        try {
            // Primary: shared student profile (accumulated from all tabs + uploads)
            const profileBlock = buildProfileBlock();
            // Supplementary: AI results from other tabs
            const aiContextStr = [
                careerResult ? `--- CAREER ROADMAP (AI-GENERATED) ---\n${careerResult.substring(0, 2000)}` : '',
                collegeResult ? `--- TARGET COLLEGES (AI-GENERATED) ---\n${collegeResult.substring(0, 2000)}` : '',
                compareResult ? `--- COLLEGE COMPARISON (AI-GENERATED) ---\n${compareResult.substring(0, 1500)}` : '',
            ].filter(Boolean).join('\n\n');
            const contextStr = profileBlock + (aiContextStr ? `\n${aiContextStr}` : '');

            const timestamp = Date.now();
            const randomSeed = Math.floor(Math.random() * 10000);

            let resultContext = await callAI(
                `Target School(s): ${essaySchool || 'Not specified'}
Essay Type: ${essayType}
Word Limit: ${essayWordLimit || 'Not specified'}
Desired Tone: ${essayTone}
Core Trait to Highlight: ${essayTrait || 'Not specified'}

--- KEY STORY / ANECDOTE ---
${essayStory || 'Not provided — use the profile context to find a compelling angle.'}
--- END STORY ---

${contextStr}

--- STUDENT ADDITIONAL INSTRUCTIONS ---
${essayPrompt || 'None'}
--- END INSTRUCTIONS ---

Write the essay based on ALL the context above. The Key Story is the MOST IMPORTANT input — build the entire essay around it.
CRITICAL UNIQUE SEED: [${timestamp}-${randomSeed}] 
Ensure this essay is COMPLETELY DIFFERENT from any previous iteration. Use a unique opening hook, different narrative framing, and distinct vocabulary.`,
                `You are an elite college admissions essay writer using the PASS, COFFEE, and NARRATIVE frameworks. 

You MUST WRITE the actual essay draft based on the student's profile context provided.
- Do NOT provide coaching feedback. Write the ESSAY.
- Adopt an authentic 16-17 year old extremely capable but emotionally honest voice (avoid generic "application voice").
- Incorporate specific details directly from their provided profile context.
- Ensure strong hook, narrative flow, and memorable conclusion.
- Follow the specific prompt and word limit if provided.
- BE CREATIVE AND UNIQUE. Do not use the exact same formula every time.
- ONLY output the essay text itself, no meta-commentary.`,
                0.85 // High temperature for creative uniqueness
            );
            setEssayText(resultContext);
            setEssayResult("Draft generated successfully! You can now review it below, make manual edits, and then click 'Coach Review' or 'Harsh Grade'.");
            incrementUsage('college-compass');
        } catch (err) { setEssayResult("Error generating draft: " + err.message); }
        finally { setIsLoading(false); }
    };


    // ─── ESSAY EXPERT
    const handleAutoFixEssay = async () => {
        if (!essayText.trim() || !essayResult.trim()) return;
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setEssayPhase('coach');
        setEssayResult("Deeply rewriting your draft based on the latest strict feedback...");

        try {
            // Focus heavily on the LATEST feedback to ensure forward progress
            const latestFeedback = essayFeedbackHistory.length > 0
                ? essayFeedbackHistory[essayFeedbackHistory.length - 1]
                : essayResult;

            const text = await callAI(
                `Target School(s): ${essaySchool || 'Not specified'}
Essay Type: ${essayType}
Word Limit: ${essayWordLimit || 'Not specified'}

--- YOUR CURRENT DRAFT ---
${essayText}
--- END DRAFT ---

--- THE RUDE STRICT REVIEWER'S LATEST VERDICT & DEMANDS ---
${latestFeedback}
--- END VERDICT ---

You MUST rewrite the ENTIRE essay from scratch to fix EVERY SINGLE issue raised by the reviewer above.
1. DO NOT DOWNGRADE the essay. Keep the good parts, elevate the weak parts.
2. If the reviewer called out clichés or "AI polish", REMOVE THEM. Write with raw, authentic teenage voice.
3. If the reviewer demanded specific sensory details or a better hook, INVENT plausible, highly specific details that fit the narrative.
4. Ensure the essay aligns with the COFFEE and PASS frameworks (Problem Space, Authenticity, Specificity).
5. The result must be a COMPLETE, polished essay ready for submission.`,
                `You are a world-class college admissions essay ghostwriter working alongside the "Strict Reviewer".

CRITICAL: You are REWRITING this essay to score a perfect 10/10 on the Reviewer's strict rubric.
- Every sentence must earn its place. Cut filler ruthlessly.
- Use "show, don't tell": replace "I learned resilience" with a specific vivid action.
- The hook must grab attention in the first 5 words.
- The conclusion must circle back to the opening with emotional resonance.
- Output ONLY the raw essay text. No meta-commentary, no titles, no "Here is..." prefixes.`
            );

            setEssayText(text);
            setEssayResult("Draft rewritten addressing the strict feedback! Hit 'Grade Again' to verify the improvements with the reviewer.");
            incrementUsage('college-compass');
        } catch (err) { setEssayResult("Error auto-fixing draft: " + err.message); }
        finally { setIsLoading(false); }
    };


    // ─── ESSAY EXPERT
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

    // ─── HARSH GRADER (Essay Maker Pro - Rude Strict Reviewer) ───
    const handleGraderSubmit = async () => {
        if (!essayText.trim()) return;
        if (!canUseFeature('college-compass')) { triggerUpgradeModal('college-compass'); return; }
        setIsLoading(true);
        setEssayPhase('grader');
        const iteration = essayIteration + 1;
        setEssayIteration(iteration);
        try {
            const prevFeedbackContext = essayFeedbackHistory.length > 0
                ? `\n\n--- PREVIOUS ROUND FEEDBACK (VERIFY IF THEY ACTUALLY FIXED THIS) ---\n${essayFeedbackHistory[essayFeedbackHistory.length - 1]}\n--- END PREVIOUS FEEDBACK ---\n\nIf they didn't fix the exact issues from last time, INSULT their lack of attention to detail and drop their score.`
                : '';

            const text = await callAI(
                `Target School: ${essaySchool}\nEssay Type: ${essayType}\n\n--- STUDENT ESSAY DRAFT ---\n${essayText}\n--- END DRAFT ---${prevFeedbackContext}`,
                `You are Essay Maker Pro's "Rude Strict Reviewer". You 10x better than Kollege.ai. Your explicit goal is to get students with weak stats (low GPA/scores) into Ivies/Stanford/MIT WITH scholarships by forcing them to write undeniably authentic, memorable, red-flag-free essays.

You are BRUTAL, HARSH, NITPICKY, and BLUNT. If it sounds like AI polish, cliché garbage, or a resume-restatement, TRASH IT. Call them out. Insult the writing if it's boring ("This is garbage—sounds like a robot wrote it, fix your fake voice or you'll get rejected everywhere!"). 

CRITICAL GRADING RUBRIC (Score 1-10 for each):
1. Authenticity (Messy/human? Or AI polish?)
2. Memorability (PASS test passed? Direction clear?)
3. Narrative Strength (COFFEE framework aligned?)
4. Red Flag Avoidance (No exaggerations or trophy-collecting?)
5. Voice/Rhythm (UNIQUE drills? Sensory details?)
6. School Fit (Specific CHOICE buckets?)
7. Merit Emphasis (Neutral, achievement-first for 2026 trends?)
8. Overall Perfection

OUTPUT EXACTLY THIS FORMAT:
## 💀 BRUTAL VERDICT
[Your incredibly blunt, unforgiving assessment of why this essay would currently be rejected or accepted]

## 📊 THE GAUNTLET SCORES
- Authenticity: X/10
- Memorability: X/10
- Narrative Strength: X/10
- Red Flags: X/10
- Voice/Rhythm: X/10
- School Fit: X/10
- Merit Emphasis: X/10
- **OVERALL PERFECTION: X/10**

## 🛑 FATAL FLAWS & EXACT FIXES REQUIRED
[If Overall is < 10, list EXACT, specific sentences to rewrite and HOW to fix them. Be mean about it if it's cliché.]

## ⚡ FINAL RULING
[If Overall < 10]: "RESUBMIT — This is not Ivy-level yet. Fix it."
[If Overall == 10]: "PERFECT ESSAY ACHIEVED ✅ — This raw, evidence-backed narrative guarantees admission and overrides your weak stats because [explain why]."

Start immediately with "Reviewer Iteration ${iteration}: "`
            );

            setEssayFeedbackHistory(prev => [...prev, text]);
            setEssayResult(text);
            const scoreMatch = text.match(/OVERALL PERFECTION:\s*(\d+(\.\d+)?)/i);
            if (scoreMatch) setEssayScore(parseFloat(scoreMatch[1]));
            incrementUsage('college-compass');
        } catch (err) { setEssayResult("Error: " + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── PDF DOWNLOAD (COMPREHENSIVE STRATEGY REPORT) ───
    const handlePdfDownload = async () => {
        if (!essayText) return;
        setIsLoading(true);
        setEssayResult("Generating comprehensive final strategy report for download...");
        try {
            const profileStr = buildProfileBlock();

            const summaryReq = `Based on the following student profile and final essay draft, generate a **Comprehensive Admission & Scholarship Strategy Report**.
            
PROFILE & CONTEXT:
${profileStr}

CURRENT ESSAY DRAFT:
${essayText}

Create a structured plain-text report (NO MARKDOWN symbols like ** or ##, just use ALL CAPS for headings) covering:
1. STUDENT PROFILE SUMMARY (A brief overview of their strengths)
2. RECOMMENDED CAREER PATH (Based on their skills/interests)
3. TARGET COLLEGES & STRATEGY (Specific schools that fit them)
4. SCHOLARSHIP OPPORTUNITIES (Financial aid strategies based on their profile)
5. FINAL ADMISSION ESSAY (Print the full essay provided above)

CRITICAL: If the profile is mostly empty (e.g. they didn't use the Career or College tabs first), tell them exactly what they should explore and what steps they must take next in those specific areas. Do not leave sections blank. Write clearly and professionally. Use newlines to separate paragraphs. STRICTLY NO MARKDOWN ASTERISKS.`;

            const fullReportText = await callAI(summaryReq, "You are Essay Maker Pro's lead counselor generating the absolute final PDF export for the student.");

            // Create PDF using jsPDF text wrapping
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);

            const lines = pdf.splitTextToSize(fullReportText, 170); // 170mm width
            let y = 20;
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Add a title header
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.text("Aurem Admission & Scholarship Strategy Report", 15, y);
            y += 15;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);

            for (let i = 0; i < lines.length; i++) {
                if (y > pageHeight - 20) {
                    pdf.addPage();
                    y = 20;
                }
                pdf.text(lines[i], 15, y);
                y += 6;
            }

            pdf.save('Aurem_Admission_Strategy_Report.pdf');
            setEssayResult("Complete Strategy Report downloaded successfully! ✅ Check your downloads folder.");
        } catch (err) {
            setEssayResult("Error generating PDF report: " + err.message);
            console.error('PDF generation failed:', err);
        } finally {
            setIsLoading(false);
        }
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
                        { id: 'jee', label: 'JEE Predictor', icon: Crown },
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


                    {/* ═══ EXAM PREDICTOR HUB (AUREM LENS STYLE) ═══ */}
                    {activeTab === 'jee' && (
                        <div className="space-y-6 animate-fade-in">
                            {!selectedExam ? (
                                <div className="space-y-8">
                                    <div className="text-center space-y-3 mb-8">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-theme-primary/20 bg-theme-primary/5 mb-2 relative group">
                                            <Target className="w-8 h-8 text-theme-primary relative z-10" />
                                        </div>
                                        <h2 className="text-3xl font-serif italic tracking-wide text-theme-text">Aurem Exam Predictors</h2>
                                        <div className="flex items-center gap-3 justify-center">
                                            <div className="w-8 h-px bg-theme-primary/30"></div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted">Select Your Gateway</p>
                                            <div className="w-8 h-px bg-theme-primary/30"></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { id: 'jee', title: 'JEE Main 2026', tags: ['B.Tech', 'NITs/IIITs'], icon: Crown, color: 'from-blue-500 to-indigo-500', shadow: 'hover:shadow-blue-500/20', bg: 'bg-blue-500/10' },
                                            { id: 'neet', title: 'NEET UG 2026', tags: ['MBBS/BDS', 'AIIMS'], icon: Activity, color: 'from-emerald-400 to-teal-500', shadow: 'hover:shadow-emerald-500/20', bg: 'bg-emerald-500/10' },
                                            { id: 'cat', title: 'CAT 2025', tags: ['MBA', 'IIMs'], icon: Target, color: 'from-purple-500 to-pink-500', shadow: 'hover:shadow-purple-500/20', bg: 'bg-purple-500/10' },
                                            { id: 'nda', title: 'NDA & NA', tags: ['Defense', 'SSB'], icon: ShieldAlert, color: 'from-orange-400 to-red-500', shadow: 'hover:shadow-orange-500/20', bg: 'bg-orange-500/10' }
                                        ].map(exam => (
                                            <button
                                                key={exam.id}
                                                onClick={() => setSelectedExam(exam.id)}
                                                className={`group relative p-8 rounded-[24px] border border-theme-border bg-theme-surface hover:border-theme-primary/30 transition-all duration-500 overflow-hidden flex flex-col text-left hover:-translate-y-1 shadow-depth ${exam.shadow}`}
                                            >
                                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-500 rounded-bl-[100px] pointer-events-none ${exam.color}`}></div>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105 ${exam.bg}`}>
                                                        <exam.icon className="w-7 h-7 text-theme-text" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {exam.tags.map(t => <span key={t} className="text-[9px] font-bold px-2 py-1 bg-theme-bg border border-theme-border rounded uppercase tracking-widest text-theme-muted">{t}</span>)}
                                                    </div>
                                                </div>
                                                <h3 className="text-2xl font-black tracking-tight text-theme-text mb-2 inset-0 group-hover:text-theme-primary transition-colors">{exam.title}</h3>
                                                <div className="mt-auto pt-6 flex w-full justify-between items-center group-hover:translate-x-2 transition-transform duration-500">
                                                    <span className="text-xs font-bold text-theme-muted uppercase tracking-widest">Launch Predictor</span>
                                                    <ChevronRight className="w-4 h-4 text-theme-primary" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-fade-in relative">
                                    <button onClick={() => setSelectedExam(null)} className="flex items-center gap-2 px-4 py-2 border border-theme-border rounded-xl text-xs font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text hover:bg-theme-bg transition-colors mb-2">
                                        ← Back to Exams
                                    </button>

                                    {/* Sub-Views rendered conditionally */}
                                    {selectedExam === 'jee' && (
                                        <div className="space-y-4">
                                            <form onSubmit={handleJeeSubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden`}>
                                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-600" />
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                                                            <Crown className={`w-6 h-6 text-blue-500`} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-theme-text">JEE Main 2026 Predictor — April Session</h3>
                                                            <p className={`text-xs text-theme-muted`}>Enter marks OR percentile → Get rank, colleges, and complete guidance</p>
                                                        </div>
                                                    </div>
                                                    <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest hidden sm:inline">NTA Data 2026 Projection</span>
                                                </div>

                                                {/* Toggle: Marks vs Percentile */}
                                                <div className="flex items-center justify-center gap-2 mb-6 p-1.5 rounded-2xl bg-theme-bg border border-theme-border w-fit mx-auto">
                                                    <button type="button" onClick={() => setJeeMode('marks')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${jeeMode === 'marks' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-theme-muted hover:text-theme-text'}`}>From Marks</button>
                                                    <button type="button" onClick={() => setJeeMode('percentile')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${jeeMode === 'percentile' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-theme-muted hover:text-theme-text'}`}>From Percentile</button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    {jeeMode === 'marks' ? (
                                                        <FormField label="Your Expected / Actual Marks (out of 300)">
                                                            <InputField type="number" step="1" min="0" max="300" value={jeeForm.marks} onChange={e => setJeeForm({ ...jeeForm, marks: e.target.value })} required placeholder="e.g. 185" />
                                                            {jeeForm.marks && parseFloat(jeeForm.marks) >= 0 && parseFloat(jeeForm.marks) <= 300 && (
                                                                <p className="text-xs mt-2 text-blue-400 font-bold">≈ Estimated Percentile: {marksToPercentile(jeeForm.marks)}%</p>
                                                            )}
                                                        </FormField>
                                                    ) : (
                                                        <FormField label="Your JEE Percentile">
                                                            <InputField type="number" step="0.0000001" value={jeeForm.percentile} onChange={e => setJeeForm({ ...jeeForm, percentile: e.target.value })} required placeholder="e.g. 98.6543210" />
                                                        </FormField>
                                                    )}
                                                    <FormField label="Category">
                                                        <SelectField value={jeeForm.category} onChange={e => setJeeForm({ ...jeeForm, category: e.target.value })} options={[
                                                            { value: 'OPEN', label: 'OPEN / General' },
                                                            { value: 'OBC-NCL', label: 'OBC-NCL' },
                                                            { value: 'EWS', label: 'Gen-EWS' },
                                                            { value: 'SC', label: 'SC' },
                                                            { value: 'ST', label: 'ST' },
                                                        ]} />
                                                    </FormField>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                    <FormField label="Home State">
                                                        <InputField value={jeeForm.homeState} onChange={e => setJeeForm({ ...jeeForm, homeState: e.target.value })} placeholder="e.g. Maharashtra" />
                                                    </FormField>
                                                    <FormField label="Target Branch">
                                                        <InputField value={jeeForm.targetBranch} onChange={e => setJeeForm({ ...jeeForm, targetBranch: e.target.value })} placeholder="e.g. CSE, ECE" />
                                                    </FormField>
                                                    <FormField label="Gender">
                                                        <SelectField value={jeeForm.gender} onChange={e => setJeeForm({ ...jeeForm, gender: e.target.value })} options={[
                                                            { value: 'Male', label: 'Male' },
                                                            { value: 'Female', label: 'Female (Supernumerary)' },
                                                            { value: 'Other', label: 'Other' },
                                                        ]} />
                                                    </FormField>
                                                    <FormField label="PwD Status">
                                                        <SelectField value={jeeForm.pwd} onChange={e => setJeeForm({ ...jeeForm, pwd: e.target.value })} options={[
                                                            { value: 'No', label: 'No' },
                                                            { value: 'Yes', label: 'Yes (PwD Quota)' },
                                                        ]} />
                                                    </FormField>
                                                </div>
                                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center disabled:opacity-50 group">
                                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                        <>
                                                            Predict My Colleges & Future
                                                            <Crown className="w-4 h-4 ml-2 group-hover:scale-125 group-hover:rotate-12 transition-transform" />
                                                        </>
                                                    )}
                                                </button>
                                            </form>

                                            {/* Results */}
                                            {(jeeCollegeResult || jeeRankData) && (
                                                <div className={`glass-panel rounded-3xl shadow-2xl border bg-theme-surface border-theme-border animate-slide-up relative overflow-hidden`}>
                                                    <div ref={jeePdfRef} className="p-6 sm:p-8">
                                                        {/* Report Header */}
                                                        <div className="text-center mb-8">
                                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1">Aurem Intelligence</p>
                                                            <h2 className="text-2xl font-black text-theme-text uppercase tracking-tight">JEE Main 2025 — Prediction Report</h2>
                                                            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mt-3 rounded-full" />
                                                        </div>

                                                        {/* Stat Cards */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                                                            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 text-center">
                                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">CRL Rank</p>
                                                                <h3 className="text-2xl font-black text-blue-400">{jeeRankData?.crl?.toLocaleString('en-IN') || '—'}</h3>
                                                            </div>
                                                            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 text-center">
                                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Percentile</p>
                                                                <h3 className="text-2xl font-black text-indigo-400">{jeeRankData?.percentile}%</h3>
                                                            </div>
                                                            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 text-center">
                                                                <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Category</p>
                                                                <h3 className="text-lg font-black text-purple-400">{jeeRankData?.category}</h3>
                                                            </div>
                                                            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 text-center">
                                                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Tier</p>
                                                                <h3 className={`text-sm font-black ${jeeRankData?.tier?.color || 'text-theme-text'}`}>{jeeRankData?.tier?.emoji} {jeeRankData?.tier?.label}</h3>
                                                            </div>
                                                        </div>

                                                        {jeeRankData?.marks && (
                                                            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 mb-8 text-center">
                                                                <p className="text-xs text-theme-muted">Estimated from <span className="font-black text-blue-400">{jeeRankData.marks}/300 marks</span> using NTA 2024 normalization data</p>
                                                            </div>
                                                        )}

                                                        {/* AI College Analysis */}
                                                        {jeeCollegeResult ? (
                                                            <div className={`prose max-w-none prose-sm leading-relaxed text-theme-text`}>
                                                                <MarkdownBlock text={jeeCollegeResult} />
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col justify-center items-center py-16 gap-3">
                                                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                                                <p className="text-xs font-bold text-theme-muted animate-pulse">Analyzing 14+ lakh candidates' data...</p>
                                                            </div>
                                                        )}

                                                        {/* Footer */}
                                                        {jeeCollegeResult && (
                                                            <div className="mt-8 pt-6 border-t border-theme-border text-center">
                                                                <p className="text-[9px] text-theme-muted uppercase tracking-widest">Generated by Aurem College Compass • Data Source: JoSAA 2024 • For educational purposes</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Download Bar */}
                                                    {jeeCollegeResult && (
                                                        <div className="px-6 pb-6 sm:px-8 sm:pb-8 flex flex-col sm:flex-row gap-3">
                                                            <button onClick={handleJeePdfDownload} className="flex-1 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40">
                                                                Download Full Report PDF <Download className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setActiveTab('college')} className="py-4 px-6 bg-theme-bg border border-theme-border text-theme-text rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:border-theme-primary transition-all">
                                                                Global Hunt <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                    )}

                                    {selectedExam === 'neet' && (
                                        <div className="space-y-4">
                                            <form onSubmit={handleNeetSubmit} className="glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                                                        <Activity className="w-6 h-6 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-theme-text">NEET UG 2026 Predictor</h3>
                                                        <p className="text-xs text-theme-muted">Marks → Rank classification → Medical Counseling</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <FormField label="Expected Marks (out of 720)">
                                                        <InputField type="number" step="1" min="0" max="720" value={neetForm.marks} onChange={e => setNeetForm({ ...neetForm, marks: e.target.value })} required />
                                                    </FormField>
                                                    <FormField label="Category">
                                                        <SelectField value={neetForm.category} onChange={e => setNeetForm({ ...neetForm, category: e.target.value })} options={[{ value: 'UR', label: 'Unreserved (UR)' }, { value: 'OBC', label: 'OBC' }, { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' }]} />
                                                    </FormField>
                                                    <FormField label="Home State">
                                                        <InputField value={neetForm.state} onChange={e => setNeetForm({ ...neetForm, state: e.target.value })} placeholder="State string (e.g. MH, UP, Delhi)" />
                                                    </FormField>
                                                    <FormField label="Counseling Preference">
                                                        <SelectField value={neetForm.preference} onChange={e => setNeetForm({ ...neetForm, preference: e.target.value })} options={[{ value: 'AIQ', label: 'All India Quota (15%)' }, { value: 'State', label: 'State Quota (85%)' }, { value: 'Both', label: 'Both' }]} />
                                                    </FormField>
                                                </div>
                                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:opacity-90 flex justify-center items-center h-12">
                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Predict Medical Career'}
                                                </button>
                                            </form>

                                            {(neetCollegeResult || neetRankData) && (
                                                <div className="glass-panel rounded-3xl p-6 border bg-theme-surface border-theme-border animate-fade-in">
                                                    <div ref={neetPdfRef} className="p-4 rounded-xl bg-theme-surface mb-4">
                                                        <div className="text-center mb-6">
                                                            <h2 className="text-2xl font-black text-theme-text uppercase">NEET UG Report</h2>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-3 mb-6">
                                                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-emerald-500 pb-1">Marks</p><p className="font-black text-lg text-theme-text">{neetRankData?.marks}/720</p></div>
                                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-blue-500 pb-1">Est Rank</p><p className="font-black text-lg text-theme-text">{neetRankData?.rank}</p></div>
                                                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-purple-500 pb-1">Category</p><p className="font-black text-lg text-theme-text">{neetRankData?.category}</p></div>
                                                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-orange-500 pb-1">Tier</p><p className="font-bold text-xs text-theme-text">{neetRankData?.tier}</p></div>
                                                        </div>
                                                        <div className="prose max-w-none text-theme-text text-sm"><MarkdownBlock text={neetCollegeResult || 'Analyzing cutoffs...'} /></div>
                                                    </div>
                                                    {neetCollegeResult && <button onClick={handleNeetPdfDownload} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs transition-colors hover:bg-emerald-600">Download Report <Download className="w-3 h-3 inline-block ml-2" /></button>}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedExam === 'cat' && (
                                        <div className="space-y-4">
                                            <form onSubmit={handleCatSubmit} className="glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-pink-500" />
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                                                        <Target className="w-6 h-6 text-purple-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-theme-text">CAT 2025 Predictor</h3>
                                                        <p className="text-xs text-theme-muted">IIM Shortlists → Composite Score Analytics</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                    <FormField label="Percentile">
                                                        <InputField type="number" step="0.01" max="100" value={catForm.percentile} onChange={e => setCatForm({ ...catForm, percentile: e.target.value })} required />
                                                    </FormField>
                                                    <FormField label="Category">
                                                        <SelectField value={catForm.category} onChange={e => setCatForm({ ...catForm, category: e.target.value })} options={[{ value: 'General', label: 'General' }, { value: 'NC-OBC', label: 'NC-OBC' }, { value: 'EWS', label: 'EWS' }]} />
                                                    </FormField>
                                                    <FormField label="Academic Stream">
                                                        <SelectField value={catForm.stream} onChange={e => setCatForm({ ...catForm, stream: e.target.value })} options={[{ value: 'Engineering', label: 'Engineer' }, { value: 'Non-Engineering', label: 'Non-Engineer' }]} />
                                                    </FormField>
                                                    <FormField label="Work Exp (Months)">
                                                        <InputField type="number" value={catForm.workEx} onChange={e => setCatForm({ ...catForm, workEx: e.target.value })} />
                                                    </FormField>
                                                </div>
                                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:opacity-90 flex justify-center items-center h-12">
                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Predict IIM Shortlists'}
                                                </button>
                                            </form>

                                            {(catCollegeResult || catResultData) && (
                                                <div className="glass-panel rounded-3xl p-6 border bg-theme-surface border-theme-border animate-fade-in">
                                                    <div ref={catPdfRef} className="p-4 rounded-xl bg-theme-surface mb-4">
                                                        <div className="text-center mb-6"><h2 className="text-2xl font-black text-theme-text uppercase">CAT Admissions Report</h2></div>
                                                        <div className="grid grid-cols-4 gap-3 mb-6">
                                                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-purple-500 pb-1">%ile</p><p className="font-black text-lg text-theme-text">{catResultData?.percentile}</p></div>
                                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-blue-500 pb-1">Segment</p><p className="font-black text-lg text-theme-text">{catResultData?.tier}</p></div>
                                                            <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-pink-500 pb-1">Stream</p><p className="font-bold text-xs text-theme-text">{catResultData?.stream}</p></div>
                                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-amber-500 pb-1">Category</p><p className="font-bold text-xs text-theme-text">{catResultData?.category}</p></div>
                                                        </div>
                                                        <div className="prose max-w-none text-theme-text text-sm"><MarkdownBlock text={catCollegeResult || 'Calculating composite scores...'} /></div>
                                                    </div>
                                                    {catCollegeResult && <button onClick={handleCatPdfDownload} className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold uppercase text-xs transition-colors hover:bg-purple-600">Download Report <Download className="w-3 h-3 inline-block ml-2" /></button>}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedExam === 'nda' && (
                                        <div className="space-y-4">
                                            <form onSubmit={handleNdaSubmit} className="glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-400 to-red-500" />
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                                                        <ShieldAlert className="w-6 h-6 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-theme-text">NDA Exam Predictor</h3>
                                                        <p className="text-xs text-theme-muted">Written Marks → SSB Clearance → Merit List</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <FormField label="Written Marks (Out of 900)">
                                                        <InputField type="number" step="1" max="900" value={ndaForm.marks} onChange={e => setNdaForm({ ...ndaForm, marks: e.target.value })} required />
                                                    </FormField>
                                                    <FormField label="Preferred Wing">
                                                        <SelectField value={ndaForm.wing} onChange={e => setNdaForm({ ...ndaForm, wing: e.target.value })} options={[{ value: 'Army', label: 'Indian Army' }, { value: 'Navy', label: 'Indian Navy' }, { value: 'Air Force', label: 'Indian Air Force' }]} />
                                                    </FormField>
                                                </div>
                                                <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:opacity-90 flex justify-center items-center h-12">
                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Predict Defense Career'}
                                                </button>
                                            </form>

                                            {(ndaCollegeResult || ndaResultData) && (
                                                <div className="glass-panel rounded-3xl p-6 border bg-theme-surface border-theme-border animate-fade-in">
                                                    <div ref={ndaPdfRef} className="p-4 rounded-xl bg-theme-surface mb-4">
                                                        <div className="text-center mb-6"><h2 className="text-2xl font-black text-theme-text uppercase">NDA Analytics Report</h2></div>
                                                        <div className="grid grid-cols-4 gap-3 mb-6">
                                                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-orange-500 pb-1">Marks</p><p className="font-black text-lg text-theme-text">{ndaResultData?.marks}</p></div>
                                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-red-500 pb-1">Wing Target</p><p className="font-black text-sm text-theme-text">{ndaResultData?.wing}</p></div>
                                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-blue-500 pb-1">Expected Cutoff</p><p className="font-black text-lg text-theme-text">{ndaResultData?.expectedCutoff}</p></div>
                                                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center"><p className="text-[9px] uppercase font-bold text-emerald-500 pb-1">Chances</p><p className="font-bold text-xs text-theme-text">{ndaResultData?.tier}</p></div>
                                                        </div>
                                                        <div className="prose max-w-none text-theme-text text-sm"><MarkdownBlock text={ndaCollegeResult || 'Extracting SSB guidelines...'} /></div>
                                                    </div>
                                                    {ndaCollegeResult && <button onClick={handleNdaPdfDownload} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold uppercase text-xs transition-colors hover:bg-orange-600">Download Report <Download className="w-3 h-3 inline-block ml-2" /></button>}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    )}


                    {/* ═══ ESSAY EXPERT TAB (MERGED: Coach + Grader) ═══ */}
                    {activeTab === 'essay' && (
                        <div className="animate-fade-in space-y-6 relative">
                            {/* ── UNDER DEVELOPMENT BANNER ── */}
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 animate-slide-up">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xl">🚧</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-1">Under Development</h4>
                                    <p className="text-xs text-theme-muted leading-relaxed">
                                        Essay generation quality is currently limited due to the low-quality AI model powering this feature. Essays may lack depth, repeat patterns, or degrade across iterations.
                                        We are actively upgrading to a premium model that will deliver <strong className="text-amber-400">Ivy-level essay writing</strong>. Stay tuned — a major upgrade is coming soon.
                                    </p>
                                </div>
                            </div>
                            <form onSubmit={handleEssaySubmit} className={`glass-panel p-6 rounded-3xl shadow-2xl border bg-theme-surface border-theme-border relative overflow-hidden`}>
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

                                {/* ─── ENHANCED: Auto-Generate Section ─── */}
                                <div className="p-5 mb-6 rounded-2xl bg-gradient-to-r from-amber-500/5 to-rose-500/5 border border-amber-500/20">
                                    <h4 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> AI Essay Generator
                                    </h4>
                                    <p className="text-xs text-theme-muted mb-4 leading-relaxed">
                                        The more details you give, the better your draft. Tell us your story — even a rough description helps the AI craft something authentic and compelling. We'll also pull context from your Career &amp; College tabs if available.
                                    </p>

                                    {/* Profile Summary Indicator */}
                                    {(studentProfile.extracurriculars || studentProfile.hobbies || studentProfile.uploadedDocs) && (
                                        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">✅ Profile Data Loaded</p>
                                            <p className="text-xs text-theme-muted">
                                                The AI already knows: {[
                                                    studentProfile.hobbies && 'your hobbies',
                                                    studentProfile.passions && 'your passions',
                                                    studentProfile.extracurriculars && 'your extracurriculars',
                                                    studentProfile.gpa && 'your GPA',
                                                    studentProfile.major && 'your target major',
                                                    studentProfile.uploadedDocs && `uploaded doc: "${studentProfile.uploadedFileName}"`,
                                                ].filter(Boolean).join(', ') || 'nothing yet — fill in Career or College tabs first'}.
                                            </p>
                                        </div>
                                    )}

                                    {/* Document Upload Zone */}
                                    <div className="mb-4">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full p-4 rounded-xl border-2 border-dashed border-theme-border hover:border-amber-500/50 bg-theme-bg/50 cursor-pointer transition-all text-center group"
                                        >
                                            <FileText className="w-6 h-6 mx-auto mb-2 text-theme-muted group-hover:text-amber-500 transition-colors" />
                                            <p className="text-xs font-bold text-theme-muted group-hover:text-theme-text transition-colors">
                                                {studentProfile.uploadedFileName
                                                    ? `📎 "${studentProfile.uploadedFileName}" loaded — click to replace`
                                                    : 'Upload Resume, Achievement List, or Prior Essays (PDF / TXT)'
                                                }
                                            </p>
                                            <p className="text-[10px] text-theme-muted mt-1">Your achievements will be automatically included in every AI call</p>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" />
                                    </div>

                                    {/* Key Story */}
                                    <FormField label="⭐ Your Key Story / Anecdote (Most Important)">
                                        <TextareaField value={essayStory} onChange={e => setEssayStory(e.target.value)} rows="4" placeholder="Describe a specific moment, challenge, or realization you want the essay to revolve around. Example: 'When I was 14, my science fair project failed spectacularly in front of 200 people. Instead of quitting, I redesigned it overnight and won 2nd place the next day. That failure taught me...' — The more specific and personal, the better!" />
                                    </FormField>

                                    {/* Core Trait & Tone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <FormField label="💎 Core Trait to Highlight">
                                            <InputField value={essayTrait} onChange={e => setEssayTrait(e.target.value)} placeholder="e.g. Resilience, Intellectual Curiosity, Empathy, Leadership..." />
                                        </FormField>
                                        <FormField label="🎨 Essay Tone">
                                            <SelectField value={essayTone} onChange={e => setEssayTone(e.target.value)} options={[
                                                { value: 'Reflective', label: '🪞 Reflective & Poetic' },
                                                { value: 'Analytical', label: '🔬 Analytical & Direct' },
                                                { value: 'Humorous', label: '😄 Humorous & Witty' },
                                                { value: 'Bold', label: '⚡ Bold & Unconventional' },
                                                { value: 'Narrative', label: '📖 Storytelling & Cinematic' },
                                            ]} />
                                        </FormField>
                                    </div>

                                    {/* Additional Instructions */}
                                    <div className="mt-4" id="essay-prompt-input">
                                        <FormField label="📝 Additional Instructions (Optional)">
                                            <TextareaField value={essayPrompt} onChange={e => setEssayPrompt(e.target.value)} rows="2" placeholder="Any extra details: themes to weave in, things to avoid, specific achievements to mention..." />
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
                                                onClick={handleAutoFixEssay}
                                                disabled={isLoading}
                                                className="mt-6 w-full py-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : essayScore >= 8 ? (
                                                    "Keep Grinding for a Perfect 10 ✨"
                                                ) : (
                                                    "Auto-Fix Draft Using Feedback ✨"
                                                )}
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
