import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, User, Bot, Loader2, Send, BookOpen, Clock, BrainCircuit, Image, X, Upload, Crown, RefreshCw } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { useLearnLoop } from '../contexts/LearnLoopContext';
import { GROQ_API_URL } from '../utils/api';

const DoubtSolver = ({ retryableFetch }) => {
    const { isDark } = useTheme();
    const { isPro, triggerUpgradeModal, canUseFeature, incrementUsage } = useSubscription();
    const { getDifficultyLevel } = usePerformance();
    const { startLoop } = useLearnLoop();
    const { currentUser } = useAuth();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    const [typedGreeting, setTypedGreeting] = useState('');
    const [showChatUI, setShowChatUI] = useState(false);

    useEffect(() => {
        const name = currentUser?.displayName?.split(' ')[0] || 'Student';
        const fullText = `Hi, ${name}.`;
        let i = 0;
        // Scroll container to top on open so greeting is visible
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                i++;
                setTypedGreeting(fullText.slice(0, i));
                if (i >= fullText.length) {
                    clearInterval(interval);
                    setTimeout(() => setShowChatUI(true), 1000);
                }
            }, 60);
            return () => clearInterval(interval);
        }, 400);
        return () => clearTimeout(timer);
    }, [currentUser]);

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
        1. **Structure**: For academic/complex questions, use Markdown with clear headers (## Summary, ## Explanation, etc).
        2. **Conversational**: IF the user is just saying 'hi', 'hello', or greeting you, DO NOT use the strict academic Structure. Just reply in a brief, friendly, human-like but elite conversational manner.
        3. **Direct Answer**: Be concise and logical. No meta-commentary.
        4. **Logical Consistency**: Ensure your explanation flows logically. Never contradict yourself.
        5. **Vision**: If an image is provided, analyze it thoroughly and precisely.

        BEHAVIOR RULES:
        - Never hallucinate facts. If unsure, say so.
        - Use elegant formatting with readable hierarchy for complex subjects.
        - No emojis unless the user uses them.
        - No motivational talk. No insecurity validation.
        - If the user shows uncertainty: Guide with Socratic questioning, don't just give the answer.
        - Adapt depth dynamically — simplify for beginners, deepen for advanced queries.
        
        CURRENT USER PERFORMANCE LEVEL: ${getDifficultyLevel().toUpperCase()}
        -> IF EASY: Explain concepts very simply, use relatable analogies, break down steps completely.
        -> IF INTERMEDIATE: Balance theory with practical steps, assume some base knowledge.
        -> IF HARD: Be extremely concise, highly technical, and focus on profound insights and advanced applications.`;

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


    const renderLine = (line, idx) => {
        if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-base font-display font-bold mt-4 mb-2 text-theme-primary">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
            return <h3 key={idx} className={`text-sm font-display font-bold mt-3 mb-1 text-theme-secondary`}>{line.replace('### ', '')}</h3>;
        }
        if (line.includes('**')) {
            const parts = line.split(/\*\*(.+?)\*\*/g);
            return (
                <p key={idx} className="my-1.5 text-[14px] leading-relaxed">
                    {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-theme-secondary">{p}</strong> : p)}
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
        <div className={`flex flex-col h-full relative overflow-hidden transition-colors duration-300 bg-theme-bg`}>

            {/* ═══ Header ═══ */}
            <div className={`px-6 py-5 flex items-center justify-between z-30 glass-3d-elevated border-b rounded-b-3xl mx-4 mt-4 bg-theme-surface border-theme-border shadow-theme-border/10`}>
                <div className="flex items-center gap-4 group cursor-default">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br from-theme-primary to-theme-secondary shadow-xl shadow-theme-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                        <BrainCircuit className="w-6 h-6 text-theme-bg" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black tracking-tightest bg-gradient-to-r from-theme-secondary via-theme-primary to-theme-secondary bg-clip-text text-transparent uppercase`}>
                            Neural Query
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-pulse shadow-[0_0_8px_var(--theme-primary)]" />
                            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">Aurem AI Core v3.0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Chat Area ═══ */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 custom-scrollbar z-10">
                {messages.length === 0 && (
                    <div className="max-w-3xl mx-auto py-8 space-y-12 flex flex-col items-center justify-center min-h-[55vh]">
                        {/* Welcome Header */}
                        <div className="text-center space-y-6">
                            {/* Gold AUREM Logo */}
                            <div className={`transition-all duration-1000 transform ${typedGreeting.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                <h1 className="font-serif italic font-light text-5xl tracking-widest text-[#c9a55a] drop-shadow-[0_0_15px_rgba(201,165,90,0.3)] select-none">
                                    ✦ Aurem
                                </h1>
                            </div>

                            {/* Typing Greeting */}
                            <h2 className="text-3xl md:text-4xl font-black tracking-tightest text-theme-text h-10 flex items-center justify-center gap-1">
                                {typedGreeting}
                                {!showChatUI && <span className="w-0.5 h-8 bg-theme-primary animate-pulse" />}
                            </h2>

                            {/* Subtitle */}
                            <div className={`transition-all duration-1000 ${showChatUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <p className="text-theme-muted max-w-lg mx-auto leading-relaxed text-sm">
                                    I understand concepts deeply and guide you step-by-step. I never give full answers until you understand the "why".
                                </p>
                            </div>
                        </div>


                        {/* What to help with prompt */}
                        <div className={`text-center transition-all duration-1000 ${showChatUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}>
                            <p className="text-theme-primary text-base font-semibold tracking-wide">
                                What can I help you with today?
                            </p>
                            <p className="text-theme-muted text-xs mt-2 opacity-60">
                                Type a question, paste a problem, or upload an image below.
                            </p>
                        </div>
                    </div>
                )}

                {messages.length > 0 && messages.map((msg, i) => (
                    <div key={i} className={`flex w-full animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        style={{ animationDelay: `${Math.min(i * 50, 200)}ms` }}>
                        <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                            {/* Sender badge */}
                            <div className="flex items-center mb-1.5 px-1 gap-2">
                                {msg.role === 'assistant' && (
                                    <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center">
                                        <Sparkles className="w-3 h-3 text-theme-bg" />
                                    </div>
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-wider
                                    ${msg.role === 'user' ? 'text-theme-muted' : 'text-theme-primary'}
                                `}>
                                    {msg.role === 'user' ? 'You' : 'Aurem'}
                                </span>
                                <span className="text-[10px] text-theme-muted opacity-50">{msg.timestamp}</span>
                            </div>

                            {/* Message Bubble */}
                            <div className={`relative p-5 sm:p-6 rounded-[28px] transition-all duration-500 glass-3d glow-border
                                 ${msg.role === 'user'
                                    ? 'bg-theme-surface border border-theme-primary/30 text-theme-primary rounded-tr-none shadow-lg'
                                    : msg.isError
                                        ? `bg-red-500/10 border border-red-500/30 text-red-500 rounded-tl-none`
                                        : `bg-theme-surface border border-theme-border shadow-xl shadow-black/20 rounded-tl-none`
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

                                <div className={`${msg.role === 'user' ? 'text-theme-primary' : 'text-theme-text'}`}>
                                    {msg.role === 'user' ? (
                                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{msg.content}</div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {msg.content.split('\n').map((line, idx) => renderLine(line, idx))}
                                        </div>
                                    )}
                                </div>

                                {msg.canEradicate && (
                                    <div className={`mt-4 pt-3 flex justify-end border-t border-theme-border`}>
                                        <button
                                            onClick={() => handleEradicateDoubt(msg.topicContext)}
                                            className="px-3.5 py-1.5 bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg text-[11px] font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
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
                            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-theme-bg" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-theme-primary">Aurem</span>
                        </div>
                    </div>
                )}
                {isLoading && (
                    <div className="flex justify-start pl-1">
                        <div className={`px-5 py-4 rounded-2xl rounded-tl-md flex items-center gap-1.5 bg-theme-surface border border-theme-border`}>
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                            <div className="typing-dot" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ═══ Input Area ═══ */}
            <div className={`p-4 z-20 backdrop-blur-xl border-t bg-theme-bg border-theme-border transition-all duration-1000 ${showChatUI || messages.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
                <div className="max-w-3xl mx-auto space-y-2">
                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="flex items-center gap-3 animate-slide-up">
                            <div className="relative group">
                                <img src={imagePreview} alt="Preview" className="w-14 h-14 rounded-xl object-cover border-2 border-theme-primary/50 shadow-md" />
                                <button
                                    onClick={clearImage}
                                    className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-md hover:bg-rose-600 transition-colors"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </div>
                            <span className="text-xs text-theme-primary font-semibold">Image attached</span>
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
                                className={`p-3 rounded-2xl border transition-all duration-200 relative border-theme-border bg-theme-surface hover:bg-theme-surface text-theme-muted hover:text-theme-primary`}
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
                                className={`w-full py-3.5 pl-5 pr-12 rounded-2xl text-[14px] font-medium outline-none transition-all duration-200 bg-theme-surface text-theme-text placeholder:text-theme-muted border border-theme-border focus:border-theme-primary focus:shadow-[0_0_0_3px_var(--theme-primary)]`}
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || (!input.trim() && !selectedImage)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-theme-primary to-theme-secondary hover:brightness-110 disabled:opacity-30 text-theme-bg rounded-xl shadow-md transition-all active:scale-95"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>

                <p className={`text-center mt-3 text-[10px] uppercase tracking-widest text-theme-muted/50`}>
                    Made with ❤️ by Praneet Priyansh for students
                </p>
            </div>
        </div>
    );
};

export default DoubtSolver;
