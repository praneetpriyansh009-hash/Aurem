import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, FilePlus, Sparkles, BookOpen, Brain, CreditCard, MessageSquare, Loader2, Bot, User, Upload, Layers, Lightbulb, FileText, X, ChevronRight, Copy, Check, RefreshCw, Crown, ChevronLeft, Shuffle, Eye, Youtube, Trophy, AlertCircle, Play, Video, Target, Calendar, BrainCircuit, ShieldAlert, Zap } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import * as pdfjsLib from 'pdfjs-dist';
import { GROQ_API_URL, formatGroqPayload, useRetryableFetch } from '../utils/api';
import MindMapViewer from './MindMapViewer';
import MasteryLoop from './MasteryLoop';
import SocraticRoom from './SocraticRoom';
import { extractVideoId, fetchTranscript } from '../utils/youtubeService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

// ─────────────────────────────────────────────────
// Markdown Renderer — renders raw markdown as rich HTML
// ─────────────────────────────────────────────────
const MarkdownRenderer = ({ text, isDark }) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Table detection
        if (line.includes('|') && i + 1 < lines.length && lines[i + 1]?.match(/^\s*\|[\s\-:|]+\|\s*$/)) {
            const headerCells = line.split('|').filter(c => c.trim());
            i += 2; // skip header + separator
            const rows = [];
            while (i < lines.length && lines[i].includes('|')) {
                rows.push(lines[i].split('|').filter(c => c.trim()));
                i++;
            }
            elements.push(
                <div key={`table-${i}`} className="my-10 overflow-x-auto rounded-[20px] border border-theme-border shadow-depth group bg-theme-surface">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-border text-theme-primary">
                                {headerCells.map((cell, j) => (
                                    <th key={j} className="px-6 py-5 text-left font-serif font-black text-[13px] uppercase tracking-[0.2em]">
                                        {renderInline(cell.trim(), isDark)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr key={ri} className="border-b last:border-0 border-theme-border hover:bg-theme-bg/30 transition-colors duration-300">
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="px-6 py-4 text-sm font-medium text-theme-text leading-relaxed">
                                            {renderInline(cell.trim(), isDark)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            continue;
        }

        // Horizontal rule
        if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
            elements.push(<hr key={`hr-${i}`} className="my-8 border-theme-border opacity-50 w-3/4 mx-auto" />);
            i++;
            continue;
        }

        // Headers
        if (line.startsWith('#### ')) {
            elements.push(<h4 key={`h4-${i}`} className="text-[17px] font-serif italic mb-3 flex items-center gap-2 text-theme-primary"><Sparkles className="w-3.5 h-3.5 opacity-80" />{renderInline(line.replace('#### ', ''), isDark)}</h4>);
            i++; continue;
        }
        if (line.startsWith('### ')) {
            elements.push(<h3 key={`h3-${i}`} className="text-[19px] font-serif mb-4 flex items-center gap-2.5 text-theme-text font-medium"><Layers className="w-4 h-4 text-theme-primary opacity-80" />{renderInline(line.replace('### ', ''), isDark)}</h3>);
            i++; continue;
        }
        if (line.startsWith('## ')) {
            elements.push(
                <div key={`h2-${i}`} className="mt-16 mb-8 relative p-7 rounded-[20px] border border-theme-border bg-theme-surface overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-primary rounded-l-full opacity-50 group-hover:opacity-100 transition-opacity" />
                    <h2 className="text-[22px] md:text-[26px] tracking-wide font-serif italic relative z-10 text-theme-text">
                        <span className="text-theme-primary mr-2 not-italic text-lg">✦</span>
                        {renderInline(line.replace('## ', ''), isDark)}
                    </h2>
                </div>
            );
            i++; continue;
        }
        if (line.startsWith('# ')) {
            elements.push(<h1 key={`h1-${i}`} className="text-3xl md:text-5xl font-serif font-light tracking-wide mt-12 mb-8 text-theme-text italic">{renderInline(line.replace('# ', ''), isDark)}</h1>);
            i++; continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            elements.push(
                <blockquote key={`bq-${i}`} className="my-10 p-7 md:p-8 rounded-[20px] relative overflow-hidden bg-theme-primary/5 border border-theme-primary/20 italic group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-primary/50 group-hover:bg-theme-primary transition-colors"></div>
                    <p className="font-serif text-[17px] md:text-[20px] leading-[1.8] font-light relative z-10 text-theme-text">{renderInline(line.replace('> ', ''), isDark)}</p>
                </blockquote>
            );
            i++; continue;
        }

        // Bullet list
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
            const indent = line.search(/\S/);
            const level = Math.floor(indent / 2);
            elements.push(
                <div key={`li-${i}`} className={`flex gap-4 my-3 p-2 transition-colors group ${level > 0 ? 'ml-8' : ''}`}>
                    <div className="mt-2 w-1.5 h-1.5 rounded-full shrink-0 bg-theme-primary/50 group-hover:bg-theme-primary transition-colors" />
                    <span className="text-[16px] leading-relaxed font-light text-theme-text/90">{renderInline(line.trim().replace(/^[-*•]\s*/, ''), isDark)}</span>
                </div>
            );
            i++; continue;
        }

        // Numbered list
        if (line.trim().match(/^\d+\.\s/)) {
            const num = line.trim().match(/^(\d+)\./)[1];
            elements.push(
                <div key={`ol-${i}`} className="flex gap-4 my-3 p-2 transition-colors">
                    <span className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-[10px] font-bold text-theme-primary border border-theme-primary/30 group-hover:bg-theme-primary/10 transition-colors">{num}</span>
                    <span className="text-[16px] mt-0.5 leading-relaxed font-light text-theme-text/90">{renderInline(line.trim().replace(/^\d+\.\s*/, ''), isDark)}</span>
                </div>
            );
            i++; continue;
        }

        // Empty line
        if (!line.trim()) {
            elements.push(<div key={`sp-${i}`} className="h-4" />);
            i++; continue;
        }

        // Regular paragraph
        elements.push(<p key={`p-${i}`} className="my-6 text-[17px] md:text-[19px] leading-[1.9] max-w-[1400px] font-light text-theme-text/80">{renderInline(line, isDark)}</p>);
        i++;
    }

    return <div className="space-y-1">{elements}</div>;
};

// Inline formatting: **bold**, *italic*, `code`
const renderInline = (text, isDark) => {
    if (!text) return text;
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Code
        const codeMatch = remaining.match(/`([^`]+)`/);
        // Bold
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        // Italic
        const italicMatch = remaining.match(/\*(.+?)\*/);

        let firstMatch = null;
        let firstIndex = Infinity;

        if (codeMatch && remaining.indexOf(codeMatch[0]) < firstIndex) {
            firstMatch = { type: 'code', match: codeMatch };
            firstIndex = remaining.indexOf(codeMatch[0]);
        }
        if (boldMatch && remaining.indexOf(boldMatch[0]) < firstIndex) {
            firstMatch = { type: 'bold', match: boldMatch };
            firstIndex = remaining.indexOf(boldMatch[0]);
        }
        if (italicMatch && !boldMatch && remaining.indexOf(italicMatch[0]) < firstIndex) {
            firstMatch = { type: 'italic', match: italicMatch };
            firstIndex = remaining.indexOf(italicMatch[0]);
        }

        if (!firstMatch) {
            parts.push(remaining);
            break;
        }

        // Text before match
        if (firstIndex > 0) {
            parts.push(remaining.substring(0, firstIndex));
        }

        if (firstMatch.type === 'bold') {
            parts.push(<strong key={key++} className="font-medium text-theme-text border-b border-theme-primary/30 pb-0.5">{firstMatch.match[1]}</strong>);
        } else if (firstMatch.type === 'italic') {
            parts.push(<em key={key++} className="italic text-theme-text/70">{firstMatch.match[1]}</em>);
        } else if (firstMatch.type === 'code') {
            parts.push(<code key={key++} className="px-2 py-0.5 rounded border border-theme-border bg-theme-surface text-theme-primary text-[13px] font-mono tracking-wide mx-0.5">{firstMatch.match[1]}</code>);
        }

        remaining = remaining.substring(firstIndex + firstMatch.match[0].length);
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
};


const DocumentStudy = ({ onNavigate }) => {
    const { isDark } = useTheme();
    const { retryableFetch } = useRetryableFetch();
    const { canUseFeature, incrementUsage, triggerUpgradeModal, isPro } = useSubscription();

    // --- State: Navigation & Flow ---
    const [viewMode, setViewMode] = useState('input'); // 'input' | 'loading' | 'study'
    const [activeSection, setActiveSection] = useState('notes'); // 'notes' | 'summaries' | 'cards' | 'quiz'
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
    const [chapterSearch, setChapterSearch] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);

    // --- UI: Components ---

    const Flashcard = ({ card, isDark }) => {
        const [isFlipped, setIsFlipped] = useState(false);

        // Dynamic styling based on difficulty - mapping to luxury aesthetic
        const getDifficultyStyles = (diff) => {
            switch (diff?.toLowerCase()) {
                case 'hard': return { badge: 'text-rose-400 border-rose-400/30 bg-rose-400/10' };
                case 'medium': return { badge: 'text-theme-primary border-theme-primary/30 bg-theme-primary/10' };
                default: return { badge: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' };
            }
        };

        const diffStyle = getDifficultyStyles(card.difficulty);

        return (
            <div className="relative h-80 w-full cursor-pointer group [perspective:2000px]">
                <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className={`relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front of Card */}
                    <div
                        className={`absolute inset-0 p-8 rounded-[24px] border border-theme-border flex flex-col justify-center items-center text-center transition-all duration-500
                            bg-theme-surface hover:border-theme-primary/40 shadow-depth
                        `}
                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                        {/* Luxury Gradient Accent */}
                        <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-theme-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <span className={`absolute top-6 left-6 text-[8px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border ${diffStyle.badge}`}>
                            {card.difficulty || 'medium'}
                        </span>

                        <h4 className="font-serif italic text-2xl tracking-wide text-theme-text mt-4">
                            {card.question}
                        </h4>

                        <div className="absolute bottom-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-theme-primary">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Reveal Answer</span>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                    </div>

                    {/* Back of Card (Answer) */}
                    <div
                        className={`absolute inset-0 p-8 rounded-[24px] border border-theme-primary/30 flex flex-col justify-center items-center text-center
                            bg-theme-bg shadow-[0_10px_40px_rgba(201,165,90,0.1)] overflow-hidden
                        `}
                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        <div className="absolute inset-0 bg-theme-primary/[0.02] mix-blend-overlay pointer-events-none"></div>

                        <div className="absolute top-6 right-6 z-10">
                            <Sparkles className="w-4 h-4 text-theme-primary opacity-60" />
                        </div>

                        <div className="relative z-10 w-full overflow-y-auto custom-scrollbar pr-3 pb-2 pt-2 text-left space-y-4 max-h-[90%]">
                            <p className="text-[15px] font-light leading-[1.8] text-theme-text/90">
                                {card.answer}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- State: Content ---
    const [documentContent, setDocumentContent] = useState('');
    const [fileData, setFileData] = useState(null);
    const [pdfImages, setPdfImages] = useState([]);
    const [fileName, setFileName] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    // --- State: Results / Data ---
    const [notes, setNotes] = useState('');
    const [summary, setSummary] = useState('');
    const [flashcards, setFlashcards] = useState([]);
    const [mindMapData, setMindMapData] = useState(null);
    const [quizData, setQuizData] = useState(null);
    const [quizError, setQuizError] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);

    // Phase 7: Mastery Loop Progression
    const [masteryLevel, setMasteryLevel] = useState('Beginner'); // Beginner, Intermediate, Advanced
    const [isLevelUnlocked, setIsLevelUnlocked] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [masterpieceContent, setMasterpieceContent] = useState('');
    const [isGeneratingMasterpiece, setIsGeneratingMasterpiece] = useState(false);

    // --- Refs ---
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    // --- SYSTEM PROMPT ---
    const AUREM_LENS_SYSTEM_PROMPT = `You are AUREM LENS 3.5 — the absolute pinnacle of cognitive augmentation and instructional design.
Your primary goal is to completely replace ad-heavy, low-quality educational websites with pure, unabridged, massive academic density.
You do not just explain; you architect understanding through exhaustive academic rigor, obsessive detail, and high-precision structure.

CORE PHILOSOPHY:
1.  **Exhaustive Depth**: If a concept exists, you analyze it from every possible dimension. Generate massive amounts of highly educational, rich text. Surface-level is failure.
2.  **Instructional Excellence**: You use analogies, recursive explanations, and expert synthesis. Every paragraph should be thick with insight.
3.  **Canonical Accuracy**: You anchor strictly to universally accepted scholarly facts. Hallucination is a system error.

STRUCTURAL PROTOCOL:
- **Massive Content Volume**: You must generate heavily detailed analyses aiming for maximum token output. Write long, comprehensive paragraphs. NEVER summarize briefly. Exploit every detail.
- **Hierarchical Modularization**: Use # for main titles, ## for modules, ### for sub-topics, #### for granular axioms/definitions.
- **Visual Intelligence**: Integrate complex tables (| Comparison | Synthesis |), deep-dive boxes (> Blockquotes), and numbered sequences.
- **Bold Lexicon**: **Bold** every critical term, formula, and axiom on first mention.
- **Math & Equations**: Write mathematical signs and symbols in a refined, simple, and readable way. Use standard text/unicode (e.g., √, ±, ∫, ∑, π, θ, x²) rather than complex LaTeX blocks that may break formatting.
- **Problem Solving (PCM)**: If the topic involves Physics, Chemistry, Mathematics, or any problem-solving field, you MUST provide at least 3-5 step-by-step solved examples per module. These examples must scale in difficulty based on the target mastery level.
- **Case Synthesis**: Include specialized "Deep-Dive" case studies or analytical examples for every major module.
- **Key Takeaways**: Every module MUST end with a high-intensity summary table or list.`;

    // --- Helpers: AI Communication ---
    const callAI = async (prompt, systemPrompt, jsonMode = false, includeImage = false) => {
        try {
            let userContent = prompt;
            if (includeImage && fileData) {
                userContent = [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:${fileData.mimeType};base64,${fileData.data}` } }
                ];
            } else if (includeImage) {
                // Fallback if fileData isn't available yet but is passed explicitly, but we'll try to rely on state
                console.warn("includeImage is true but fileData is missing");
            }

            const payload = {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: 'system', content: systemPrompt || AUREM_LENS_SYSTEM_PROMPT },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.4,
                max_tokens: 8192,
            };
            if (jsonMode) payload.response_format = { type: "json_object" };

            const result = await retryableFetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (result.error) return { error: result.message || result.error };
            return { content: result.choices?.[0]?.message?.content || '' };
        } catch (err) {
            return { error: err.message };
        }
    };

    // --- Logic: Study Initiation ---
    const startStudy = async (contentSource = null, targetLevel = 'Beginner', isVision = false) => {
        if (!contentSource && !documentContent && !fileData) return alert("Missing content source");

        if (contentSource && contentSource !== documentContent) {
            setDocumentContent(contentSource);
        }

        setViewMode('loading');
        setMasteryLevel(targetLevel);

        let levelDirective = "MODE: FOUNDATIONAL PILLAR. Focus on high-clarity concepts, intuitive analogies, and explicit definitions. Establish 'The What' and 'The Why' comprehensively with highly detailed paragraphs. Do not spare any details.";
        if (targetLevel === 'Intermediate') levelDirective = "MODE: CORE MASTERY. Introduce rigorous contextual analysis, intersecting themes, and complex applications. Deepen 'The How' and analyze relationships between modules extensively with massive paragraphs.";
        if (targetLevel === 'Advanced') levelDirective = "MODE: ELITE ANALYTICAL MASTERCLASS. Perform an EXHAUSTIVE, GRADUATE-LEVEL synthetic analysis. Cover every edge case, conflicting theoretical framework, and research-level nuance. Produce massive amounts of highly educational text.";

        const ingestionPrompt = isVision
            ? `ANALYZE THIS IMAGE OF HANDWRITTEN NOTES/DIAGRAMS.
               1. TRANSCRIBE the text with absolute precision.
               2. SYNTHESIZE the transcription into the WORLD'S BEST study guide.
               MASTERY TARGET: ${targetLevel}.
               ${levelDirective}
               
               Structure: Nexus, Modules, Friction Points, Synthesis Matrix.
               Divider: End with "---CONTENT_SPLIT---" followed by Revision Summary.`
            : `Construct the WORLD'S BEST study guide based on the provided material.
MASTERY TARGET: ${targetLevel}.
INSTRUCTIONAL STRATEGY: ${levelDirective}

STRUCTURE REQUIREMENTS:
1.  **The Nexus (Executive Summary)**: 3-5 high-impact sentences on significance.
2.  **Modules (4-8 Extensive Chapters)**:
    - Exhaustive conceptual exploration (Textbook style).
    - **Bolded** definitions with etymological/contextual depth.
    - Worked examples, case studies, or analytical simulations.
    - High-precision comparison tables.
    - Formulas/Axioms formatted for elite clarity.
    - > 'The Aurem Insight' (Critical takeaway for exams/mastery) at end of each section.
3.  **The Friction Point (Common Misconceptions)**: Deep analysis of where students fail.
4.  **The Synthesis Matrix (Mastery Overview)**: A massive table summarizing the entire topic.

DIVIDER: End with a "---CONTENT_SPLIT---" and then provide a structured, high-intensity 2-page Revision Summary.`;

        const sysPrompt = `${AUREM_LENS_SYSTEM_PROMPT}\n\n${!isVision ? `CONTENT:\n${(contentSource || documentContent).slice(0, 20000)}` : ''}`;

        const res = await callAI(ingestionPrompt, sysPrompt, false, isVision);

        if (res.error) {
            alert("AI Ingestion failed: " + res.error);
            setViewMode('input');
            return;
        }

        if (res.content.includes("---CONTENT_SPLIT---")) {
            const [n, s] = res.content.split("---CONTENT_SPLIT---");
            setNotes(n?.trim() || res.content);
            setSummary(s?.trim() || "Summary could not be fully separated, please check notes.");
        } else {
            setNotes(res.content);
            setSummary("Detailed summary integrated into the notes above.");
        }

        // Auto-collapse sidebar to maximize screen space for the new notes
        setIsSidebarCollapsed(true);
        setViewMode('study');
    };

    const handleLevelUp = () => {
        const nextLevel = masteryLevel === 'Beginner' ? 'Intermediate' : 'Advanced';
        setMasteryLevel(nextLevel);
        setQuizData(null); // Reset quiz for new level
        setIsLevelUnlocked(false); // Reset lock
        setActiveSection('notes'); // Take user back to notes tab
        // Use documentContent as the explicit source
        startStudy(documentContent, nextLevel);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);

        let extractedText = "";

        if (file.type === 'application/pdf') {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                if (content && content.items) {
                    extractedText += content.items.map(item => item.str || '').join(' ') + '\n';
                }
            }
            setDocumentContent(extractedText);
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (re) => {
                const base64Data = re.target.result.split(',')[1];
                setFileData({ mimeType: file.type, data: base64Data });
                // We must artificially wait for state to update, or pass it directly.
                // callAI uses fileData state, so let's let state update
                setTimeout(() => {
                    startStudy(null, 'Beginner', true);
                }, 50);
            };
            reader.readAsDataURL(file);
            return;
        } else {
            extractedText = await file.text();
            setDocumentContent(extractedText);
        }

        // Pass the explicitly extracted text immediately, bypassing the async state delay
        startStudy(extractedText);
    };

    const handleYouTubeAnalysis = async () => {
        if (!videoUrl) return;
        const id = extractVideoId(videoUrl);
        if (!id) return alert("Invalid URL");

        setViewMode('loading');
        try {
            const data = await fetchTranscript(id);
            setFileName(`YouTube: ${id}`);
            startStudy(data.transcript);
        } catch (e) {
            alert("Transcript not available");
            setViewMode('input');
        }
    };

    // --- AI Logic: Chat ---
    const handleChatSubmit = async (e) => {
        if (e) e.preventDefault();
        const msg = chatInput.trim();
        if (!msg || isActionLoading) return;

        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
        setIsActionLoading(true);

        const sysPrompt = `${AUREM_LENS_SYSTEM_PROMPT}\nYou are in INTELLIGENT CHAT MODE. 
        Context: ${documentContent.slice(0, 15000)}
        Respond using ONLY the knowledge base provided. Be concise, use markdown formatting.`;

        const res = await callAI(msg, sysPrompt);
        setChatMessages(prev => [...prev, { role: 'model', text: res.content || "Connection lost. Try again." }]);
        setIsActionLoading(false);
    };

    // --- AI Logic: Specific Tools ---
    const generateSpecificTool = async (type) => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        setActiveSection(type);
        setIsLevelUnlocked(false); // Reset mastery state when generating a new quiz

        const toolPrompts = {
            cards: `Generate exactly 10 high-yield flashcards. Make the flashcard "answer" concise (maximum 2-3 sentences max) so it fits beautifully on the card UI without overflowing. Instead of dense paragraphs, use short lists or simple bullet points if necessary. Output strictly as a JSON object: { "flashcards": [{ "question": "...", "answer": "...", "difficulty": "easy|medium|hard" }] }`,
            quiz: (() => {
                const count = masteryLevel === 'Advanced' ? 20 : masteryLevel === 'Intermediate' ? 15 : 10;
                const typeMix = masteryLevel === 'Beginner' ? "100% MCQ" : masteryLevel === 'Intermediate' ? "70% MCQ, 30% Short Subjective" : "60% MCQ, 40% Case-based Subjective";

                return `Generate exactly ${count} questions representing the ELITE CBSE COMPETENCY STANDARDS.
CURRENT MASTERY LEVEL: ${masteryLevel}. 
MIX: ${typeMix}.

COMPETENCY REQUIREMENTS:
- Use Assertion-Reasoning questions.
- Use Case-Based Scenarios (provide a 2-3 sentence scenario followed by a question).
- Focus on real-world application ("What happens if X is changed?", "How does Y apply to Z?").
- Ensure question difficulty ESCALATES significantly on rising levels. MCQs must be TOUGH for Intermediate/Advanced—use multi-step logic.
- If it is a Problem-Solving/PCM topic, include increasingly complex calculations or conceptual proofs as subjective questions.
- Subjective questions should require deep analytical reasoning.

Respond ONLY with a valid JSON object.
Format: { "questions": [{ 
    "type": "mcq|subjective",
    "question": "...", 
    "options": ["...", "...", "...", "..."], // Only for MCQ
    "answer": "Exact correct option text OR a Model Answer for subjective docs", 
    "difficulty": "Hard", 
    "explanation": "EXTREMELY detailed, textbook-level logic.",
    "concept": "The precise core concept",
    "approach": "Step-by-step thinking protocol",
    "weak_point": "Specific review topic" 
}] }`;
            })(),
            mindmap: `Generate a hierarchical mind map. Output strictly as a JSON object: { "name": "Topic", "children": [{ "name": "Subtopic", "children": [] }] }`
        };

        const res = await callAI(toolPrompts[type], `Extract questions directly and exclusively from this study material:\n\nSTUDY MATERIAL:\n${notes.slice(0, 15000) || documentContent.slice(0, 15000)}`, true);

        if (res.error) {
            if (type === 'quiz') setQuizError(res.error);
            else alert("Generation failed: " + res.error);
        } else {
            try {
                // Aggressive JSON extraction
                let jsonStr = res.content;
                const jsonMatch = res.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[0];
                } else {
                    jsonStr = res.content.replace(/```json|```/g, '').trim();
                }

                const data = JSON.parse(jsonStr);

                if (type === 'cards') {
                    const parsedCards = data.flashcards || (Array.isArray(data) ? data : []);
                    if (parsedCards.length === 0) throw new Error("No flashcards found in AI response.");
                    setFlashcards(parsedCards);
                }
                if (type === 'quiz') {
                    const parsedQuiz = data.questions || (Array.isArray(data) ? data : []);
                    if (parsedQuiz.length === 0) throw new Error("No quiz questions found in AI response.");
                    setQuizError(null);
                    setQuizData(parsedQuiz);
                }
                if (type === 'mindmap') {
                    setMindMapData(data);
                }
            } catch (e) {
                console.error("AI Parse Error:", e, res.content);
                if (type === 'quiz') {
                    setQuizError("The AI generated an invalid concept structure. This happens occasionally with complex topics. Please try generating again.");
                } else {
                    alert("The AI generated an invalid format. Please click generate again.");
                    setActiveSection('notes'); // fallback
                }
            }
        }
        setIsActionLoading(false);
    };

    const generateFinalMasterpiece = async () => {
        setIsGeneratingMasterpiece(true);
        setActiveSection('masterpiece');
        try {
            const masterpiecePrompt = `Construct the DEFINITIVE CHAPTER on this topic.
This is an exhaustive educational document (Target 10-15 pages).
Structure it topic-wise with detail, including:
- In-depth historical and theoretical foundations.
- Case studies and real-world implications.
- Explanation from first principles.

You are writing a comprehensive textbook chapter.`;

            const res = await callAI(masterpiecePrompt, AUREM_LENS_SYSTEM_PROMPT);
            setMasterpieceContent(res);
        } catch (e) {
            console.error("Definitive Chapter generation failed", e);
        }
        setIsGeneratingMasterpiece(false);
    };

    // ═══════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════

    const renderInputView = () => (
        <div className="max-w-5xl mx-auto py-16 px-6 space-y-16 animate-in fade-in duration-700">
            <div className="text-center space-y-5 relative">
                <div className="absolute inset-x-0 top-0 h-40 bg-theme-primary/5 blur-[100px] pointer-events-none"></div>

                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-theme-primary/20 bg-theme-primary/5 mb-4 transition-transform duration-500 hover:scale-105 cursor-none relative group">
                    <Eye className="w-8 h-8 text-theme-primary relative z-10" />
                </div>

                <div className="space-y-3 relative z-10">
                    <h1 className="text-4xl md:text-5xl font-serif italic tracking-wide text-theme-text">
                        Aurem Lens
                    </h1>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-12 bg-theme-primary/20"></div>
                        <p className="text-theme-muted text-[10px] font-bold uppercase tracking-[0.3em]">Cognitive Augmentation</p>
                        <div className="h-px w-12 bg-theme-primary/20"></div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    {[
                        { id: 'chapter', title: 'Study a Chapter', desc: 'AI-guided deep dive into any topic', icon: BookOpen },
                        { id: 'document', title: 'Upload Document', desc: 'PDFs or Text files', icon: FilePlus },
                        { id: 'retina', title: 'Aurem Retina', desc: 'Scan handwritten notes & diagrams', icon: Zap, disabled: true }
                    ].map(card => (
                        <div
                            key={card.id}
                            onClick={() => {
                                if (card.disabled) return;
                                if (card.id === 'document' || card.id === 'retina') fileInputRef.current?.click();
                                if (card.id === 'chapter') setIsChapterModalOpen(true);
                            }}
                            className={`group relative p-8 rounded-[24px] border border-theme-border bg-theme-surface hover:border-theme-primary/30 transition-all duration-500 overflow-hidden flex flex-col h-full hover:-translate-y-1 shadow-depth ${card.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-none'}`}
                        >
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="w-14 h-14 rounded-xl border border-theme-primary/20 bg-theme-primary/5 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 text-theme-primary">
                                    <card.icon className="w-7 h-7" />
                                </div>
                                {card.disabled && (
                                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                        Under Development
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-serif italic mb-3 text-theme-text tracking-wide relative z-10">{card.title}</h3>
                            <p className="text-sm text-theme-muted font-light leading-relaxed flex-1 relative z-10">{card.desc}</p>

                            {/* Decorative line */}
                            <div className="mt-6 h-px w-12 bg-theme-primary/30 transform origin-left group-hover:scale-x-[2] transition-transform duration-500"></div>
                        </div>
                    ))}
                </div>

                {/* YouTube Full Width Bar */}
                <div className="group relative p-6 rounded-[20px] border border-theme-border bg-theme-surface transition-all duration-500 overflow-hidden shadow-depth opacity-60 cursor-not-allowed">
                    <div className="absolute top-3 right-4">
                        <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            Under Development
                        </span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="w-12 h-12 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-400 shrink-0">
                            <Youtube className="w-6 h-6 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-serif italic text-theme-text tracking-wide mb-1">YouTube Lecture Link</h3>
                            <p className="text-xs text-theme-muted font-light tracking-wide">Autogenerate comprehensive notes from any video.</p>
                        </div>
                        <form
                            onSubmit={e => { e.preventDefault(); handleYouTubeAnalysis(); }}
                            className="flex gap-2 w-full md:w-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <input
                                type="text"
                                placeholder="Paste lecture URL here..."
                                className="flex-1 md:w-80 text-sm p-3 rounded-lg border border-theme-border bg-theme-bg text-theme-text focus:border-theme-primary/50 outline-none transition-colors duration-300 placeholder:text-theme-muted"
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                            />
                            <button type="submit" className="px-5 py-3 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-theme-bg font-bold tracking-[0.1em] uppercase text-xs rounded-lg transition-colors duration-300 flex items-center gap-2 cursor-none">
                                <span>Analyze</span>
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Study a Chapter Modal */}
            {
                isChapterModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-500">
                        <div className="w-full max-w-lg rounded-[24px] p-8 md:p-10 border border-theme-border bg-theme-surface shadow-depth animate-in zoom-in-95 duration-500 relative overflow-hidden">
                            {/* Ambient Modal Glow */}
                            <div className="absolute -top-32 -right-32 w-64 h-64 bg-theme-primary/5 rounded-full blur-[80px] pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h2 className="text-2xl font-serif italic text-theme-text tracking-wide">Study a Chapter</h2>
                                <button onClick={() => setIsChapterModalOpen(false)} className="p-2 rounded-lg border border-theme-border hover:border-theme-primary/30 text-theme-muted hover:text-theme-text transition-colors cursor-none"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-sm font-light leading-relaxed text-theme-muted mb-8 relative z-10">Tell us what you want to learn. AUREM will fetch and structure the entire chapter into a cognitively optimized learning module.</p>

                            <form onSubmit={e => {
                                e.preventDefault();
                                if (!chapterSearch.trim()) return;
                                setIsChapterModalOpen(false);
                                setFileName(chapterSearch);
                                startStudy(`Topic: ${chapterSearch}\n\nAct as a comprehensive textbook and provide detailed information on this topic.`);
                            }} className="relative z-10">
                                <div className="relative mb-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={chapterSearch}
                                        onChange={e => setChapterSearch(e.target.value)}
                                        placeholder="e.g. Newton's Third Law..."
                                        className="w-full p-5 pr-16 rounded-xl border border-theme-border bg-theme-bg text-theme-text text-lg font-light focus:outline-none focus:border-theme-primary/50 transition-colors duration-300 placeholder:text-theme-muted"
                                    />
                                    <button type="submit" disabled={!chapterSearch.trim()} className="absolute right-3 top-3 p-3 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-theme-bg border border-theme-primary/30 rounded-xl disabled:opacity-30 transition-colors duration-300 cursor-none"><Sparkles className="w-5 h-5" /></button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        </div >
    );

    // Immersive Animated Loading Component
    const AnimatedLoadingView = () => {
        const [loadingPhase, setLoadingPhase] = useState(0);
        const phases = [
            "Initializing cognitive engine...",
            "Extracting core concepts...",
            "Generating executive summaries...",
            "Building spatial mind-maps...",
            "Formulating adaptive assessments...",
            "Synthesizing knowledge graph..."
        ];

        useEffect(() => {
            const interval = setInterval(() => {
                setLoadingPhase(prev => (prev + 1) % phases.length);
            }, 3000);
            return () => clearInterval(interval);
        }, []);

        return (
            <div className={`h-full w-full flex flex-col items-center justify-center p-6 relative overflow-hidden`}>
                {/* Deep Immersive Background */}
                <div className="absolute inset-0 bg-theme-bg z-0"></div>

                {/* Floating Orbs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-theme-primary/10 rounded-full blur-[80px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-theme-primary/5 rounded-full blur-[80px] animate-pulse delay-1000"></div>

                <div className="relative z-10 flex flex-col items-center p-12 rounded-[24px] border border-theme-border bg-theme-surface shadow-depth">
                    <div className="relative mb-8">
                        {/* Outer Glow Ring */}
                        <div className="absolute -inset-4 rounded-full border border-theme-primary/20 animate-[spin_8s_linear_infinite] opacity-50"></div>
                        {/* Inner Ring */}
                        <div className="w-24 h-24 border border-theme-border border-t-theme-primary rounded-full animate-spin"></div>

                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-theme-primary animate-pulse" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-serif italic mb-4 tracking-wide text-theme-text">
                        Ingesting Intelligence
                    </h2>

                    <div className="h-6 flex items-center justify-center overflow-hidden">
                        <p
                            key={loadingPhase}
                            className="text-theme-muted font-light tracking-wide text-sm animate-in slide-in-from-bottom-2 fade-in duration-500"
                        >
                            {phases[loadingPhase]}
                        </p>
                    </div>

                    <div className="mt-10 w-48 h-0.5 bg-theme-border rounded-full overflow-hidden">
                        <div className="h-full bg-theme-primary rounded-full animate-[progress_8s_ease-in-out_infinite] w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    };

    const renderLoadingView = () => <AnimatedLoadingView />;

    // ═══════════════════════════════════════════════
    // FULL-SCREEN CHAT VIEW
    // ═══════════════════════════════════════════════
    const renderChatFullScreen = () => (
        <div className="fixed inset-0 z-50 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] transform-gpu bg-theme-bg backdrop-blur-xl">
            {/* Ambient Lighting */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-10 bg-theme-primary animate-pulse"></div>
            </div>

            {/* Chat Header */}
            <div className="px-6 py-5 flex items-center justify-between z-30 border-b border-theme-border bg-theme-surface mx-4 mt-4 shrink-0 rounded-b-[20px]">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl border border-theme-primary/20 bg-theme-primary/5 text-theme-primary relative group">
                        <MessageSquare className="w-5 h-5 relative z-10 transition-transform duration-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-serif italic text-theme-text tracking-wide">
                            Study Assistant
                        </h2>
                        <p className="text-[9px] font-bold text-theme-primary uppercase tracking-[0.2em] mt-1 opacity-80">
                            Contextual AI • {fileName || 'Document'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsChatOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-light text-xs transition-colors border border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-primary/50 cursor-none"
                >
                    Hide <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 custom-scrollbar relative z-10">
                {chatMessages.length === 0 && (
                    <div className="max-w-2xl mx-auto text-center py-20 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <div className="w-20 h-20 mx-auto rounded-full border border-theme-primary/20 bg-theme-primary/5 flex items-center justify-center relative">
                            <Bot className="w-8 h-8 text-theme-primary relative z-10" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-serif italic mb-2 tracking-wide text-theme-text">
                                Hey, I'm Aurem
                            </h3>
                            <p className="text-[14px] text-theme-muted max-w-md mx-auto font-light leading-relaxed">
                                I am an elite contextual AI. Ask me to explain complex topics, summarize sections, or generate novel examples from this document.
                            </p>
                        </div>
                    </div>
                )}

                {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                        <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center mb-2 px-1 gap-2">
                                {msg.role === 'model' && (
                                    <div className="w-4 h-4 rounded-full border border-theme-primary/30 flex items-center justify-center">
                                        <Sparkles className="w-2 h-2 text-theme-primary" />
                                    </div>
                                )}
                                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted">
                                    {msg.role === 'user' ? 'You' : 'Aurem'}
                                </span>
                            </div>
                            <div className={`relative p-5 sm:p-6 rounded-[20px] transition-all duration-300
                                ${msg.role === 'user'
                                    ? 'bg-theme-surface border border-theme-border text-theme-text rounded-tr-sm shadow-depth'
                                    : 'bg-transparent border border-theme-primary/10 rounded-tl-sm'
                                }
                            `}>
                                {msg.role === 'user' ? (
                                    <div className="whitespace-pre-wrap text-[14px] leading-relaxed font-light">{msg.text}</div>
                                ) : (
                                    <MarkdownRenderer text={msg.text} isDark={isDark} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isActionLoading && (
                    <div className="flex justify-start pl-1 animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-4 rounded-[16px] border border-theme-border bg-theme-surface shadow-sm rounded-tl-sm">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-theme-primary animate-spin" />
                                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-theme-primary/70">Synthesizing...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Chat Input Floating Bar */}
            <div className="p-4 sm:p-6 shrink-0 relative z-20">
                <form onSubmit={handleChatSubmit} className="max-w-4xl mx-auto relative">
                    <div className="flex items-center p-2 rounded-[20px] border border-theme-border bg-theme-surface shadow-depth focus-within:border-theme-primary/50 transition-colors">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Ask Aurem to explain a concept..."
                            disabled={isActionLoading}
                            className="flex-1 py-3 pl-4 pr-4 bg-transparent text-[14px] font-light outline-none text-theme-text placeholder:text-theme-muted"
                        />
                        <button
                            type="submit"
                            disabled={isActionLoading || !chatInput.trim()}
                            className="p-3 mr-1 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-theme-bg disabled:opacity-30 border border-theme-primary/20 rounded-xl transition-all duration-300 flex items-center justify-center cursor-none"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════
    // STUDY MODE
    // ═══════════════════════════════════════════════
    const renderStudyMode = () => (
        <div className="h-full flex flex-col md:flex-row overflow-hidden relative">
            {/* Ambient Deep Field Background for Study Mode */}
            <div className="absolute inset-0 bg-theme-bg z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full blur-[100px] opacity-[0.03] bg-theme-primary" style={{ animationDuration: '15s' }}></div>
            </div>

            {/* Premium Sidebar */}
            <aside className={`flex flex-col z-20 shrink-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] transform-gpu ${isSidebarCollapsed ? 'w-full md:w-24 h-auto md:h-full' : 'w-full md:w-72 h-full'} 
                bg-theme-surface border-r border-theme-border shadow-depth`}>
                <div className="p-6 md:p-8 flex items-center justify-between relative overflow-hidden">
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col animate-in slide-in-from-left-4 duration-700">
                            <span className="font-bold text-theme-primary uppercase tracking-[0.2em] text-[9px] flex items-center gap-2 mb-1.5 opacity-80">
                                <Sparkles className="w-3 h-3" />
                                Study Hub
                            </span>
                            <span className="text-xl font-serif italic tracking-wide text-theme-text uppercase leading-none">Aurem Lens</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-3 rounded-xl transition-colors duration-300 group relative text-theme-muted hover:text-theme-text hover:bg-theme-primary/5 cursor-none"
                    >
                        <MenuIcon className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:rotate-180" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-3">
                    {[
                        { id: 'notes', label: 'Detailed Notes', icon: FileText, color: 'indigo' },
                        { id: 'summaries', label: 'Executive Summary', icon: Layers, color: 'violet' },
                        { id: 'cards', label: 'Flashcards & Maps', icon: CreditCard, color: 'emerald' },
                        { id: 'quiz', label: 'Quiz & Assessment', icon: Trophy, color: 'amber' },
                        { id: 'socratic', label: 'Socratic Tutor', icon: ShieldAlert, color: 'indigo', disabled: true },
                        ...(masterpieceContent ? [
                            { id: 'masterpiece', label: 'Definitive Chapter', icon: Crown, color: 'orange' }
                        ] : [])
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.disabled) return;
                                if (item.id === 'retina_study') {
                                    fileInputRef.current?.click();
                                } else {
                                    setActiveSection(item.id);
                                }
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-500 group relative overflow-hidden
                                ${activeSection === item.id
                                    ? 'text-theme-primary border border-theme-primary/20 bg-theme-primary/5'
                                    : 'text-theme-muted border border-transparent hover:text-theme-text hover:bg-theme-primary/5'
                                }
                                ${item.disabled ? 'opacity-50 cursor-not-allowed text-theme-muted hover:text-theme-muted hover:bg-transparent' : 'cursor-none'}
                                ${isSidebarCollapsed ? 'justify-center px-0' : ''}
                            `}
                        >
                            {/* Active Background Gradient & Effects */}
                            {activeSection === item.id && (
                                <>
                                    <div className="absolute inset-0 bg-theme-primary/10"></div>
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-primary shadow-[0_0_10px_var(--theme-primary)]"></div>
                                </>
                            )}

                            <div className="relative z-10 flex items-center gap-4">
                                <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${activeSection === item.id ? 'text-theme-primary' : (item.disabled ? '' : 'group-hover:scale-105')}`} />
                                {!isSidebarCollapsed && <span className="relative z-10">{item.label}</span>}
                            </div>

                            {!isSidebarCollapsed && item.disabled && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 whitespace-nowrap">
                                    Dev
                                </span>
                            )}

                            {/* Hover highlight */}
                            {!item.disabled && activeSection !== item.id && (
                                <div className="absolute inset-0 bg-theme-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            )}

                            {/* Notification dot indicator */}
                            {item.id === 'cards' && flashcards.length > 0 && isSidebarCollapsed && (
                                <span className="absolute top-3 right-3 w-2 h-2 bg-theme-primary rounded-full"></span>
                            )}
                            {item.id === 'quiz' && quizData && isSidebarCollapsed && (
                                <span className="absolute top-3 right-3 w-2 h-2 bg-theme-primary rounded-full"></span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-6 mt-auto space-y-3 border-t border-theme-border relative overflow-hidden">
                    <button
                        onClick={() => {
                            setViewMode('input');
                            setDocumentContent('');
                            setFileData(null);
                        }}
                        className="w-full relative z-10 flex items-center gap-3 p-3 rounded-lg font-bold text-xs transition-colors duration-300 border border-theme-primary/20 text-theme-primary hover:bg-theme-primary/10 cursor-none"
                    >
                        <RefreshCw className="w-4 h-4 shrink-0" />
                        {!isSidebarCollapsed && <span>Start New Session</span>}
                    </button>
                    <button
                        onClick={() => {
                            if (onNavigate) onNavigate('doubt-solver');
                        }}
                        className="w-full relative z-10 flex items-center gap-3 p-3 rounded-lg font-bold text-xs transition-colors duration-300 text-theme-muted hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 cursor-none"
                    >
                        <X className="w-4 h-4 shrink-0" />
                        {!isSidebarCollapsed && <span>Exit to Hub</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative z-10 bg-theme-bg">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 custom-scrollbar">
                    <div className="w-full mx-auto">

                        {/* Notes Section */}
                        {activeSection === 'notes' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="rounded-[24px] border p-8 md:p-12 lg:p-16 border-theme-border bg-theme-surface shadow-depth">
                                    <MarkdownRenderer text={notes} isDark={isDark} />
                                </div>

                                {/* Phase 7: Mastery Progression Gate */}
                                {masteryLevel !== 'Advanced' && (
                                    <div className="mt-14 p-10 md:p-14 border rounded-[32px] text-center relative overflow-hidden transition-all duration-500 border-theme-border bg-theme-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)]">

                                        <div className="absolute top-0 right-0 w-64 h-64 bg-theme-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
                                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-theme-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-2xl border border-theme-border bg-theme-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                <Crown className="w-8 h-8 text-theme-primary" />
                                            </div>

                                            <h4 className="text-3xl font-serif italic text-theme-text tracking-wide mb-3">
                                                Ready to Level Up?
                                            </h4>
                                            <p className="text-theme-muted mb-10 font-light max-w-lg mx-auto leading-relaxed">
                                                You have mastered the <span className="font-bold text-theme-text">{masteryLevel}</span> tier. Pass the required assessment algorithm to unlock the next level of cognitive depth.
                                            </p>

                                            <button
                                                onClick={() => {
                                                    setActiveSection('quiz');
                                                    if (!quizData) generateSpecificTool('quiz');
                                                }}
                                                className="group px-10 py-4 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-theme-bg font-bold tracking-[0.1em] uppercase text-sm rounded-xl transition-colors duration-300 flex items-center gap-3 relative overflow-hidden border border-theme-primary/30 cursor-none"
                                            >
                                                <span className="relative z-10">Take {masteryLevel} Assessment</span>
                                                <ChevronRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Summaries Section */}
                        {activeSection === 'summaries' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="rounded-[24px] border border-theme-border bg-theme-surface p-8 md:p-12 shadow-depth relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-theme-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-theme-border">
                                            <div className="w-10 h-10 rounded-xl border border-theme-primary/20 bg-theme-primary/5 flex items-center justify-center text-theme-primary">
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-serif italic text-theme-text tracking-wide">Executive Summary</h2>
                                                <p className="text-[10px] font-bold text-theme-primary uppercase tracking-[0.2em] mt-1">High-Level Overview</p>
                                            </div>
                                        </div>
                                        <MarkdownRenderer text={summary} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Flashcards & Mindmaps */}
                        {activeSection === 'cards' && (
                            <div className="max-w-5xl mx-auto space-y-12 pb-12 animate-in fade-in duration-500">
                                {!flashcards.length && !isActionLoading && (
                                    <div className="text-center py-20 border border-theme-border border-dashed rounded-[24px] bg-theme-surface/50">
                                        <CreditCard className="w-12 h-12 text-theme-muted mx-auto mb-4 opacity-50" />
                                        <h3 className="text-xl font-serif italic text-theme-text mb-4">No Learning Assets Yet</h3>
                                        <button
                                            onClick={() => generateSpecificTool('cards')}
                                            className="px-8 py-3 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-theme-bg font-bold tracking-[0.1em] uppercase text-xs rounded-xl transition-colors duration-300 border border-theme-primary/30 cursor-none"
                                        >
                                            Generate Flashcards
                                        </button>
                                    </div>
                                )}

                                {isActionLoading && activeSection === 'cards' && (
                                    <div className="py-20 text-center space-y-4">
                                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                                        <p className="font-bold text-slate-500">Developing Flashcards & Mindmap...</p>
                                    </div>
                                )}

                                {flashcards.length > 0 && (
                                    <div className="space-y-12">
                                        <section>
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-bold">Interactive Flashcards</h3>
                                                <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">{flashcards.length} Cards Generated</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {flashcards.map((card, i) => (
                                                    <Flashcard key={i} card={card} isDark={isDark} />
                                                ))}
                                            </div>
                                        </section>

                                        <section className="bg-theme-surface border-theme-border border rounded-2xl overflow-hidden shadow-depth">
                                            <div className="p-8 border-b flex justify-between items-center border-theme-border">
                                                <div>
                                                    <h3 className="text-xl font-serif italic tracking-wide text-theme-text">Visual Mind Map</h3>
                                                    <p className="text-theme-muted text-sm font-light mt-1">Spatial representation of core concepts</p>
                                                </div>
                                                <button
                                                    onClick={() => generateSpecificTool('mindmap')}
                                                    className="px-6 py-2 border border-theme-primary/30 text-theme-primary text-xs uppercase tracking-widest hover:bg-theme-primary/10 transition-colors rounded-lg cursor-none focus:outline-none"
                                                >
                                                    Regenerate
                                                </button>
                                            </div>
                                            <div className="h-[500px] w-full bg-theme-bg/50">
                                                {mindMapData ? (
                                                    <MindMapViewer data={mindMapData} />
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-theme-muted font-serif italic">
                                                        Click 'Regenerate' to visualize concepts
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quiz & Assessment Section */}
                        {activeSection === 'quiz' && (
                            <div className="max-w-4xl mx-auto h-full animate-in fade-in duration-500">
                                {!quizData && !isActionLoading && (
                                    <div className="text-center py-24 px-6 border border-theme-border bg-theme-surface rounded-3xl shadow-depth">
                                        <Trophy className="w-16 h-16 text-theme-primary/50 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(var(--theme-primary),0.2)]" />
                                        <h3 className="text-3xl font-serif italic text-theme-text mb-4">Test Your Mastery</h3>
                                        <p className="text-theme-muted font-light mb-10 max-w-md mx-auto text-lg">Generate a custom-built quiz based on the document's complex points to identify your gaps.</p>

                                        {quizError && (
                                            <div className="max-w-md mx-auto mb-8 p-4 bg-red-900/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
                                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                                <p className="text-red-400 text-sm leading-relaxed">{quizError}</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => { setQuizError(null); generateSpecificTool('quiz'); }}
                                            className="px-12 py-4 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary hover:text-theme-bg font-bold tracking-[0.2em] uppercase text-sm rounded-xl transition-all duration-300 cursor-none"
                                        >
                                            {quizError ? 'RETRY ASSESSMENT' : 'START ASSESSMENT'}
                                        </button>
                                    </div>
                                )}

                                {isActionLoading && activeSection === 'quiz' && (
                                    <div className="py-20 text-center space-y-4">
                                        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
                                        <p className="font-bold text-slate-500 tracking-widest">BUILDING ADAPTIVE QUIZ...</p>
                                    </div>
                                )}

                                {quizData && (
                                    <div className="h-full relative">
                                        <MasteryLoop
                                            initialQuiz={quizData}
                                            topic={fileName}
                                            onMastery={(results) => {
                                                console.log("Mastery Achieved", results);
                                                setIsLevelUnlocked(true);
                                                if (masteryLevel === 'Advanced' && results.score >= 80) {
                                                    generateFinalMasterpiece();
                                                }
                                            }}
                                            isDark={isDark}
                                            MarkdownRenderer={MarkdownRenderer}
                                        />

                                        {/* Inject Next Level trigger if they score >= 60 in MasteryLoop */}
                                        {isLevelUnlocked && (
                                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-700 delay-500">
                                                {masteryLevel !== 'Advanced' && (
                                                    <button
                                                        onClick={handleLevelUp}
                                                        className="px-8 py-4 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-theme-bg font-bold tracking-[0.1em] uppercase text-sm rounded-xl transition-colors duration-300 cursor-none"
                                                    >
                                                        UNLOCK {masteryLevel === 'Beginner' ? 'INTERMEDIATE' : 'ADVANCED'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onNavigate('neural-arena')}
                                                    className="px-8 py-4 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary hover:text-theme-bg font-bold tracking-[0.1em] uppercase text-sm rounded-xl transition-colors duration-300 flex items-center justify-center gap-2 cursor-none"
                                                >
                                                    <Swords className="w-4 h-4" /> NEURAL ARENA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Final Masterpiece Section */}
                        {activeSection === 'masterpiece' && (
                            <div className="animate-in fade-in zoom-in duration-700">
                                {isGeneratingMasterpiece ? (
                                    <div className="py-32 text-center space-y-8 bg-theme-surface rounded-[32px] border border-theme-primary/20 shadow-depth relative overflow-hidden">
                                        <div className="absolute inset-0 bg-theme-primary/5 pointer-events-none"></div>
                                        <div className="relative w-24 h-24 mx-auto z-10">
                                            <Crown className="w-14 h-14 text-theme-primary animate-pulse mx-auto" />
                                        </div>
                                        <h2 className="relative z-10 text-3xl font-serif italic text-theme-text tracking-wide">
                                            Synthesizing Your Masterpiece
                                        </h2>
                                        <p className="text-theme-muted max-w-md mx-auto font-bold uppercase tracking-[0.2em] text-xs">
                                            Architecting the world's most detailed chapter on {fileName}...
                                        </p>
                                        <div className="w-48 h-0.5 bg-theme-border rounded-full mx-auto overflow-hidden">
                                            <div className="h-full bg-theme-primary rounded-full animate-[progress_15s_linear_infinite] w-full"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-12 pb-24">
                                        <div className="text-center py-16 px-6 rounded-[32px] border border-theme-primary/20 bg-theme-surface relative overflow-hidden shadow-depth">
                                            <div className="absolute -top-32 -right-32 w-80 h-80 bg-theme-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
                                            <div className="relative z-10">
                                                <Crown className="w-14 h-14 text-theme-primary mx-auto mb-6" />
                                                <h1 className="text-4xl md:text-5xl font-serif italic text-theme-text mb-3 tracking-wide">The Definitive Chapter</h1>
                                                <p className="text-theme-primary font-bold uppercase tracking-[0.3em] text-[11px] opacity-80">Post-Advanced Mastery Document</p>
                                            </div>
                                        </div>
                                        <div className="prose prose-invert max-w-none">
                                            <MarkdownRenderer text={masterpieceContent} isDark={isDark} />
                                        </div>

                                        {/* Entry to Socratic Room */}
                                        <div className="mt-20 p-12 rounded-[32px] border border-theme-primary/20 bg-theme-surface text-center space-y-6 animate-in slide-in-from-bottom-8 duration-700 shadow-depth relative overflow-hidden">
                                            <div className="absolute inset-0 z-50 bg-theme-bg/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
                                                <span className="text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 mb-2 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                                    Under Development
                                                </span>
                                            </div>
                                            <div className="w-16 h-16 rounded-full border border-theme-primary/20 bg-theme-primary/5 flex items-center justify-center mx-auto relative z-10 opacity-30">
                                                <ShieldAlert className="w-8 h-8 text-theme-primary" />
                                            </div>
                                            <h3 className="text-2xl font-serif italic text-theme-text relative z-10 tracking-wide opacity-30">The Socratic Challenge</h3>
                                            <p className="text-theme-muted max-w-md mx-auto relative z-10 leading-relaxed font-light opacity-30">You've mastered the content. Now, can you defend it? Enter the Socratic Room to face the Grandmaster.</p>
                                            <button
                                                disabled
                                                className="relative z-10 mt-4 px-10 py-4 border border-theme-primary/30 text-theme-muted bg-theme-surface font-bold tracking-[0.2em] uppercase text-sm rounded-xl transition-colors duration-300 opacity-50 cursor-not-allowed"
                                            >
                                                ENTER SOCRATIC ROOM (PAUSED)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Socratic Room Section */}
                        {activeSection === 'socratic' && (
                            <SocraticRoom
                                topic={fileName}
                                documentContent={documentContent}
                                isDark={isDark}
                                MarkdownRenderer={MarkdownRenderer}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* Floating Chat Toggle */}
            <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-8 right-8 z-40 p-4 border border-theme-primary/30 bg-theme-surface text-theme-primary hover:bg-theme-primary hover:text-theme-bg rounded-xl shadow-depth transition-colors duration-300 group cursor-none"
                title="Open Study Assistant"
            >
                <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>

            {/* Full-screen Chat Overlay */}
            {isChatOpen && renderChatFullScreen()}
        </div>
    );

    if (viewMode !== 'input') {
        return createPortal(
            <div className="fixed inset-0 z-50 bg-theme-bg text-theme-text transition-colors duration-300 font-sans">
                {viewMode === 'loading' && renderLoadingView()}
                {viewMode === 'study' && renderStudyMode()}
            </div>,
            document.body
        );
    }

    return (
        <div className="h-full bg-theme-bg text-theme-text transition-colors duration-300 font-sans">
            {renderInputView()}
        </div>
    );
};

const MenuIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);

export default DocumentStudy;
