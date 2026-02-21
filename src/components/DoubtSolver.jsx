import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, User, Bot, Loader2, Send, BookOpen, Clock, BrainCircuit, Image, X, Upload, Crown, RefreshCw, Activity, Infinity, Zap } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { useLearnLoop } from '../contexts/LearnLoopContext';
import { GROQ_API_URL } from '../utils/api';

const DoubtSolver = ({ retryableFetch }) => {
    const { isDark } = useTheme();
    const { isPro, triggerUpgradeModal } = useSubscription();
    const { startLoop } = useLearnLoop();
    const { currentUser } = useAuth();

    const [messages, setMessages] = useState([{
        role: 'assistant',
        content: "Hello! I'm AUREM, your AI study companion. Ask me anything about your subjects, and I'll help you understand it clearly!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new window.Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!isPro) {
            triggerUpgradeModal('vision');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }
        try {
            const compressed = await compressImage(file, 1024, 0.8);
            setImagePreview(compressed);
            setSelectedImage(compressed.split(',')[1]);
        } catch (err) {
            console.error('Image compression error:', err);
            alert('Failed to process image. Please try a smaller image.');
        }
    };

    const clearImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!input.trim() && !selectedImage) || isLoading) return;

        const userQuestion = input.trim();
        const imageToSend = selectedImage;
        const imagePreviewToSend = imagePreview;

        setInput('');
        clearImage();

        const newMessage = {
            role: 'user',
            content: userQuestion || (imageToSend ? '[Image Uploaded]' : ''),
            image: imagePreviewToSend,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newMessage]);
        setIsLoading(true);

        let systemPrompt = `You are AUREM — an elite AI study companion and cognitive augmentation system.

        CORE IDENTITY:
        - Tone: Elite. Intelligent. Calm. Structured.
        - Transform questions into mastered understanding.
        - Pure cognitive clarity. No fluff. No filler.

        OUTPUT FORMAT:
        1. **Structure**: Always use Markdown with clear headers (## Summary, ## Explanation).
        2. **Summary**: Start with a concise "## Summary" section — executive-level clarity in bullet points.
        3. **Explanation**: Provide a detailed "## Explanation" section with logical depth.
        4. **Direct Answer**: Be concise and logical. No meta-commentary.
        5. **Logical Consistency**: Ensure your explanation flows logically. Never contradict yourself.
        6. **Vision**: If an image is provided, analyze it thoroughly and precisely.

        BEHAVIOR RULES:
        - Never hallucinate facts. If unsure, say so.
        - Use elegant formatting with readable hierarchy.
        - No emojis unless the user uses them.
        - No motivational talk. No insecurity validation.
        - If the user shows uncertainty: Guide with Socratic questioning, don't just give the answer.
        - Adapt depth dynamically — simplify for beginners, deepen for advanced queries.`;

        try {
            let payload;

            if (imageToSend) {
                payload = {
                    messages: [{
                        role: "user",
                        content: [
                            { type: "text", text: `${systemPrompt}\n\nUSER QUESTION: ${userQuestion || "Analyze this image."}` },
                            { type: "image_url", image_url: { url: imagePreviewToSend } }
                        ]
                    }],
                    temperature: 0.5,
                    max_tokens: 1024
                };
            } else {
                const conversationHistory = messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                payload = {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory,
                        { role: 'user', content: userQuestion }
                    ]
                };
            }

            const result = await retryableFetch(GROQ_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (result.error) {
                const detailedMsg = result.details
                    ? `${result.error}: ${result.message} (${result.details})`
                    : (result.message ? `${result.error}: ${result.message}` : JSON.stringify(result.error));
                throw new Error(detailedMsg);
            }

            const responseText = result.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: responseText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                canEradicate: true,
                topicContext: userQuestion
            }]);

        } catch (err) {
            console.error(err);
            const errorMessage = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${errorMessage}`,
                isError: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEradicateDoubt = (topic) => {
        const cleanTopic = topic ? topic.substring(0, 50) : "Complex Topic";
        startLoop(cleanTopic);
    };

    const suggestedDoubts = [
        { id: 'physics', text: "Explain Newton's Laws of Motion", icon: Sparkles, color: 'from-emerald-400 to-teal-500' },
        { id: 'math', text: "Solve: ∫ x²dx from 0 to 3", icon: Activity, color: 'from-blue-400 to-indigo-500' },
        { id: 'bio', text: "DNA replication process", icon: Infinity, color: 'from-rose-400 to-pink-500' },
        { id: 'electromag', text: "Explain electromagnetic induction", icon: Zap, color: 'from-orange-400 to-amber-500' }
    ];

    // --- Markdown line renderer ---
    const renderLine = (line, idx) => {
        if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-base font-display font-bold mt-4 mb-2 text-theme-primary">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
            return <h3 key={idx} className={`text-sm font-display font-bold mt-3 mb-1 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{line.replace('### ', '')}</h3>;
        }
        if (line.includes('**')) {
            const parts = line.split(/\*\*(.+?)\*\*/g);
            return (
                <p key={idx} className="my-1.5 text-[14px] leading-relaxed">
                    {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-theme-primary">{p}</strong> : p)}
                </p>
            );
        }
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
            return (
                <div key={idx} className="flex gap-2.5 my-1 ml-1 text-[14px] leading-relaxed">
                    <span className="text-theme-primary mt-0.5">•</span>
                    <span>{line.trim().replace(/^[-•]\s*/, '')}</span>
                </div>
            );
        }
        if (line.trim()) {
            return <p key={idx} className="my-1.5 text-[14px] leading-relaxed">{line}</p>;
        }
        return <div key={idx} className="h-1.5" />;
    };

    return (
        <div className={`flex flex-col h-full relative overflow-hidden transition-colors duration-300
            ${isDark ? 'bg-midnight-900' : 'bg-warm-50'}
        `}>

            {/* ═══ Header ═══ */}
            <div className={`px-6 py-5 flex items-center justify-between z-30 glass-3d border-b rounded-b-3xl mx-4 mt-4
                ${isDark ? 'bg-midnight-900/40 border-white/[0.08]' : 'bg-white/40 border-warm-200/50'}
            `}>
                <div className="flex items-center gap-4 group cursor-default">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500`}>
                        <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black tracking-tight bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent uppercase`}>
                            Aurem Intelligence
                        </h2>
                    </div>
                </div>
            </div>

            {/* ═══ Chat Area ═══ */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 custom-scrollbar z-10">
                {messages.length === 1 && (
                    <div className="max-w-3xl mx-auto py-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {/* Welcome Header */}
                        <div className="text-center space-y-3">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tightest">
                                <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                                    Hello, {currentUser?.displayName?.split(' ')[0] || 'Student'}!
                                </span>
                            </h1>
                            <div className="space-y-1">
                                <h3 className={`text-lg font-bold ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                                    I'm AUREM — your AI study companion
                                </h3>
                                <p className="text-theme-muted max-w-lg mx-auto leading-relaxed text-sm">
                                    I understand concepts deeply and guide you step-by-step. I never give full answers until you understand the "why".
                                </p>
                            </div>
                        </div>

                        {/* Suggested Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {suggestedDoubts.map((doubt) => (
                                <button
                                    key={doubt.id}
                                    onClick={() => {
                                        setInput(doubt.text);
                                        // Auto send could be added here
                                    }}
                                    className={`group relative p-6 rounded-[28px] border glass-3d glow-border text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
                                        ${isDark ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]' : 'bg-white border-warm-200 shadow-sm hover:shadow-md'}
                                    `}
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${doubt.color} p-2.5 mb-4 shadow-lg shadow-indigo-500/10`}>
                                        <doubt.icon className="w-full h-full text-white" />
                                    </div>
                                    <p className="font-bold text-theme-primary leading-snug">{doubt.text}</p>
                                    <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Send className="w-4 h-4 text-theme-muted" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.length > 1 && messages.map((msg, i) => (
                    <div key={i} className={`flex w-full animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        style={{ animationDelay: `${Math.min(i * 50, 200)}ms` }}>
                        <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                            {/* Sender badge */}
                            <div className="flex items-center mb-1.5 px-1 gap-2">
                                {msg.role === 'assistant' && (
                                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                        <Sparkles className="w-3 h-3 text-white" />
                                    </div>
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-wider
                                    ${msg.role === 'user' ? 'text-theme-muted' : 'text-indigo-500'}
                                `}>
                                    {msg.role === 'user' ? 'You' : 'Aurem'}
                                </span>
                                <span className="text-[10px] text-theme-muted opacity-50">{msg.timestamp}</span>
                            </div>

                            {/* Message Bubble */}
                            <div className={`relative p-5 sm:p-6 rounded-[24px] transition-all duration-300 glass-3d glow-border
                                 ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-sm shadow-xl shadow-indigo-500/20'
                                    : msg.isError
                                        ? `${isDark ? 'bg-red-500/15 border border-red-500/30' : 'bg-red-50 border border-red-200'} rounded-tl-sm`
                                        : `${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white/90 border border-warm-200/50'} rounded-tl-sm`
                                }
                             `}>
                                {msg.isSyllabusVerified && (
                                    <div className="mb-2.5 inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                                        <BookOpen className="w-3 h-3 mr-1.5" /> Context Verified
                                    </div>
                                )}

                                {msg.image && (
                                    <div className="mb-3 rounded-xl overflow-hidden shadow-md">
                                        <img src={msg.image} alt="Uploaded" className="w-full h-auto max-h-52 object-cover" />
                                    </div>
                                )}

                                <div className={`${msg.role === 'user' ? 'text-white/95' : isDark ? 'text-white/80' : 'text-warm-700'}`}>
                                    {msg.role === 'user' ? (
                                        <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.content}</div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {msg.content.split('\n').map((line, idx) => renderLine(line, idx))}
                                        </div>
                                    )}
                                </div>

                                {msg.canEradicate && (
                                    <div className={`mt-4 pt-3 flex justify-end border-t ${isDark ? 'border-white/[0.04]' : 'border-warm-200/40'}`}>
                                        <button
                                            onClick={() => handleEradicateDoubt(msg.topicContext)}
                                            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[11px] font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Eradicate Doubt
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                    <div className="flex justify-start animate-fade-in pl-1">
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Aurem</span>
                        </div>
                    </div>
                )}
                {isLoading && (
                    <div className="flex justify-start pl-1">
                        <div className={`px-5 py-4 rounded-2xl rounded-tl-md flex items-center gap-1.5
                            ${isDark ? 'bg-midnight-700/60 border border-white/[0.05]' : 'bg-white/80 border border-warm-300/20'}
                        `}>
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ═══ Input Area ═══ */}
            <div className={`p-4 z-20 backdrop-blur-xl border-t
                ${isDark ? 'bg-midnight-900/80 border-white/[0.04]' : 'bg-warm-50/80 border-warm-300/20'}
            `}>
                <div className="max-w-3xl mx-auto space-y-2">
                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="flex items-center gap-3 animate-slide-up">
                            <div className="relative group">
                                <img src={imagePreview} alt="Preview" className="w-14 h-14 rounded-xl object-cover border-2 border-violet-500/50 shadow-md" />
                                <button
                                    onClick={clearImage}
                                    className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-md hover:bg-rose-600 transition-colors"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </div>
                            <span className="text-xs text-violet-500 font-semibold">Image attached</span>
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
                        {/* Image Upload */}
                        <div className="relative flex-shrink-0">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={`p-3 rounded-2xl border transition-all duration-200 relative
                                    ${isDark
                                        ? 'border-white/[0.06] bg-midnight-700/50 hover:bg-white/[0.06] text-white/40 hover:text-violet-400'
                                        : 'border-warm-300/30 bg-white/60 hover:bg-white text-warm-400 hover:text-violet-500'
                                    }
                                `}
                                title={isPro ? "Upload Image" : "Upload Image (Pro)"}
                            >
                                <Image className="w-5 h-5" />
                                {!isPro && (
                                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 shadow-sm">
                                        <Crown className="w-2 h-2 text-white" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Text Input */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={selectedImage ? "Ask about this image..." : "Ask Aurem anything..."}
                                className={`w-full py-3.5 pl-5 pr-12 rounded-2xl text-[14px] font-medium outline-none transition-all duration-200
                                    ${isDark
                                        ? 'bg-midnight-700/50 text-white placeholder:text-white/25 border border-white/[0.06] focus:border-indigo-500/40 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
                                        : 'bg-white/70 text-warm-800 placeholder:text-warm-400 border border-warm-300/25 focus:border-indigo-400/40 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.06)]'
                                    }
                                `}
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || (!input.trim() && !selectedImage)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-30 text-white rounded-xl shadow-md transition-all active:scale-95"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>

                <p className={`text-center mt-3 text-[10px] uppercase tracking-widest
                    ${isDark ? 'text-white/15' : 'text-warm-400/50'}
                `}>
                    Made with ❤️ by Praneet Priyansh for students
                </p>
            </div>
        </div>
    );
};

export default DoubtSolver;
