import React, { useState, useEffect, useRef } from 'react';
import {
    Mic, Play, Pause, SkipBack, SkipForward, Radio, Volume2,
    FileText, Upload, Loader2, Check, Copy, X, ChevronRight,
    Layers, Sparkles, MessageSquare, Bot, User, FilePlus, Crown
} from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import * as pdfjsLib from 'pdfjs-dist';
import { PODCAST_API_URL, useRetryableFetch } from '../utils/api';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

// Kokoro is removed for performance reasons. 
// Using native Web Speech API Synthesis.

const PodcastGenerator = () => {
    const { isDark } = useTheme();
    const { retryableFetch } = useRetryableFetch();
    const { canUseFeature, incrementUsage, triggerUpgradeModal, isPro, getRemainingUses } = useSubscription();

    // --- State ---
    const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'syllabus'

    // Upload Mode State
    const [documentContent, setDocumentContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [topics, setTopics] = useState('');
    const [pdfImages, setPdfImages] = useState([]); // For handwritten PDFs - images sent to vision API

    // Syllabus Mode State
    const [syllabus, setSyllabus] = useState({
        subject: '',
        topic: '',
        level: 'University'
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [podcastScript, setPodcastScript] = useState([]); // [{speaker, text}]

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const [isPlaybackFinished, setIsPlaybackFinished] = useState(false);

    const fileInputRef = useRef(null);
    // Using browser SpeechSynthesis now

    // Voice state for better mobile support
    const [voices, setVoices] = useState([]);
    const isPlayingRef = useRef(false); // Ref to track playing state in callbacks

    // Load voices - critical for mobile where voices load async
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                setVoices(availableVoices);
                console.log('[Podcast] Loaded voices:', availableVoices.length);
            }
        };

        // Load immediately if available
        loadVoices();

        // Also listen for voiceschanged (required for mobile/some browsers)
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Keep isPlayingRef in sync
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // --- Cleanup on Unmount ---
    useEffect(() => {
        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);



    // --- File Handling ---

    // Convert PDF pages to images (for handwritten notes)
    const convertPdfToImages = async (arrayBuffer, maxPages = 5) => {
        try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const images = [];
            const pagesToRender = Math.min(pdf.numPages, maxPages);

            console.log(`[Podcast] Converting ${pagesToRender} PDF pages to images for vision...`);

            for (let i = 1; i <= pagesToRender; i++) {
                const page = await pdf.getPage(i);
                const scale = 1.5;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
                images.push({
                    pageNum: i,
                    data: base64,
                    mimeType: 'image/jpeg'
                });
            }

            return images;
        } catch (err) {
            console.error("PDF to image conversion error:", err);
            return [];
        }
    };

    const extractPdfTextPreview = async (arrayBuffer) => {
        try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            let totalChars = 0;
            const pagesToRead = Math.min(pdf.numPages, 10);

            for (let i = 1; i <= pagesToRead; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `--- Page ${i} ---\n${pageText}\n\n`;
                totalChars += pageText.replace(/\s/g, '').length;
            }

            return { text: fullText.trim(), charCount: totalChars, totalPages: pdf.numPages };
        } catch (err) {
            console.error("PDF extraction error:", err);
            return { text: '', charCount: 0, totalPages: 0 };
        }
    };

    const processFile = async (file) => {
        if (!file) return;
        setIsPdfLoading(true);
        setPdfImages([]);

        try {
            let content = '';
            let pdfPageImages = [];

            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();

                // Clone the arrayBuffer for reuse (PDF.js consumes it)
                const arrayBufferForText = arrayBuffer.slice(0);
                const arrayBufferForImages = arrayBuffer.slice(0);

                const { text, charCount, totalPages } = await extractPdfTextPreview(arrayBufferForText);

                // Detect handwritten PDF (low text content)
                const avgCharsPerPage = charCount / Math.max(totalPages, 1);
                const isLikelyHandwritten = avgCharsPerPage < 100;

                console.log(`[Podcast] PDF: ${charCount} chars, ${totalPages} pages. Handwritten: ${isLikelyHandwritten}`);

                if (isLikelyHandwritten) {
                    pdfPageImages = await convertPdfToImages(arrayBufferForImages, 5);
                    content = `[Handwritten PDF - ${pdfPageImages.length} pages ready for vision analysis]`;
                } else {
                    content = text || '';
                }
            } else {
                content = await file.text();
            }

            setFileName(file.name);
            setDocumentContent(content);
            setPdfImages(pdfPageImages);
            setPodcastScript([]);
            setCurrentLineIndex(-1);
            setIsPlaybackFinished(false);
        } catch (error) {
            console.error('File processing error:', error);
            alert('Failed to process file');
        } finally {
            setIsPdfLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- Podcast Generation ---
    const handleGeneratePodcast = async () => {
        if (activeMode === 'upload' && !documentContent) return alert("Please upload a document first.");
        if (activeMode === 'syllabus' && (!syllabus.topic || !syllabus.subject)) return alert("Please enter both a subject and a topic.");

        // Check usage limits for Basic users
        if (!canUseFeature('podcast')) {
            triggerUpgradeModal('podcast');
            return;
        }

        setIsGenerating(true);
        setPodcastScript([]);

        try {
            // Prepare images for vision processing if handwritten PDF
            const imageUrls = pdfImages.length > 0
                ? pdfImages.map(img => `data:${img.mimeType};base64,${img.data}`)
                : null;

            console.log(`[Podcast] Generating with ${pdfImages.length} images`);

            const response = await retryableFetch(PODCAST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: activeMode,
                    provider: 'groq',
                    tier: isPro ? 'pro' : 'basic',
                    content: activeMode === 'upload' ? documentContent.slice(0, 8000) : null,
                    topics: activeMode === 'upload' ? topics : null,
                    syllabus: activeMode === 'syllabus' ? syllabus : null,
                    images: imageUrls // Send PDF page images for vision processing
                })
            });

            if (response.script) {
                setPodcastScript(response.script);
                setCurrentLineIndex(-1);
                setIsPlaybackFinished(false);
                // Track usage after successful generation
                incrementUsage('podcast');
            } else {
                throw new Error("Invalid response format from server");
            }
        } catch (error) {
            const msg = error.message || "Unknown error";
            alert(`Failed to generate podcast: ${msg}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Audio Playback using Kokoro TTS (Natural AI Voices - Free & High Quality) ---
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [kokoroReady, setKokoroReady] = useState(false);
    const [kokoroLoadingProgress, setKokoroLoadingProgress] = useState('');

    // Initialize Kokoro TTS (lazy load on first play)
    const initKokoro = async () => {
        if (kokoroTTS) {
            setKokoroReady(true);
            return true;
        }

        try {
            setKokoroLoadingProgress('Loading AI voice model (first time only)...');

            // Dynamically import kokoro-js
            const { KokoroTTS } = await import('kokoro-js');

            setKokoroLoadingProgress('Initializing voices...');

            // Initialize with the default model (quantized for smaller size)
            kokoroTTS = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
                dtype: 'q4', // Quantized = smaller download (~20MB instead of 80MB)
                device: 'wasm' // WebAssembly for browser compatibility
            });

            // Get available voices
            const availableVoices = kokoroTTS.list_voices();
            console.log('[Kokoro] Available voices:', availableVoices);

            // Select distinct voices for our hosts
            // af = American Female, am = American Male, bf = British Female, bm = British Male
            const femaleVoices = availableVoices.filter(v => v.startsWith('af_') || v.startsWith('bf_'));
            const maleVoices = availableVoices.filter(v => v.startsWith('am_') || v.startsWith('bm_'));

            console.log('[Kokoro] Female voices:', femaleVoices);
            console.log('[Kokoro] Male voices:', maleVoices);

            // Sam = FEMALE (Warm, American/British)
            // Prioritize: af_bella > af_sky > af_sarah > any female > first available
            const samVoice =
                availableVoices.includes('af_bella') ? 'af_bella' :
                    availableVoices.includes('af_sky') ? 'af_sky' :
                        availableVoices.includes('af_sarah') ? 'af_sarah' :
                            femaleVoices.length > 0 ? femaleVoices[0] :
                                availableVoices[0];

            // Alex = MALE (Deep, Professional)
            // Prioritize: am_michael > am_adam > bm_george > any male > second available
            const alexVoice =
                availableVoices.includes('am_michael') ? 'am_michael' :
                    availableVoices.includes('am_adam') ? 'am_adam' :
                        availableVoices.includes('bm_george') ? 'bm_george' :
                            maleVoices.length > 0 ? maleVoices[0] :
                                availableVoices.length > 1 ? availableVoices[1] :
                                    availableVoices[0]; // Worst case: same voice

            kokoroVoices = {
                sam: samVoice,
                alex: alexVoice
            };

            // Final check: If voices are identical, force a pitch shift in playback later
            if (samVoice === alexVoice) {
                console.warn('[Kokoro] Warning: Could not find distinct voices. Using pitch shift fallback.');
                kokoroVoices.needsPitchShift = true;
            }

            console.log('[Kokoro] Using voices - Alex:', kokoroVoices.alex, 'Sam:', kokoroVoices.sam);

            setKokoroReady(true);
            setKokoroLoadingProgress('');
            return true;
        } catch (error) {
            console.error('[Kokoro] Failed to initialize:', error);
            setKokoroLoadingProgress('');
            // Fall back to browser speech
            return false;
        }
    };

    // Generate and play audio for a line using Browser TTS (Removed slow Kokoro)
    const speakLine = async (index) => {
        // Simply route to browser TTS for instantaneous playback
        return speakLineWithBrowserTTS(index);
    };

    // Fallback: Browser SpeechSynthesis
    const synthRef = useRef(window.speechSynthesis);
    const utteranceRef = useRef(null);

    const speakLineWithBrowserTTS = async (index) => {
        if (synthRef.current.speaking) {
            synthRef.current.cancel();
        }

        if (index >= podcastScript.length) {
            setIsPlaybackFinished(true);
            setIsPlaying(false);
            return;
        }

        setCurrentLineIndex(index);
        setIsLoadingAudio(true);

        try {
            const line = podcastScript[index];
            const utterance = new SpeechSynthesisUtterance(line.text);
            const availableVoices = voices.length > 0 ? voices : synthRef.current.getVoices();

            // Simple voice selection
            if (line.speaker === 'Alex') {
                utterance.pitch = 0.95;
                utterance.rate = 0.92;
            } else {
                utterance.pitch = 1.05;
                utterance.rate = 0.88;
            }
            utterance.volume = 1.0;

            if (availableVoices.length > 0) {
                const englishVoice = availableVoices.find(v => v.lang.includes('en'));
                if (englishVoice) utterance.voice = englishVoice;
            }

            utteranceRef.current = utterance;

            utterance.onend = () => {
                setIsLoadingAudio(false);
                if (isPlayingRef.current) {
                    speakLineWithBrowserTTS(index + 1);
                }
            };

            utterance.onerror = () => {
                setIsLoadingAudio(false);
                setIsPlaying(false);
            };

            utterance.onstart = () => {
                setIsLoadingAudio(false);
            };

            synthRef.current.speak(utterance);
        } catch (error) {
            console.error('Browser TTS Error:', error);
            setIsLoadingAudio(false);
            setIsPlaying(false);
        }
    };


    const togglePlayback = () => {
        if (isPlaying) {
            // PAUSE ACTION
            setIsPlaying(false);
            // Pause Kokoro audio if playing
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
            }
            // Also handle browser speech fallback
            if (synthRef.current.speaking) {
                synthRef.current.pause();
            }
        } else {
            // PLAY ACTION
            setIsPlaying(true);
            setIsPlaybackFinished(false);

            // Resume Kokoro audio if paused
            if (audioRef.current && audioRef.current.paused && audioRef.current.currentTime > 0) {
                audioRef.current.play();
            } else if (synthRef.current.paused) {
                // Resume browser speech if paused
                synthRef.current.resume();
            } else {
                // Start fresh
                speakLine(currentLineIndex === -1 ? 0 : currentLineIndex);
            }
        }
    };

    const stopPlayback = () => {
        // Stop Kokoro audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        // Stop browser speech fallback
        if (synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        setIsPlaying(false);
        setCurrentLineIndex(-1);
        setIsLoadingAudio(false);
    };


    return (
        <div className={`h-full bg-theme-bg text-theme-text font-sans transition-colors duration-300 overflow-y-auto custom-scrollbar`}>

            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between z-30 glass-3d-elevated border-b rounded-b-3xl mx-4 mt-4
                bg-theme-surface border-theme-border shadow-md
            `}>
                <div className="flex items-center gap-4 group cursor-default">
                    <div className={`p-3 rounded-2xl bg-theme-bg shadow-xl shadow-[var(--theme-primary)]/20 border border-theme-border group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500`}>
                        <Radio className="w-6 h-6 text-theme-primary animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black bg-gradient-to-r from-theme-primary to-theme-secondary bg-clip-text text-transparent uppercase tracking-tightest">
                                Audio Studio
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary text-[10px] font-black uppercase tracking-widest border border-theme-primary/20 shadow-[0_0_10px_var(--theme-primary)]">Neural Core v3.0</span>
                        </div>
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] mt-0.5">High-Fidelity Audio Generation</p>
                    </div>
                </div>
            </div>

            <div className="relative">
                {/* UNDER DEVELOPMENT OVERLAY */}
                <div className="absolute inset-x-0 inset-y-[-20px] z-50 bg-theme-bg/60 backdrop-blur-sm flex flex-col items-center justify-center border-t border-theme-border">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 mb-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        Under Development
                    </span>
                    <h3 className="text-xl font-serif italic text-theme-text">Audio Generation Paused</h3>
                    <p className="text-sm text-theme-muted mt-2 max-w-sm text-center">We are currently migrating to a new TTS engine. Please check back later.</p>
                </div>

                <div className="max-w-6xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 mt-8 opacity-30 pointer-events-none">

                    {/* Left Sidebar: Controls & Input */}
                    <div className="lg:col-span-4 space-y-6 animate-enter opacity-0 delay-100 fill-mode-forwards" style={{ animationFillMode: 'forwards' }}>

                        {/* Mode Selection Tabs */}
                        <div className="flex gap-2 p-1 rounded-2xl bg-theme-surface border border-theme-border backdrop-blur-sm">
                            <button
                                onClick={() => setActiveMode('upload')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300
                                ${activeMode === 'upload'
                                        ? 'bg-theme-primary text-theme-bg shadow-[0_0_15px_var(--theme-primary)] scale-[1.02]'
                                        : 'text-theme-muted hover:bg-theme-bg'}
                            `}
                            >
                                <Upload className="w-4 h-4" /> Personal
                            </button>
                            <button
                                onClick={() => setActiveMode('syllabus')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300
                                ${activeMode === 'syllabus'
                                        ? 'bg-theme-primary text-theme-bg shadow-[0_0_15px_var(--theme-primary)] scale-[1.02]'
                                        : 'text-theme-muted hover:bg-theme-bg'}
                            `}
                            >
                                <Sparkles className="w-4 h-4" /> Syllabus
                            </button>
                        </div>

                        {/* Tier Info */}
                        <div className={`p-4 rounded-3xl border flex items-center justify-between bg-theme-surface border-theme-border`}>
                            <div className="flex items-center gap-2">
                                {isPro ? (
                                    <>
                                        <Crown className="w-4 h-4 text-theme-primary" />
                                        <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest">PRO • 15 min podcasts</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">BASIC • 7 min podcasts</span>
                                        <span className="text-[10px] text-theme-primary font-bold">({getRemainingUses('podcast')} left today)</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {activeMode === 'upload' ? (
                            <>
                                {/* Upload Section */}
                                <div className={`p-6 rounded-3xl border bg-theme-surface border-theme-border shadow-sm`}>
                                    <h3 className="text-xs font-bold text-theme-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Upload className="w-4 h-4" /> Source Document
                                    </h3>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={e => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); }}
                                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
                                        ${isDragging ? 'border-theme-primary bg-theme-primary/10' : 'border-theme-border bg-theme-bg hover:border-theme-primary'}
                                    `}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" onChange={e => processFile(e.target.files?.[0])} className="hidden" />
                                        {fileName ? (
                                            <div>
                                                <FilePlus className="w-8 h-8 mx-auto mb-2 text-theme-primary" />
                                                <p className="text-sm font-bold truncate px-2 text-theme-text">{fileName}</p>
                                                <p className="text-[10px] text-theme-muted mt-1">Click to change</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload className={`w-8 h-8 mx-auto mb-2 ${isPdfLoading ? 'text-theme-primary animate-bounce' : 'text-theme-muted'}`} />
                                                <p className="text-sm font-bold text-theme-muted">{isPdfLoading ? 'Reading...' : 'Drop PDF or Text'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Topics Section */}
                                <div className={`p-6 rounded-3xl border bg-theme-surface border-theme-border shadow-sm`}>
                                    <h3 className="text-xs font-bold text-theme-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Layers className="w-4 h-4" /> Focal Points
                                    </h3>
                                    <textarea
                                        value={topics}
                                        onChange={e => setTopics(e.target.value)}
                                        placeholder="e.g., Focus on the methodology, or make it more humorous..."
                                        className={`w-full h-24 p-4 text-xs rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all
                                        bg-theme-bg text-theme-text placeholder-theme-muted border border-theme-border
                                    `}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className={`p-6 rounded-3xl border space-y-4 bg-theme-surface border-theme-border shadow-sm`}>
                                <h3 className="text-xs font-bold text-theme-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Syllabus Details
                                </h3>

                                <div>
                                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mb-2 block">Subject</label>
                                    <input
                                        type="text"
                                        value={syllabus.subject}
                                        onChange={e => setSyllabus({ ...syllabus, subject: e.target.value })}
                                        placeholder="e.g., Biology, Economics..."
                                        className={`w-full p-4 rounded-xl text-xs focus:ring-2 focus:ring-theme-primary outline-none transition-all
                                        bg-theme-bg text-theme-text border border-theme-border
                                    `}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mb-2 block">Topic Name</label>
                                    <input
                                        type="text"
                                        value={syllabus.topic}
                                        onChange={e => setSyllabus({ ...syllabus, topic: e.target.value })}
                                        placeholder="e.g., Mitochondrial DNA, Inflation..."
                                        className={`w-full p-4 rounded-xl text-xs focus:ring-2 focus:ring-theme-primary outline-none transition-all
                                        bg-theme-bg text-theme-text border border-theme-border
                                    `}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mb-2 block">Education Level</label>
                                    <select
                                        value={syllabus.level}
                                        onChange={e => setSyllabus({ ...syllabus, level: e.target.value })}
                                        className={`w-full p-4 rounded-xl text-xs focus:ring-2 focus:ring-theme-primary outline-none transition-all appearance-none
                                        bg-theme-bg text-theme-text border border-theme-border
                                    `}
                                    >
                                        <option>High School</option>
                                        <option>University</option>
                                        <option>Post Graduate</option>
                                        <option>Expert/Professional</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGeneratePodcast}
                            disabled={isGenerating || (activeMode === 'upload' ? !documentContent : (!syllabus.topic || !syllabus.subject))}
                            className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all duration-500 flex items-center justify-center gap-3 group
                            ${isGenerating || (activeMode === 'upload' ? !documentContent : (!syllabus.topic || !syllabus.subject))
                                    ? 'bg-theme-surface border border-theme-border text-theme-muted cursor-not-allowed opacity-50'
                                    : 'bg-theme-primary text-theme-bg shadow-[0_0_20px_var(--theme-primary)] hover:scale-[1.02] opacity-90 hover:opacity-100'}
                        `}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Scripting Podcast...
                                </>
                            ) : (
                                <>
                                    <Mic className="w-5 h-5 group-hover:animate-bounce" />
                                    Generate Podcast
                                </>
                            )}
                        </button>

                    </div>

                    {/* Right: Studio Player & Transcript */}
                    <div className="lg:col-span-8 animate-enter opacity-0 delay-200 fill-mode-forwards" style={{ animationFillMode: 'forwards' }}>

                        {/* Player UI */}
                        <div className={`p-10 rounded-[56px] glass-3d-elevated relative overflow-hidden transition-all duration-700
                        bg-theme-surface border border-theme-border shadow-2xl
                    `}>
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-theme-primary to-transparent animate-pulse opacity-50" />

                            {/* Status Bar */}
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-6">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all duration-500
                                    ${isPlaying
                                            ? 'bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg animate-pulse shadow-[0_0_15px_var(--theme-primary)]'
                                            : 'bg-theme-bg text-theme-muted border border-theme-border'}
                                `}>
                                        {isPlaying ? 'System Transmitting' : 'Buffer Standby'}
                                    </div>
                                    <div className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em]">
                                        {podcastScript.length > 0 ? `${podcastScript.length} Neural Segments` : 'Empty Buffer'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isLoadingAudio && <Loader2 className="w-5 h-5 text-theme-primary animate-spin" />}
                                    <div className="flex items-center gap-2 group cursor-pointer">
                                        <span className={`w-3 h-3 rounded-full transition-all duration-300 ${isPlaying ? 'bg-theme-secondary shadow-[0_0_15px_var(--theme-secondary)] scale-110' : 'bg-theme-bg border border-theme-border'}`}></span>
                                        <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest group-hover:text-theme-primary transition-colors">LIVE FEED</span>
                                    </div>
                                </div>
                            </div>

                            {/* Script / Transcript — Split-Screen Dual Speaker */}
                            <div className={`h-[400px] mb-8 transition-opacity duration-500 ${isGenerating ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                                {podcastScript.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-12">
                                        <div className={`p-6 rounded-full mb-6 bg-theme-bg border border-theme-border`}>
                                            <Mic className="w-12 h-12 text-theme-muted" />
                                        </div>
                                        <h4 className="text-xl font-bold mb-2 text-theme-text">Ready for Recording</h4>
                                        <p className="text-sm text-theme-muted">Upload a resource and generate a script to start your AI-hosted deep dive.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 h-full">
                                        {/* Alex Panel */}
                                        <div className={`rounded-2xl border overflow-hidden flex flex-col bg-theme-bg border-theme-border`}>
                                            <div className={`px-4 py-3 border-b flex items-center gap-3 shrink-0 border-theme-border bg-theme-surface`}>
                                                <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-theme-bg shadow-[0_0_10px_var(--theme-primary)] opacity-90">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest text-theme-text">Alex</span>
                                                <span className="text-[9px] bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded border border-theme-primary/20">HOST</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                                {podcastScript.map((line, idx) => line.speaker === 'Alex' && (
                                                    <div key={idx} className={`p-3 rounded-xl text-xs leading-relaxed transition-all duration-400 ${currentLineIndex === idx ? 'bg-theme-surface border border-theme-primary/40 text-theme-text font-medium shadow-[0_0_10px_var(--theme-primary)]' : 'opacity-70'}`}>
                                                        {line.text}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Sam Panel */}
                                        <div className={`rounded-2xl border overflow-hidden flex flex-col bg-theme-bg border-theme-border`}>
                                            <div className={`px-4 py-3 border-b flex items-center gap-3 shrink-0 border-theme-border bg-theme-surface`}>
                                                <div className="w-8 h-8 rounded-full bg-theme-secondary flex items-center justify-center text-theme-bg shadow-[0_0_10px_var(--theme-secondary)] opacity-90">
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest text-theme-text">Sam</span>
                                                <span className="text-[9px] bg-theme-secondary/10 text-theme-secondary px-1.5 py-0.5 rounded border border-theme-secondary/20">EXPERT</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                                {podcastScript.map((line, idx) => line.speaker === 'Sam' && (
                                                    <div key={idx} className={`p-3 rounded-xl text-xs leading-relaxed transition-all duration-400 ${currentLineIndex === idx ? 'bg-theme-surface border border-theme-secondary/40 text-theme-text font-medium shadow-[0_0_10px_var(--theme-secondary)]' : 'opacity-70'}`}>
                                                        {line.text}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controls Bar */}
                            <div className={`p-6 rounded-3xl border flex items-center justify-between bg-theme-bg border-theme-border shadow-inner`}>
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={stopPlayback}
                                        className="p-3 rounded-full hover:bg-theme-surface border border-transparent hover:border-theme-border text-theme-muted hover:text-theme-text transition-colors"
                                        title="Reset"
                                    >
                                        <SkipBack className="w-5 h-5 fill-current" />
                                    </button>

                                    <button
                                        onClick={togglePlayback}
                                        disabled={podcastScript.length === 0}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                                        ${podcastScript.length === 0
                                                ? 'bg-theme-surface border border-theme-border text-theme-muted'
                                                : 'bg-theme-primary text-theme-bg hover:scale-110 active:scale-95 shadow-[0_0_20px_var(--theme-primary)]'}
                                    `}
                                    >
                                        {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                                    </button>
                                </div>

                                {/* Waveform Visualization (Mock) */}
                                <div className="hidden md:flex flex-1 mx-12 items-center gap-[3px] h-8">
                                    {[...Array(30)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-[3px] rounded-full transition-all duration-300 ${isPlaying ? 'bg-theme-primary/60' : 'bg-theme-border'}`}
                                            style={{
                                                height: isPlaying ? `${Math.random() * 100}%` : '4px',
                                                animation: isPlaying ? `wave 1s ease-in-out infinite ${i * 0.05}s` : 'none'
                                            }}
                                        ></div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <Volume2 className="w-5 h-5 text-theme-muted" />
                                    <div className={`w-20 h-1 rounded-full bg-theme-border`}>
                                        <div className="w-3/4 h-full rounded-full bg-theme-primary"></div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>

            <style jsx>{`
                @keyframes wave {
                    0%, 100% { height: 20%; }
                    50% { height: 100%; }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDark ? '#374151' : '#E5E7EB'};
                    border-radius: 10px;
                }
            `}</style>
        </div >
    );
};

export default PodcastGenerator;
