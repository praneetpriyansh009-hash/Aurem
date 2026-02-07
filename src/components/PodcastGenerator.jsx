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

// Kokoro TTS will be lazily loaded on first play
let kokoroTTS = null;
let kokoroVoices = {};

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

            // Select good voices for our hosts
            // af = American Female, am = American Male
            kokoroVoices = {
                // Sam = Female voice - warm and friendly
                sam: availableVoices.includes('af_bella') ? 'af_bella' :
                    availableVoices.includes('af_sky') ? 'af_sky' :
                        availableVoices[0],
                // Alex = Male voice - clear and professional
                alex: availableVoices.includes('am_michael') ? 'am_michael' :
                    availableVoices.includes('am_adam') ? 'am_adam' :
                        availableVoices.includes('bf_emma') ? 'bf_emma' : // British female as fallback
                            availableVoices[1] || availableVoices[0]
            };

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

    // Generate and play audio for a line using Kokoro
    const speakLine = async (index) => {
        // Stop any current audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (index >= podcastScript.length) {
            setIsPlaybackFinished(true);
            setIsPlaying(false);
            return;
        }

        // Set current line immediately for UI
        setCurrentLineIndex(index);
        setIsLoadingAudio(true);

        try {
            const line = podcastScript[index];

            // Try Kokoro first
            if (!kokoroTTS) {
                const initialized = await initKokoro();
                if (!initialized) {
                    // Fallback to browser speech
                    await speakLineWithBrowserTTS(index);
                    return;
                }
            }

            // Generate audio with Kokoro
            const voice = line.speaker === 'Alex' ? kokoroVoices.alex : kokoroVoices.sam;
            console.log(`[Kokoro] Generating audio for ${line.speaker} using voice: ${voice}`);

            const audio = await kokoroTTS.generate(line.text, { voice });

            // Convert to playable audio
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Get audio data and create a blob URL
            const wavBlob = new Blob([audio.toWav()], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(wavBlob);

            // Create and play audio element
            audioRef.current = new Audio(audioUrl);
            audioRef.current.playbackRate = line.speaker === 'Alex' ? 1.0 : 0.95; // Slightly slower for Sam

            audioRef.current.onended = () => {
                setIsLoadingAudio(false);
                URL.revokeObjectURL(audioUrl); // Clean up blob URL
                if (isPlayingRef.current) {
                    speakLine(index + 1);
                }
            };

            audioRef.current.onerror = (e) => {
                console.error('[Kokoro] Playback error:', e);
                setIsLoadingAudio(false);
                URL.revokeObjectURL(audioUrl);
                // Try next line anyway
                if (isPlayingRef.current) {
                    speakLine(index + 1);
                }
            };

            audioRef.current.oncanplaythrough = () => {
                setIsLoadingAudio(false);
            };

            await audioRef.current.play();

        } catch (error) {
            console.error('[Kokoro] TTS Error:', error);
            // Fallback to browser speech synthesis
            await speakLineWithBrowserTTS(index);
        }
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
        <div className={`h-full ${isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'} font-sans transition-colors duration-300 overflow-y-auto custom-scrollbar`}>

            {/* Header */}
            <div className="py-8 text-center animate-enter">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Radio className="w-10 h-10 text-rose-500 animate-pulse" />
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-500 tracking-tight">AI Podcast Studio</h1>
                </div>
                <p className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">Turn Documents into Engaging Deep-Dive Podcasts</p>
            </div>

            <div className="max-w-5xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Sidebar: Controls & Input */}
                <div className="lg:col-span-4 space-y-6 animate-enter opacity-0 delay-100 fill-mode-forwards" style={{ animationFillMode: 'forwards' }}>

                    {/* Mode Selection Tabs */}
                    <div className="flex gap-2 p-1 rounded-2xl bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveMode('upload')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300
                                ${activeMode === 'upload'
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-[1.02]'
                                    : 'text-gray-500 hover:bg-white/10'}
                            `}
                        >
                            <Upload className="w-4 h-4" /> Personal
                        </button>
                        <button
                            onClick={() => setActiveMode('syllabus')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300
                                ${activeMode === 'syllabus'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-[1.02]'
                                    : 'text-gray-500 hover:bg-white/10'}
                            `}
                        >
                            <Sparkles className="w-4 h-4" /> Syllabus
                        </button>
                    </div>

                    {/* Tier Info */}
                    <div className={`p-4 rounded-3xl border flex items-center justify-between ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                            {isPro ? (
                                <>
                                    <Crown className="w-4 h-4 text-amber-500" />
                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">PRO • 15 min podcasts</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">BASIC • 7 min podcasts</span>
                                    <span className="text-[10px] text-rose-500 font-bold">({getRemainingUses('podcast')} left today)</span>
                                </>
                            )}
                        </div>
                    </div>

                    {activeMode === 'upload' ? (
                        <>
                            {/* Upload Section */}
                            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Upload className="w-4 h-4" /> Source Document
                                </h3>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={e => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); }}
                                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
                                        ${isDragging ? 'border-rose-500 bg-rose-500/10' : isDark ? 'border-gray-800 bg-black/20 hover:border-gray-700' : 'border-gray-300 bg-gray-50 hover:border-rose-400'}
                                    `}
                                >
                                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" onChange={e => processFile(e.target.files?.[0])} className="hidden" />
                                    {fileName ? (
                                        <div>
                                            <FilePlus className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                                            <p className="text-sm font-bold truncate px-2">{fileName}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">Click to change</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload className={`w-8 h-8 mx-auto mb-2 ${isPdfLoading ? 'text-rose-500 animate-bounce' : 'text-gray-400'}`} />
                                            <p className="text-sm font-bold text-gray-400">{isPdfLoading ? 'Reading...' : 'Drop PDF or Text'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Topics Section */}
                            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Layers className="w-4 h-4" /> Focal Points
                                </h3>
                                <textarea
                                    value={topics}
                                    onChange={e => setTopics(e.target.value)}
                                    placeholder="e.g., Focus on the methodology, or make it more humorous..."
                                    className={`w-full h-24 p-4 text-xs rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all
                                        ${isDark ? 'bg-black/40 text-gray-300 placeholder-gray-600' : 'bg-gray-50 text-gray-700 placeholder-gray-400'}
                                    `}
                                />
                            </div>
                        </>
                    ) : (
                        <div className={`p-6 rounded-3xl border space-y-4 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Syllabus Details
                            </h3>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Subject</label>
                                <input
                                    type="text"
                                    value={syllabus.subject}
                                    onChange={e => setSyllabus({ ...syllabus, subject: e.target.value })}
                                    placeholder="e.g., Biology, Economics..."
                                    className={`w-full p-4 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all
                                        ${isDark ? 'bg-black/40 text-white' : 'bg-gray-50 text-gray-900 border border-gray-100'}
                                    `}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Topic Name</label>
                                <input
                                    type="text"
                                    value={syllabus.topic}
                                    onChange={e => setSyllabus({ ...syllabus, topic: e.target.value })}
                                    placeholder="e.g., Mitochondrial DNA, Inflation..."
                                    className={`w-full p-4 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all
                                        ${isDark ? 'bg-black/40 text-white' : 'bg-gray-50 text-gray-900 border border-gray-100'}
                                    `}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">Education Level</label>
                                <select
                                    value={syllabus.level}
                                    onChange={e => setSyllabus({ ...syllabus, level: e.target.value })}
                                    className={`w-full p-4 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none
                                        ${isDark ? 'bg-black/40 text-white' : 'bg-gray-50 text-gray-900 border border-gray-100'}
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
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                : activeMode === 'upload'
                                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25 hover:scale-[1.02]'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:scale-[1.02]'}
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
                    <div className={`p-8 rounded-[2rem] border overflow-hidden relative ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>

                        {/* Status Bar */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-700 text-gray-400'}`}>
                                    {isPlaying ? 'Live on Air' : 'Studio Standby'}
                                </div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    {podcastScript.length > 0 ? `${podcastScript.length} exchanges scripted` : 'No script loaded'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isLoadingAudio && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
                                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-gray-600'}`}></span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">REC</span>
                            </div>
                        </div>

                        {/* Script / Transcript Area */}
                        <div className={`h-[400px] overflow-y-auto mb-8 pr-4 custom-scrollbar space-y-6 transition-opacity duration-500 ${isGenerating ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                            {podcastScript.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center px-12">
                                    <div className={`p-6 rounded-full mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                        <Mic className="w-12 h-12 text-gray-400" />
                                    </div>
                                    <h4 className="text-xl font-bold mb-2">Ready for Recording</h4>
                                    <p className="text-sm text-gray-500">Upload a resource and generate a script to start your AI-hosted deep dive.</p>
                                </div>
                            ) : (
                                podcastScript.map((line, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex gap-4 p-4 rounded-2xl transition-all duration-500 ${currentLineIndex === idx ? (isDark ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-rose-50 border border-rose-200') : ''}`}
                                    >
                                        <div className="shrink-0 pt-1">
                                            {line.speaker === 'Alex' ? (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white font-black text-xs">A</div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-xs">S</div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{line.speaker}</span>
                                                {currentLineIndex === idx && <div className="flex items-center gap-1"><span className="w-1 h-3 bg-rose-500 rounded-full animate-[pulse_1s_infinite]"></span><span className="w-1 h-3 bg-rose-500 rounded-full animate-[pulse_1.2s_infinite]"></span><span className="w-1 h-3 bg-rose-500 rounded-full animate-[pulse_0.8s_infinite]"></span></div>}
                                            </div>
                                            <p className={`text-sm leading-relaxed ${currentLineIndex === idx ? (isDark ? 'text-white' : 'text-gray-950 font-medium') : 'text-gray-500'}`}>
                                                {line.text}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Controls Bar */}
                        <div className={`p-6 rounded-3xl border flex items-center justify-between ${isDark ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={stopPlayback}
                                    className="p-3 rounded-full hover:bg-gray-500/10 text-gray-500 transition-colors"
                                    title="Reset"
                                >
                                    <SkipBack className="w-5 h-5 fill-current" />
                                </button>

                                <button
                                    onClick={togglePlayback}
                                    disabled={podcastScript.length === 0}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                                        ${podcastScript.length === 0
                                            ? 'bg-gray-800 text-gray-600'
                                            : 'bg-rose-500 text-white hover:scale-110 active:scale-95 shadow-rose-500/40'}
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
                                        className={`w-[3px] rounded-full transition-all duration-300 ${isPlaying ? 'bg-rose-500/60' : 'bg-gray-700'}`}
                                        style={{
                                            height: isPlaying ? `${Math.random() * 100}%` : '4px',
                                            animation: isPlaying ? `wave 1s ease-in-out infinite ${i * 0.05}s` : 'none'
                                        }}
                                    ></div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <Volume2 className="w-5 h-5 text-gray-500" />
                                <div className={`w-20 h-1 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                    <div className="w-3/4 h-full rounded-full bg-rose-500"></div>
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
        </div>
    );
};

export default PodcastGenerator;
