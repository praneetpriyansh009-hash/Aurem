import React, { useState, useEffect, useRef } from 'react';
import { Send, FilePlus, Sparkles, BookOpen, Brain, CreditCard, Map, MessageSquare, Loader2, Bot, User, Upload, Layers, Lightbulb, FileText, X, ChevronRight, Copy, Check, MapPin, RefreshCw, Crown, Youtube, ChevronLeft, Shuffle, Eye } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import * as pdfjsLib from 'pdfjs-dist';
import { GROQ_API_URL, YOUTUBE_TRANSCRIPT_URL, formatGroqPayload, useRetryableFetch } from '../utils/api';
import RagService from '../utils/ragService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

const DocumentStudy = () => {
    const { isDark } = useTheme();
    const { retryableFetch } = useRetryableFetch();
    const { canUseFeature, incrementUsage, triggerUpgradeModal, isPro, getRemainingUses } = useSubscription();

    // State
    const [documentContent, setDocumentContent] = useState('');
    const [fileData, setFileData] = useState(null); // { mimeType, data (base64) } for vision
    const [fileName, setFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // Video State
    const [videoUrl, setVideoUrl] = useState('');
    const [videoData, setVideoData] = useState(null); // { id, title, thumbnail }
    const [isVideoLoading, setIsVideoLoading] = useState(false);

    const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'chat'
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isContentCollapsed, setIsContentCollapsed] = useState(false);

    // Flashcard State
    const [flashcards, setFlashcards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [masteredCards, setMasteredCards] = useState(new Set());
    const [showFlashcardMode, setShowFlashcardMode] = useState(false);

    // Chat State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

    // --- File Handling ---

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const extractPdfTextPreview = async (arrayBuffer) => {
        try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            const pagesToRead = Math.min(pdf.numPages, 10); // Limit to 10 pages
            for (let i = 1; i <= pagesToRead; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `--- Page ${i} ---\n${pageText}\n\n`;
            }
            if (pdf.numPages > 10) fullText += `\n... (Remaining ${pdf.numPages - 10} pages truncacted for performance)`;
            return fullText.trim();
        } catch (err) {
            console.error("PDF extraction error:", err);
            return `Error reading PDF: ${err.message}`;
        }
    };

    const processFile = async (file) => {
        if (!file) return;

        setIsPdfLoading(true);
        clearVideoData();
        try {
            let content = '';
            let mimeType = file.type;
            let base64 = null;

            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                content = await extractPdfTextPreview(arrayBuffer) || '';
                if (!content) content = "[PDF Content Extracted]";
            } else if (file.type.startsWith('image/')) {
                base64 = await fileToBase64(file);
                content = `[Image Loaded: ${file.name}]`;
            } else {
                content = await file.text();
            }

            setFileName(file.name);
            setDocumentContent(content);
            setFileData(base64 ? { mimeType, data: base64 } : null);
            setChatMessages([]);
            setResult('');
            setFlashcards([]);
            setShowFlashcardMode(false);
        } catch (error) {
            console.error('File processing error:', error);
            alert('Failed to process file');
        } finally {
            setIsPdfLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- Video Handling ---

    const extractYouTubeId = (url) => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const clearVideoData = () => {
        setVideoUrl('');
        setVideoData(null);
    };

    const clearFileData = () => {
        setFileName('');
        setDocumentContent('');
        setFileData(null);
    };

    const loadVideoUrl = async () => {
        if (!videoUrl.trim()) return;

        // Check if user can use YouTube feature (Premium only)
        if (!canUseFeature('youtube')) {
            triggerUpgradeModal('youtube');
            return;
        }

        const videoId = extractYouTubeId(videoUrl);
        if (!videoId) {
            alert('Invalid YouTube URL. Please enter a valid YouTube video link.');
            return;
        }

        setIsVideoLoading(true);
        clearFileData();

        try {
            // Fetch transcript from backend
            const response = await retryableFetch(YOUTUBE_TRANSCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl, videoId })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setVideoData({
                id: videoId,
                title: response.title || 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            });
            setDocumentContent(response.transcript || '[Video transcript loaded]');
            setChatMessages([]);
            setResult('');
            setFlashcards([]);
            setShowFlashcardMode(false);
        } catch (error) {
            console.error('Video loading error:', error);
            // Fallback: Allow proceeding without transcript
            setVideoData({
                id: videoId,
                title: 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            });
            setDocumentContent(`[YouTube Video: ${videoId}]\n\nNote: Automatic transcript extraction failed. You can manually paste the video transcript in the content area below, or use the chat to ask questions about the video topic.`);
        } finally {
            setIsVideoLoading(false);
        }
    };

    // --- AI Logic ---

    const callGroq = async (prompt, systemPrompt, jsonMode = false) => {
        try {
            let payload;

            // Vision Request (Llama 3.2 11B Vision)
            if (fileData) {
                payload = {
                    model: "llama-3.2-11b-vision-preview",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: taskPrompt(prompt, systemPrompt) },
                                { type: "image_url", image_url: { url: `data:${fileData.mimeType};base64,${fileData.data}` } }
                            ]
                        }
                    ],
                    temperature: 0.5,
                    max_tokens: jsonMode ? 4096 : 1024
                };
            }
            // Text Request (Llama 3.1 8B)
            else {
                payload = {
                    model: "llama-3.1-8b-instant",
                    ...formatGroqPayload(prompt, systemPrompt)
                };
                if (jsonMode) {
                    payload.response_format = { type: "json_object" };
                }
            }

            const result = await retryableFetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return { content: result.choices?.[0]?.message?.content };
        } catch (e) {
            console.error(`[AuremLens] Groq Error:`, e);
            return { error: e.message };
        }
    };

    const taskPrompt = (userRequest, sysContext) => {
        // Helper to combine system context and user request for vision models which might behave better with single user message
        return `${sysContext}\n\nUSER REQUEST: ${userRequest}`;
    };

    // --- Tools ---

    const handleToolAction = async (action) => {
        if (!documentContent && !fileData && !videoData) return alert("Please upload a file or enter a video URL first.");

        // Check flashcard usage limit (3 per day for free users)
        if (action === 'flashcards') {
            if (!canUseFeature('flashcards')) {
                triggerUpgradeModal('flashcards');
                return;
            }
        }

        setIsLoading(true);
        setResult('');
        setShowFlashcardMode(false);

        const prompts = {
            summarize: "Summarize this document concisely with high-level bullet points and key takeaways. Use ✨ emojis for key points. Format beautifully with markdown headers and lists.",
            explain: "Explain the main concepts of this document in simple terms, as if teaching a beginner. Use 💡 for insights, 📖 for definitions, and ✅ for key takeaways. Format with clear sections.",
            test: "Generate a quiz (5 questions) based on this content. Use beautiful formatting with ❓ for questions and ✅ for answers. Format: ## Question 1 \n**Question text**\n\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\n\n**✅ Correct Answer:** A",
            flashcards: `Generate 12-15 comprehensive flashcards covering ALL major topics and concepts in this content. Each flashcard should test understanding of a key concept.

You MUST return ONLY a valid JSON object in this exact format:
{
  "flashcards": [
    {
      "id": 1,
      "topic": "Topic/Category Name",
      "question": "Clear, specific question that tests understanding",
      "answer": "Comprehensive answer explaining the concept",
      "difficulty": "easy"
    },
    {
      "id": 2,
      "topic": "Another Topic",
      "question": "Another question",
      "answer": "Another answer",
      "difficulty": "medium"
    }
  ]
}

RULES:
- Generate 12-15 flashcards minimum
- Cover ALL major topics comprehensively
- difficulty must be one of: "easy", "medium", "hard"
- Questions should be specific and test real understanding
- Answers should be detailed and educational
- Group related concepts under the same topic
- Return ONLY the JSON object, no other text`
        };

        const basePrompt = prompts[action];
        let systemPrompt = "You are AUREM, an expert educational AI assistant. Always format your responses beautifully with markdown, emojis, and clear structure.";

        // RAG / Context Building
        if (documentContent && !fileData) {
            const truncatedContent = documentContent.slice(0, 15000);
            systemPrompt += `\n\nDOCUMENT CONTENT:\n${truncatedContent}\n\nAnalyze the document above.`;
        } else if (fileData) {
            systemPrompt += "\n\nAnalyze the provided image.";
        }

        if (action === 'flashcards') {
            const response = await callGroq(basePrompt, systemPrompt, true);

            if (response.error) {
                setResult("Error: " + response.error);
            } else {
                try {
                    // Parse JSON response
                    let jsonContent = response.content;
                    // Clean up if wrapped in markdown code blocks
                    jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

                    const parsed = JSON.parse(jsonContent);
                    const cards = parsed.flashcards || parsed;

                    if (Array.isArray(cards) && cards.length > 0) {
                        setFlashcards(cards);
                        setCurrentCardIndex(0);
                        setIsCardFlipped(false);
                        setMasteredCards(new Set());
                        setShowFlashcardMode(true);
                        incrementUsage('flashcards'); // Track usage
                    } else {
                        throw new Error("Invalid flashcard format");
                    }
                } catch (parseError) {
                    console.error("Flashcard parse error:", parseError);
                    // Fallback to text display
                    setResult(response.content);
                }
            }
        } else {
            const response = await callGroq(basePrompt, systemPrompt);
            if (response.error) setResult("Error: " + response.error);
            else setResult(response.content);
        }

        setIsLoading(false);
    };

    // --- Flashcard Controls ---

    const nextCard = () => {
        setCurrentCardIndex(prev => (prev + 1) % flashcards.length);
        setIsCardFlipped(false);
    };

    const prevCard = () => {
        setCurrentCardIndex(prev => (prev - 1 + flashcards.length) % flashcards.length);
        setIsCardFlipped(false);
    };

    const shuffleCards = () => {
        const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
        setFlashcards(shuffled);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
    };

    const toggleMastered = (cardId) => {
        setMasteredCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'text-green-500 bg-green-500/10';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10';
            case 'hard': return 'text-red-500 bg-red-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    const getDifficultyEmoji = (difficulty) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return '🟢';
            case 'medium': return '🟡';
            case 'hard': return '🔴';
            default: return '⚪';
        }
    };

    // --- Chat ---

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        const msg = chatInput.trim();
        if (!msg) return;

        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
        setIsChatLoading(true);

        let systemPrompt = "You are AUREM. Answer the question based on the document. Use clear headers: ## Summary (for a quick takeaway) and ## Explanation (for details). Use ✨ for summaries and 💡 for insights. Keep it clean and tidy.";
        if (documentContent && !fileData) {
            const truncatedContent = documentContent.slice(0, 15000);
            systemPrompt += `\n\nCONTEXT:\n${truncatedContent}`;
        }

        const response = await callGroq(msg, systemPrompt);

        const reply = response.error ? "Error: " + response.error : response.content;
        setChatMessages(prev => [...prev, { role: 'model', text: reply }]);
        setIsChatLoading(false);
    };

    // --- UI Helpers ---

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const currentCard = flashcards[currentCardIndex];
    const hasContent = documentContent || fileData || videoData;

    return (
        <div className={`h-full ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'} font-sans transition-colors duration-300 overflow-y-auto custom-scrollbar`}>

            {/* Header - Animate Enter */}
            <div className="py-6 text-center animate-enter">
                <div className="flex items-center justify-center gap-3 mb-1">
                    <Eye className="w-8 h-8 text-orange-500" />
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-500">Aurem Lens</h1>
                </div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Upload Documents or Videos for AI-Powered Analysis & Study</p>
            </div>

            <div className="max-w-5xl mx-auto w-full px-6 pb-12 flex flex-col">

                {/* Upload Area - Delayed Enter */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                        e.preventDefault();
                        setIsDragging(false);
                        processFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`relative shrink-0 mb-4 border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 group animate-enter opacity-0 delay-100 fill-mode-forwards
                        ${isDragging ? 'border-orange-500 bg-orange-500/10' : isDark ? 'border-gray-800 bg-gray-900/50 hover:border-gray-700' : 'border-gray-300 bg-white hover:border-orange-400'}
                    `}
                    style={{ animationFillMode: 'forwards' }}
                >
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,image/*" onChange={e => processFile(e.target.files?.[0])} className="hidden" />

                    {fileName ? (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-orange-500" />
                            <h3 className="text-xl font-bold">{fileName}</h3>
                            <p className="text-xs text-gray-500 mt-2 font-medium tracking-wide">Click to change file</p>
                        </div>
                    ) : (
                        <div className="group-hover:scale-105 transition-transform duration-300">
                            <Upload className={`w-12 h-12 mx-auto mb-3 ${isPdfLoading ? 'text-orange-500 animate-bounce' : 'text-gray-600'}`} />
                            <h3 className="text-lg font-bold text-gray-400">{isPdfLoading ? 'Processing...' : 'Click or Drag File'}</h3>
                        </div>
                    )}
                </div>

                {/* Video URL Input */}
                <div className={`mb-4 p-4 rounded-2xl border transition-all animate-enter opacity-0 delay-150 ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`} style={{ animationFillMode: 'forwards' }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Youtube className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Or Load YouTube Video</span>
                        {!isPro && (
                            <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                                <Crown className="w-3 h-3" /> PRO
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
                            className={`flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all
                                ${isDark ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'}`}
                        />
                        <button
                            onClick={loadVideoUrl}
                            disabled={isVideoLoading || !videoUrl.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isVideoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                            Load
                        </button>
                    </div>

                    {/* Video Preview */}
                    {videoData && (
                        <div className="mt-4 flex items-center gap-4 p-3 rounded-xl bg-black/20">
                            <img
                                src={videoData.thumbnail}
                                alt="Video thumbnail"
                                className="w-24 h-16 object-cover rounded-lg"
                                onError={(e) => { e.target.src = `https://img.youtube.com/vi/${videoData.id}/hqdefault.jpg`; }}
                            />
                            <div className="flex-1">
                                <p className="font-bold text-sm">{videoData.title}</p>
                                <p className="text-xs text-gray-500">Video loaded successfully</p>
                            </div>
                            <button
                                onClick={clearVideoData}
                                className="p-2 rounded-lg hover:bg-gray-500/20 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Extracted Content View */}
                {documentContent && (
                    <div className={`shrink-0 mb-6 rounded-2xl border overflow-hidden transition-all duration-300 animate-enter ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div
                            onClick={() => setIsContentCollapsed(!isContentCollapsed)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                        >
                            <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                                <FilePlus className="w-4 h-4" /> View/Edit Extracted Content
                            </h4>
                            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isContentCollapsed ? '' : 'rotate-90'}`} />
                        </div>

                        {!isContentCollapsed && (
                            <div className="px-4 pb-4">
                                <textarea
                                    value={documentContent}
                                    onChange={e => setDocumentContent(e.target.value)}
                                    className={`w-full h-32 p-3 text-xs font-mono rounded-xl resize-y focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors
                                        ${isDark ? 'bg-black/30 text-gray-400' : 'bg-gray-50 text-gray-700'}`}
                                />
                                <div className="flex justify-end mt-2">
                                    <span className="text-[10px] text-gray-600">{documentContent.length} characters loaded</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 mb-6 shrink-0 sticky top-0 z-20 pt-2 backdrop-blur-md animate-enter opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
                    <button
                        onClick={() => setActiveTab('tools')}
                        className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-sm
                            ${activeTab === 'tools'
                                ? 'bg-orange-500 text-white shadow-orange-500/20 scale-[1.02]'
                                : isDark ? 'bg-gray-900 text-gray-500 hover:bg-gray-800' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}
                        `}
                    >
                        <Sparkles className="w-4 h-4" /> Analysis Tools
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-sm
                            ${activeTab === 'chat'
                                ? 'bg-orange-500 text-white shadow-orange-500/20 scale-[1.02]'
                                : isDark ? 'bg-gray-900 text-gray-500 hover:bg-gray-800' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}
                        `}
                    >
                        <MessageSquare className="w-4 h-4" /> Ask Questions
                    </button>
                </div>

                {/* Main Content Area */}
                <div>

                    {/* Tools Tab */}
                    {activeTab === 'tools' && (
                        <div className="space-y-6">
                            {/* Action Grid - Staggered Animation */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { id: 'summarize', label: 'Summarize', icon: FileText },
                                    { id: 'explain', label: 'Explain', icon: Lightbulb },
                                    { id: 'test', label: 'Generate Test', icon: Check },
                                    { id: 'flashcards', label: 'Flashcards', icon: CreditCard, limited: true }
                                ].map((tool, index) => {
                                    const remaining = tool.limited && !isPro ? getRemainingUses('flashcards') : null;
                                    return (
                                        <button
                                            key={tool.id}
                                            onClick={() => handleToolAction(tool.id)}
                                            disabled={isLoading || !hasContent}
                                            style={{ animationDelay: `${index * 100 + 300}ms`, animationFillMode: 'forwards' }}
                                            className={`relative p-6 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 group animate-enter opacity-0
                                            hover:scale-105 hover:shadow-xl hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                            ${isDark
                                                    ? 'bg-gray-900 border-gray-800 hover:border-orange-500/50 hover:bg-gray-800'
                                                    : 'bg-white border-gray-200 hover:border-orange-500 hover:shadow-lg'}
                                        `}
                                        >
                                            {remaining !== null && (
                                                <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining > 0 ? 'bg-orange-500/20 text-orange-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {remaining}/3
                                                </span>
                                            )}
                                            <div className={`p-4 rounded-full transition-colors duration-300 ${isDark ? 'bg-gray-800 group-hover:bg-orange-500/20' : 'bg-orange-50 group-hover:bg-orange-100'}`}>
                                                <tool.icon className={`w-6 h-6 transition-colors ${isDark ? 'text-gray-400 group-hover:text-orange-500' : 'text-orange-500'}`} />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>{tool.label}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Result Area */}
                            {isLoading && (
                                <div className="text-center py-12 animate-enter">
                                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                                    <p className="text-xs font-bold text-orange-500 uppercase tracking-widest animate-pulse">Aurem is analyzing...</p>
                                </div>
                            )}

                            {/* Interactive Flashcard Mode */}
                            {showFlashcardMode && flashcards.length > 0 && !isLoading && (
                                <div className={`p-6 rounded-3xl border animate-enter ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
                                    {/* Flashcard Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="w-6 h-6 text-orange-500" />
                                            <h3 className="font-bold text-lg">Flashcards</h3>
                                            <span className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                                {currentCardIndex + 1} / {flashcards.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-green-500 font-medium">{masteredCards.size} mastered</span>
                                            <button
                                                onClick={shuffleCards}
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                                title="Shuffle cards"
                                            >
                                                <Shuffle className="w-5 h-5 text-gray-500" />
                                            </button>
                                            <button
                                                onClick={() => setShowFlashcardMode(false)}
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                            >
                                                <X className="w-5 h-5 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-6">
                                        <div className={`h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                            <div
                                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                                                style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Flashcard */}
                                    {currentCard && (
                                        <div className="mb-6">
                                            {/* Topic & Difficulty Badge */}
                                            <div className="flex items-center justify-between mb-4">
                                                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    📚 {currentCard.topic || 'General'}
                                                </span>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getDifficultyColor(currentCard.difficulty)}`}>
                                                    {getDifficultyEmoji(currentCard.difficulty)} {currentCard.difficulty || 'Medium'}
                                                </span>
                                            </div>

                                            {/* Card - Flip on Click */}
                                            <div
                                                onClick={() => setIsCardFlipped(!isCardFlipped)}
                                                className={`relative min-h-[200px] p-8 rounded-2xl cursor-pointer transition-all duration-500 transform
                                                    ${isCardFlipped
                                                        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
                                                        : 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30'}
                                                    border-2 hover:scale-[1.02] active:scale-[0.98]
                                                    ${masteredCards.has(currentCard.id) ? 'ring-2 ring-green-500/50' : ''}
                                                `}
                                                style={{
                                                    perspective: '1000px',
                                                    transformStyle: 'preserve-3d'
                                                }}
                                            >
                                                <div className="flex flex-col items-center justify-center text-center h-full">
                                                    <span className={`text-xs font-bold uppercase tracking-widest mb-4 ${isCardFlipped ? 'text-green-500' : 'text-orange-500'}`}>
                                                        {isCardFlipped ? '✅ ANSWER' : '❓ QUESTION'}
                                                    </span>
                                                    <p className={`text-lg font-medium leading-relaxed ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {isCardFlipped ? currentCard.answer : currentCard.question}
                                                    </p>
                                                    <span className={`mt-6 text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        {isCardFlipped ? 'Click to see question' : 'Click to reveal answer'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Navigation & Actions */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={prevCard}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors
                                                ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleMastered(currentCard?.id)}
                                                className={`px-4 py-2 rounded-xl font-medium transition-all
                                                    ${masteredCards.has(currentCard?.id)
                                                        ? 'bg-green-500 text-white'
                                                        : isDark ? 'bg-gray-800 hover:bg-green-500/20 text-gray-300' : 'bg-gray-100 hover:bg-green-100 text-gray-700'
                                                    }`}
                                            >
                                                {masteredCards.has(currentCard?.id) ? '✓ Mastered' : 'Mark Mastered'}
                                            </button>
                                        </div>

                                        <button
                                            onClick={nextCard}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors
                                                ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                        >
                                            Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Card Dots Navigation */}
                                    <div className="flex justify-center gap-1 mt-6 flex-wrap">
                                        {flashcards.map((card, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setCurrentCardIndex(idx); setIsCardFlipped(false); }}
                                                className={`w-3 h-3 rounded-full transition-all
                                                    ${idx === currentCardIndex
                                                        ? 'bg-orange-500 scale-125'
                                                        : masteredCards.has(card.id)
                                                            ? 'bg-green-500'
                                                            : isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Regular Text Result (non-flashcard) */}
                            {result && !isLoading && !showFlashcardMode && (
                                <div className={`relative p-8 rounded-3xl border animate-enter ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
                                    <button onClick={copyToClipboard} className="absolute top-6 right-6 p-2 rounded-lg hover:bg-gray-500/10 transition-colors">
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                                    </button>
                                    <div className={`prose max-w-none prose-p:leading-relaxed text-sm md:text-base ${isDark ? 'prose-invert' : ''}`}>
                                        <React.Fragment>
                                            {/* Enhanced markdown-like formatting */}
                                            {result.split('\n').map((line, i) => {
                                                // Handle headers
                                                if (line.startsWith('## ')) {
                                                    return <h2 key={i} className={`text-lg font-bold mt-6 mb-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{line.replace('## ', '')}</h2>;
                                                }
                                                if (line.startsWith('### ')) {
                                                    return <h3 key={i} className={`text-md font-bold mt-4 mb-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{line.replace('### ', '')}</h3>;
                                                }
                                                if (line.startsWith('# ')) {
                                                    return <h1 key={i} className={`text-xl font-black mt-6 mb-3 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{line.replace('# ', '')}</h1>;
                                                }
                                                // Handle bold text with **
                                                if (line.includes('**')) {
                                                    const parts = line.split(/\*\*(.+?)\*\*/g);
                                                    return (
                                                        <p key={i} className={`my-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            {parts.map((part, j) =>
                                                                j % 2 === 1 ? <strong key={j} className="font-bold">{part}</strong> : part
                                                            )}
                                                        </p>
                                                    );
                                                }
                                                // Handle bullet points
                                                if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                                                    return (
                                                        <div key={i} className={`flex gap-2 my-1 ml-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            <span className="text-orange-500">•</span>
                                                            <span>{line.trim().replace(/^[-•]\s*/, '')}</span>
                                                        </div>
                                                    );
                                                }
                                                // Regular paragraph
                                                if (line.trim()) {
                                                    return <p key={i} className={`my-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{line}</p>;
                                                }
                                                return <div key={i} className="h-2" />;
                                            })}
                                        </React.Fragment>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat Tab */}
                    {activeTab === 'chat' && (
                        <div className={`flex flex-col h-[600px] rounded-3xl border overflow-hidden animate-enter opacity-0 delay-300 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`} style={{ animationFillMode: 'forwards' }}>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {chatMessages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                                        <Bot className="w-12 h-12 mb-3" />
                                        <p className="text-sm font-medium">Start asking questions about your content</p>
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-orange-500 text-white rounded-br-none'
                                            : isDark ? 'bg-gray-800 text-gray-200 rounded-tl-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                            }`}>
                                            {msg.role === 'user' ? msg.text : (
                                                <div className="space-y-1">
                                                    {msg.text.split('\n').map((line, idx) => {
                                                        if (line.startsWith('## ')) {
                                                            return <h2 key={idx} className={`text-md font-bold mt-3 mb-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{line.replace('## ', '')}</h2>;
                                                        }
                                                        if (line.startsWith('### ')) {
                                                            return <h3 key={idx} className={`text-sm font-bold mt-2 mb-1 ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>{line.replace('### ', '')}</h3>;
                                                        }
                                                        if (line.includes('**')) {
                                                            const parts = line.split(/\*\*(.+?)\*\*/g);
                                                            return (
                                                                <p key={idx} className="my-1 text-[14px]">
                                                                    {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-orange-500">{p}</strong> : p)}
                                                                </p>
                                                            );
                                                        }
                                                        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                                                            return (
                                                                <div key={idx} className="flex gap-2 my-0.5 ml-2 text-[14px]">
                                                                    <span className="text-orange-500">•</span>
                                                                    <span>{line.trim().replace(/^[-•]\s*/, '')}</span>
                                                                </div>
                                                            );
                                                        }
                                                        if (line.trim()) {
                                                            return <p key={idx} className="my-1 text-[14px]">{line}</p>;
                                                        }
                                                        return <div key={idx} className="h-1" />;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && (
                                    <div className="flex justify-start animate-message">
                                        <div className={`p-4 rounded-2xl rounded-tl-none flex items-center gap-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                            <span className="text-xs font-bold text-gray-500">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <form onSubmit={handleChatSubmit} className={`p-4 border-t ${isDark ? 'border-gray-800 bg-gray-950' : 'border-gray-100 bg-gray-50'}`}>
                                <div className="relative">
                                    <input
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Ask a question..."
                                        className={`w-full pl-6 pr-14 py-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all
                                            ${isDark ? 'bg-gray-900 text-white placeholder-gray-600' : 'bg-white text-gray-900 placeholder-gray-400 shadow-sm'}
                                        `}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isChatLoading || !chatInput.trim()}
                                        className="absolute right-2 top-2 bottom-2 aspect-square bg-orange-500 rounded-xl flex items-center justify-center text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DocumentStudy;
