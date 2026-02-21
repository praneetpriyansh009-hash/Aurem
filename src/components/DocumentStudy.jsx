import React, { useState, useEffect, useRef } from 'react';
import { Send, FilePlus, Sparkles, BookOpen, Brain, CreditCard, MessageSquare, Loader2, Bot, User, Upload, Layers, Lightbulb, FileText, X, ChevronRight, Copy, Check, RefreshCw, Crown, ChevronLeft, Shuffle, Eye, Youtube, Trophy, AlertCircle, Play, Video, Target, Calendar, BrainCircuit } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import * as pdfjsLib from 'pdfjs-dist';
import { GROQ_API_URL, formatGroqPayload, useRetryableFetch } from '../utils/api';
import MindMapViewer from './MindMapViewer';
import MasteryLoop from './MasteryLoop';
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
                <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-2xl border border-indigo-500/20">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={`${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                                {headerCells.map((cell, j) => (
                                    <th key={j} className={`px-5 py-3.5 text-left font-bold text-xs uppercase tracking-wider ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                        {renderInline(cell.trim())}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr key={ri} className={`border-t ${isDark ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                                    {row.map((cell, ci) => (
                                        <td key={ci} className={`px-5 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {renderInline(cell.trim())}
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
            elements.push(<hr key={`hr-${i}`} className={`my-6 ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`} />);
            i++;
            continue;
        }

        // Headers
        if (line.startsWith('#### ')) {
            elements.push(<h4 key={`h4-${i}`} className={`text-base font-bold mt-6 mb-2 ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>{renderInline(line.replace('#### ', ''))}</h4>);
            i++; continue;
        }
        if (line.startsWith('### ')) {
            elements.push(<h3 key={`h3-${i}`} className={`text-lg font-bold mt-8 mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>{renderInline(line.replace('### ', ''))}</h3>);
            i++; continue;
        }
        if (line.startsWith('## ')) {
            elements.push(<h2 key={`h2-${i}`} className={`text-xl font-black mt-10 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{renderInline(line.replace('## ', ''))}</h2>);
            i++; continue;
        }
        if (line.startsWith('# ')) {
            elements.push(<h1 key={`h1-${i}`} className={`text-2xl font-black mt-10 mb-4 bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent`}>{renderInline(line.replace('# ', ''))}</h1>);
            i++; continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            elements.push(
                <blockquote key={`bq-${i}`} className={`my-4 pl-5 py-2 border-l-4 ${isDark ? 'border-indigo-500 bg-indigo-500/5 text-indigo-200' : 'border-indigo-400 bg-indigo-50 text-indigo-900'} rounded-r-xl italic`}>
                    <p className="text-sm leading-relaxed">{renderInline(line.replace('> ', ''))}</p>
                </blockquote>
            );
            i++; continue;
        }

        // Bullet list
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
            const indent = line.search(/\S/);
            const level = Math.floor(indent / 2);
            elements.push(
                <div key={`li-${i}`} className={`flex gap-3 my-1.5 ${level > 0 ? 'ml-6' : ''}`}>
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
                    <span className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{renderInline(line.trim().replace(/^[-*•]\s*/, ''))}</span>
                </div>
            );
            i++; continue;
        }

        // Numbered list
        if (line.trim().match(/^\d+\.\s/)) {
            const num = line.trim().match(/^(\d+)\./)[1];
            elements.push(
                <div key={`ol-${i}`} className="flex gap-3 my-1.5">
                    <span className={`text-sm font-bold shrink-0 w-6 text-right ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{num}.</span>
                    <span className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{renderInline(line.trim().replace(/^\d+\.\s*/, ''))}</span>
                </div>
            );
            i++; continue;
        }

        // Empty line
        if (!line.trim()) {
            elements.push(<div key={`sp-${i}`} className="h-2" />);
            i++; continue;
        }

        // Regular paragraph
        elements.push(<p key={`p-${i}`} className={`my-2 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{renderInline(line)}</p>);
        i++;
    }

    return <div className="space-y-0.5">{elements}</div>;
};

// Inline formatting: **bold**, *italic*, `code`
const renderInline = (text) => {
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
            parts.push(<strong key={key++} className="font-bold text-theme-primary">{firstMatch.match[1]}</strong>);
        } else if (firstMatch.type === 'italic') {
            parts.push(<em key={key++} className="italic opacity-90">{firstMatch.match[1]}</em>);
        } else if (firstMatch.type === 'code') {
            parts.push(<code key={key++} className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-mono">{firstMatch.match[1]}</code>);
        }

        remaining = remaining.substring(firstIndex + firstMatch.match[0].length);
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
};


const DocumentStudy = () => {
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
        return (
            <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative h-64 w-full cursor-pointer perspective-1000 group"
            >
                <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front */}
                    <div className={`absolute inset-0 backface-hidden p-8 rounded-[32px] border glass-3d glow-border flex flex-col justify-center text-center
                        ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white/90 border-warm-200/50'}
                    `}>
                        <div className="absolute top-6 right-6"><Brain className="w-5 h-5 text-indigo-500/50" /></div>
                        <span className={`absolute top-6 left-6 text-[10px] font-black uppercase px-3 py-1 rounded-full ${card.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{card.difficulty || 'medium'}</span>
                        <h4 className="text-xl font-black leading-relaxed text-theme-primary">{card.question}</h4>
                        <p className="mt-8 text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">Click to Reveal</p>
                    </div>
                    {/* Back */}
                    <div className={`absolute inset-0 backface-hidden rotate-y-180 p-8 rounded-[32px] border flex flex-col justify-center text-center bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-indigo-400 shadow-2xl shadow-indigo-500/20`}>
                        <div className="absolute top-6 right-6"><Sparkles className="w-5 h-5 text-white/50" /></div>
                        <p className="text-lg font-bold leading-relaxed">{card.answer}</p>
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

    // --- Refs ---
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    // --- SYSTEM PROMPT ---
    const AUREM_LENS_SYSTEM_PROMPT = `You are AUREM LENS — an elite cognitive augmentation system designed for serious students.
Your role is to transform raw content into deeply detailed, comprehensive study material that rivals the best textbooks.

TONE: Expert, authoritative, structured, academically rigorous yet clear.
RULES:
- ALWAYS produce LONG, DETAILED content (minimum 1500-2000 words for notes)
- Break content into clear modules with ## headers and ### subsections
- Define every key term using **bold** formatting
- Include comparison tables (| Col | Col |) wherever data can be compared
- Use numbered lists for processes, sequences, and step-by-step explanations
- Use bullet points for properties, characteristics, and feature lists
- Include formulas, equations, and numerical examples where relevant
- Add > blockquotes for critical takeaways and exam tips
- Use --- horizontal rules between major sections
- End each major section with a "Key Takeaways" summary
- NEVER produce surface-level summaries — go DEEP into the subject matter
- Include real-world applications and examples to aid understanding`;

    // --- Helpers: AI Communication ---
    const callAI = async (prompt, systemPrompt, jsonMode = false) => {
        try {
            const payload = {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: 'system', content: systemPrompt || AUREM_LENS_SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
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
    const startStudy = async (contentSource = null, targetLevel = 'Beginner') => {
        if (!contentSource && !documentContent && !fileData) return alert("Missing content source");

        setViewMode('loading');
        setMasteryLevel(targetLevel);

        let levelDirective = "Focus on foundational concepts, simple analogies, and clear definitions. Avoid overly dense jargon.";
        if (targetLevel === 'Intermediate') levelDirective = "Focus on application, complex mechanisms, and connecting concepts together. Increase depth.";
        if (targetLevel === 'Advanced') levelDirective = "Perform an EXHAUSTIVE, TEXTBOOK-LEVEL content analysis. Cover every edge case, formula, and advanced theory.";

        const ingestionPrompt = `Generate COMPREHENSIVE study notes based on the document.
CURRENT MASTERY LEVEL: ${targetLevel}.
DIRECTIVE: ${levelDirective}

You MUST produce at least 1500 words. This is NOT a summary — it is a complete study guide tailored to the current level.

FORMAT REQUIREMENTS:
- Use # for the main title
- Use ## for each major module/section (at least 4-6 sections)
- Use ### for subsections and sub-topics within each module
- Use #### for specific concepts, theorems, or definitions
- Use **bold** for every key term, definition, formula name, and important concept
- Use bullet points (- ) for properties, characteristics, features, and lists
- Use numbered lists (1. ) for step-by-step processes, derivations, and sequences
- Use tables (| Header | Header |) for comparisons, properties, data, formulas, and classification
- Use > blockquotes for critical exam tips, important warnings, and "Remember" notes
- Use horizontal rules (---) to separate major sections

CONTENT STRUCTURE (follow this strictly):
1. Start with a 3-4 sentence executive summary introducing the topic and its significance
2. Break into 4-6 logical modules, each containing:
   - Detailed explanation of concepts (not surface level)
   - Definitions in **bold** with explanations
   - Examples with worked-out solutions where applicable
   - Comparison tables for related concepts
   - Formulas/equations formatted clearly
   - > Key Takeaway at end of each section
3. Include a "Common Mistakes & Misconceptions" section
4. End with a comprehensive "Quick Revision" summary table

IMPORTANT: Be THOROUGH. Cover EVERY aspect of the topic. Students should NOT need another resource after reading your notes.

Also provide a separate executive summary after a "---CONTENT_SPLIT---" divider.
The summary should be a concise, structured overview suitable for quick revision.`;

        const sysPrompt = `${AUREM_LENS_SYSTEM_PROMPT}\n\nCONTENT:\n${(contentSource || documentContent).slice(0, 20000)}`;

        const res = await callAI(ingestionPrompt, sysPrompt);

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

        setViewMode('study');
    };

    const handleLevelUp = () => {
        const nextLevel = masteryLevel === 'Beginner' ? 'Intermediate' : 'Advanced';
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

        if (file.type === 'application/pdf') {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            let text = '';
            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                if (content && content.items) {
                    text += content.items.map(item => item.str || '').join(' ') + '\n';
                }
            }
            setDocumentContent(text);
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (re) => setFileData({ mimeType: file.type, data: re.target.result.split(',')[1] });
            reader.readAsDataURL(file);
        } else {
            setDocumentContent(await file.text());
        }

        // Wait a tick for state to update
        await new Promise(r => setTimeout(r, 100));
        startStudy();
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
            cards: `Generate 10-12 elite flashcards. Output strictly as a JSON object: { "flashcards": [{ "question": "...", "answer": "...", "difficulty": "easy|medium|hard" }] }`,
            quiz: `Generate 10-15 multiple choice questions strictly assessing the provided study material. CURRENT MASTERY LEVEL: ${masteryLevel}. Respond ONLY with a valid JSON object. No conversational text. Format: { "questions": [{ "question": "...", "options": ["A", "B", "C", "D"], "answer": "Exact correct option text", "explanation": "Why?" }] }`,
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

    // ═══════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════

    const renderInputView = () => (
        <div className="max-w-4xl mx-auto py-12 px-6 space-y-12">
            <div className="text-center space-y-4">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 mb-4 scale-up glass-3d glow-border`}>
                    <Eye className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent uppercase">Aurem Lens</h1>
                <p className="text-theme-muted text-lg font-medium">Unified Cognitive Augmentation Engine</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { id: 'chapter', title: 'Study a Chapter', desc: 'AI-guided deep dive into any topic', icon: BookOpen, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                    { id: 'document', title: 'Upload Document', desc: 'PDFs, Images, Handwritten notes', icon: FilePlus, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { id: 'youtube', title: 'YouTube Video', desc: 'Transcribe and analyze lectures', icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10' }
                ].map(card => (
                    <div
                        key={card.id}
                        onClick={() => {
                            if (card.id === 'document') fileInputRef.current?.click();
                            if (card.id === 'chapter') setIsChapterModalOpen(true);
                        }}
                        className={`group relative p-8 rounded-[32px] border glass-3d glow-border transition-all duration-500 cursor-pointer overflow-hidden
                            ${isDark ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]' : 'bg-white/90 border-warm-200/50 hover:border-indigo-200 shadow-sm'}
                            hover:-translate-y-2
                        `}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${card.bg} ${card.color}`}>
                            <card.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>

                        {card.id === 'youtube' && (
                            <form
                                onSubmit={e => { e.preventDefault(); handleYouTubeAnalysis(); }}
                                className="mt-6 flex gap-2"
                                onClick={e => e.stopPropagation()}
                            >
                                <input
                                    type="text"
                                    placeholder="Paste URL..."
                                    className={`flex-1 text-xs p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-red-500/30 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                    value={videoUrl}
                                    onChange={e => setVideoUrl(e.target.value)}
                                />
                                <button type="submit" className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                            </form>
                        )}
                    </div>
                ))}
            </div>

            {/* Study a Chapter Modal */}
            {isChapterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-lg rounded-3xl p-8 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Study a Chapter</h2>
                            <button onClick={() => setIsChapterModalOpen(false)} className="p-2 hover:bg-slate-400/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">Tell us what you want to learn. AUREM will fetch and structure the entire chapter for you.</p>
                        <form onSubmit={e => {
                            e.preventDefault();
                            if (!chapterSearch.trim()) return;
                            setIsChapterModalOpen(false);
                            setFileName(chapterSearch);
                            startStudy(`Topic: ${chapterSearch}\n\nAct as a comprehensive textbook and provide detailed information on this topic.`);
                        }}>
                            <div className="relative mb-6">
                                <input
                                    autoFocus
                                    type="text"
                                    value={chapterSearch}
                                    onChange={e => setChapterSearch(e.target.value)}
                                    placeholder="e.g. Newton's Third Law, Carbonates, History of Rome..."
                                    className={`w-full p-5 pr-14 rounded-2xl border text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDark ? 'bg-white/[0.03] border-white/[0.1] text-white' : 'bg-warm-50 border-warm-200'}`}
                                />
                                <button type="submit" className="absolute right-3 top-3 p-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"><Sparkles className="w-5 h-5" /></button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        </div>
    );

    const renderLoadingView = () => (
        <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-8">
                <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
                </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Ingesting Intelligence...</h2>
            <p className="text-slate-500 max-w-sm">AUREM is distilling the content into a structured study environment.</p>
        </div>
    );

    // ═══════════════════════════════════════════════
    // FULL-SCREEN CHAT VIEW
    // ═══════════════════════════════════════════════
    const renderChatFullScreen = () => (
        <div className={`fixed inset-0 z-50 flex flex-col transition-all duration-300
            ${isDark ? 'bg-midnight-900 text-white' : 'bg-warm-50 text-warm-800'}
        `}>
            {/* Chat Header */}
            <div className={`px-6 py-5 flex items-center justify-between z-30 glass-3d border-b rounded-b-3xl mx-4 mt-4 shrink-0
                ${isDark ? 'bg-midnight-900/40 border-white/[0.08]' : 'bg-white/40 border-warm-200/50'}
            `}>
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20">
                        <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent uppercase">
                            Study Assistant
                        </h2>
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mt-0.5">
                            Contextual AI • {fileName || 'Document'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsChatOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all
                        ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white/70' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}
                    `}
                >
                    Hide <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 custom-scrollbar">
                {chatMessages.length === 0 && (
                    <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
                        <div className="w-20 h-20 mx-auto rounded-[28px] bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center">
                            <Bot className="w-10 h-10 text-indigo-500/40" />
                        </div>
                        <div>
                            <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                                Hey, I'm Aurem
                            </h3>
                            <p className="text-theme-muted max-w-md mx-auto">
                                I can work with you on your doc and answer any questions!
                            </p>
                        </div>
                    </div>
                )}

                {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center mb-1.5 px-1 gap-2">
                                {msg.role === 'model' && (
                                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                        <Sparkles className="w-3 h-3 text-white" />
                                    </div>
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-theme-muted' : 'text-indigo-500'}`}>
                                    {msg.role === 'user' ? 'You' : 'Aurem'}
                                </span>
                            </div>
                            <div className={`relative p-5 sm:p-6 rounded-[24px] transition-all duration-300 glass-3d glow-border
                                ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-sm shadow-xl shadow-indigo-500/20'
                                    : `${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white/90 border border-warm-200/50'} rounded-tl-sm`
                                }
                            `}>
                                {msg.role === 'user' ? (
                                    <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.text}</div>
                                ) : (
                                    <MarkdownRenderer text={msg.text} isDark={isDark} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isActionLoading && (
                    <div className="flex justify-start pl-1">
                        <div className={`p-5 rounded-[24px] glass-3d ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white/90 border border-warm-200/50'}`}>
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                <span className="text-sm text-theme-muted">Analyzing...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className={`px-6 py-5 border-t shrink-0 ${isDark ? 'border-white/[0.04] bg-midnight-900/80' : 'border-warm-200/30 bg-warm-50/80'} backdrop-blur-xl`}>
                <form onSubmit={handleChatSubmit} className="max-w-3xl mx-auto relative">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Type a question here or ask about the document..."
                        disabled={isActionLoading}
                        className={`w-full py-3.5 pl-5 pr-12 rounded-2xl text-[14px] font-medium outline-none transition-all duration-200
                            ${isDark
                                ? 'bg-midnight-700/50 text-white placeholder:text-white/25 border border-white/[0.06] focus:border-indigo-500/40 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
                                : 'bg-white/70 text-warm-800 placeholder:text-warm-400 border border-warm-300/25 focus:border-indigo-400/40 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.06)]'
                            }
                        `}
                    />
                    <button
                        type="submit"
                        disabled={isActionLoading || !chatInput.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-30 text-white rounded-xl shadow-md transition-all active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════
    // STUDY MODE
    // ═══════════════════════════════════════════════
    const renderStudyMode = () => (
        <div className="h-full flex overflow-hidden">
            {/* Sidebar */}
            <aside className={`flex flex-col border-r transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'} ${isDark ? 'bg-slate-900/80 border-white/[0.04]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="p-6 flex items-center justify-between">
                    {!isSidebarCollapsed && <span className="font-bold text-indigo-500 uppercase tracking-widest text-xs">Aurem Lens</span>}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-slate-400/10 rounded-lg">
                        <MenuIcon className="w-4 h-4" />
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-2">
                    {[
                        { id: 'notes', label: 'Detailed Notes', icon: FileText },
                        { id: 'summaries', label: 'Executive Summary', icon: Layers },
                        { id: 'cards', label: 'Flashcards & Maps', icon: CreditCard },
                        { id: 'quiz', label: 'Quiz & Assessment', icon: Trophy }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300
                                ${activeSection === item.id
                                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]'
                                    : 'text-theme-muted hover:text-indigo-500 hover:bg-white/5'}
                                ${isSidebarCollapsed ? 'justify-center px-0' : ''}
                            `}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className={`p-4 mt-auto border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-200'}`}>
                    <button onClick={() => setViewMode('input')} className="w-full flex items-center gap-3 p-3 text-slate-500 hover:text-red-400 font-bold text-sm">
                        <ChevronLeft className="w-4 h-4" />
                        {!isSidebarCollapsed && <span>New Session</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-midnight-900' : 'bg-warm-50'}`}>
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                    <div className="max-w-4xl mx-auto w-full">

                        {/* Notes Section */}
                        {activeSection === 'notes' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className={`rounded-[32px] border p-8 md:p-12 glass-3d
                                    ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-warm-200/50 shadow-sm'}
                                `}>
                                    <MarkdownRenderer text={notes} isDark={isDark} />
                                </div>

                                {/* Phase 7: Mastery Progression Gate */}
                                {masteryLevel !== 'Advanced' && (
                                    <div className={`mt-12 p-8 md:p-12 border rounded-[32px] text-center glass-3d animate-in slide-in-from-bottom-8 ${isDark ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
                                        <div className="inline-block px-3 py-1 mb-4 rounded-full bg-orange-500/20 text-orange-500 font-black uppercase tracking-widest text-[10px] border border-orange-500/20">Under Development (Beta Version)</div>
                                        <h4 className="text-2xl font-black text-indigo-500 mb-2">Ready to Level Up?</h4>
                                        <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-8 font-medium max-w-lg mx-auto`}>You are currently viewing <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{masteryLevel}</span> notes. Pass the required assessment to unlock deeper concepts.</p>
                                        <button
                                            onClick={() => {
                                                setActiveSection('quiz');
                                                if (!quizData) generateSpecificTool('quiz');
                                            }}
                                            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all text-lg"
                                        >
                                            Take {masteryLevel} Assessment
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Summaries Section */}
                        {activeSection === 'summaries' && (
                            <div className="animate-in fade-in duration-500">
                                <div className={`rounded-[32px] border p-8 md:p-12 glass-3d
                                    ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-warm-200/50 shadow-sm'}
                                `}>
                                    <MarkdownRenderer text={summary} isDark={isDark} />
                                </div>
                            </div>
                        )}

                        {/* Flashcards & Mindmaps */}
                        {activeSection === 'cards' && (
                            <div className="max-w-5xl mx-auto space-y-12 pb-12 animate-in fade-in duration-500">
                                {!flashcards.length && !isActionLoading && (
                                    <div className={`text-center py-20 border-2 border-dashed rounded-3xl ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
                                        <CreditCard className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold mb-4">No Learning Assets Yet</h3>
                                        <button
                                            onClick={() => generateSpecificTool('cards')}
                                            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20"
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

                                        <section className={`${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200'} border rounded-3xl overflow-hidden shadow-depth`}>
                                            <div className={`p-8 border-b flex justify-between items-center ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                                                <div>
                                                    <h3 className="text-lg font-bold">Visual Mind Map</h3>
                                                    <p className="text-slate-500 text-sm">Spatial representation of core concepts</p>
                                                </div>
                                                <button
                                                    onClick={() => generateSpecificTool('mindmap')}
                                                    className={`px-4 py-2 font-bold rounded-xl text-xs transition-colors ${isDark ? 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    Regenerate
                                                </button>
                                            </div>
                                            <div className="h-[500px] w-full">
                                                {mindMapData ? (
                                                    <MindMapViewer data={mindMapData} />
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-slate-700 font-bold italic">
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
                                    <div className="text-center py-20">
                                        <Trophy className="w-16 h-16 text-yellow-500/20 mx-auto mb-6" />
                                        <h3 className="text-2xl font-bold mb-4">Test Your Mastery</h3>
                                        <p className="text-slate-500 mb-8 max-w-md mx-auto">Generate a custom-built quiz based on the document's complex points to identify your gaps.</p>

                                        {quizError && (
                                            <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left">
                                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                                <p className="text-red-400 text-sm leading-relaxed">{quizError}</p>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => { setQuizError(null); generateSpecificTool('quiz'); }}
                                            className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-3xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-all"
                                        >
                                            {quizError ? 'Retry Assessment' : 'Start Assessment'}
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
                                            }}
                                        />

                                        {/* Inject Next Level trigger if they score >= 60 in MasteryLoop */}
                                        {masteryLevel !== 'Advanced' && isLevelUnlocked && (
                                            <div className="mt-8 text-center animate-in fade-in duration-700 delay-500">
                                                <p className="text-sm font-bold text-emerald-500 mb-4 uppercase tracking-widest">Mastery Achieved</p>
                                                <button
                                                    onClick={handleLevelUp}
                                                    className="px-10 py-4 bg-emerald-500 text-white font-black rounded-3xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 w-full"
                                                >
                                                    UNLOCK {masteryLevel === 'Beginner' ? 'INTERMEDIATE' : 'ADVANCED'} NOTES
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Floating Chat Toggle */}
            <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-8 right-8 z-40 p-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl shadow-2xl shadow-indigo-500/30 hover:scale-110 active:scale-95 transition-all duration-300 group"
                title="Open Study Assistant"
            >
                <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            </button>

            {/* Full-screen Chat Overlay */}
            {isChatOpen && renderChatFullScreen()}
        </div>
    );

    return (
        <div className={`h-full ${isDark ? 'bg-midnight-900 text-white' : 'bg-warm-50 text-slate-900'} transition-colors duration-300 font-sans`}>
            {viewMode === 'input' && renderInputView()}
            {viewMode === 'loading' && renderLoadingView()}
            {viewMode === 'study' && renderStudyMode()}
        </div>
    );
};

const MenuIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);

export default DocumentStudy;
