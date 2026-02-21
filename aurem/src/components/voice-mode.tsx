"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Loader2, X, Sparkles } from "lucide-react";

interface VoiceModeProps {
    onClose?: () => void;
}

export default function VoiceMode({ onClose }: VoiceModeProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState("");
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.lang = "en-IN";

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    let final = "";
                    let interim = "";
                    for (let i = 0; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }
                    setTranscript(final || interim);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                    if (event.error !== "aborted") {
                        setError(`Speech recognition error: ${event.error}`);
                    }
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            } else {
                setError("Speech recognition not supported in this browser.");
            }
        }

        return () => {
            recognitionRef.current?.abort();
            window.speechSynthesis?.cancel();
        };
    }, []);

    const startListening = useCallback(() => {
        setError("");
        setTranscript("");
        setAiResponse("");
        try {
            recognitionRef.current?.start();
            setIsListening(true);
        } catch (err) {
            console.error(err);
            setError("Failed to start listening.");
        }
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const processQuestion = useCallback(async () => {
        if (!transcript.trim()) return;
        setIsProcessing(true);
        setAiResponse("");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: transcript }],
                    mode: "voice",
                }),
            });
            const data = await res.json();
            const reply = data.response || data.choices?.[0]?.message?.content || "I couldn't process that. Please try again.";
            setAiResponse(reply);

            // Speak the response
            speakResponse(reply);
        } catch (err) {
            console.error(err);
            setError("Failed to get AI response.");
        } finally {
            setIsProcessing(false);
        }
    }, [transcript]);

    const speakResponse = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Pick a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
            || voices.find(v => v.lang.startsWith("en"));
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

    // Auto-process when user stops talking
    useEffect(() => {
        if (!isListening && transcript.trim() && !isProcessing && !aiResponse) {
            const timer = setTimeout(processQuestion, 500);
            return () => clearTimeout(timer);
        }
    }, [isListening, transcript, isProcessing, aiResponse, processQuestion]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-xl flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-lg relative"
            >
                {/* Close Button */}
                {onClose && (
                    <button onClick={() => { stopSpeaking(); onClose(); }}
                        className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white z-10">
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* Main Content */}
                <div className="text-center">
                    {/* Orb */}
                    <div className="relative mb-10">
                        <motion.div
                            animate={isListening ? {
                                scale: [1, 1.15, 1.05, 1.2, 1],
                                boxShadow: ["0 0 0 0 rgba(139,92,246,0)", "0 0 60px 20px rgba(139,92,246,0.3)", "0 0 40px 10px rgba(139,92,246,0.15)", "0 0 80px 30px rgba(139,92,246,0.4)", "0 0 0 0 rgba(139,92,246,0)"],
                            } : isSpeaking ? {
                                scale: [1, 1.08, 1.03, 1.1, 1],
                                boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 40px 15px rgba(16,185,129,0.3)", "0 0 20px 8px rgba(16,185,129,0.15)", "0 0 50px 20px rgba(16,185,129,0.35)", "0 0 0 0 rgba(16,185,129,0)"],
                            } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center cursor-pointer
                                ${isListening ? "bg-gradient-to-br from-purple-600 to-violet-700" :
                                    isSpeaking ? "bg-gradient-to-br from-emerald-600 to-teal-700" :
                                        isProcessing ? "bg-gradient-to-br from-amber-600 to-orange-700" :
                                            "bg-gradient-to-br from-gray-700 to-gray-800 hover:from-purple-700 hover:to-violet-800"}`}
                            onClick={() => {
                                if (isListening) stopListening();
                                else if (isSpeaking) stopSpeaking();
                                else startListening();
                            }}
                        >
                            {isProcessing ? (
                                <Loader2 className="w-12 h-12 text-white animate-spin" />
                            ) : isListening ? (
                                <Mic className="w-12 h-12 text-white animate-pulse" />
                            ) : isSpeaking ? (
                                <Volume2 className="w-12 h-12 text-white" />
                            ) : (
                                <Mic className="w-12 h-12 text-gray-300" />
                            )}
                        </motion.div>

                        {/* Pulse rings when listening */}
                        {isListening && (
                            <>
                                <motion.div animate={{ scale: [1, 2], opacity: [0.3, 0] }} transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 w-40 h-40 mx-auto rounded-full border-2 border-purple-500" style={{ left: "50%", marginLeft: "-80px" }} />
                                <motion.div animate={{ scale: [1, 2.5], opacity: [0.2, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    className="absolute inset-0 w-40 h-40 mx-auto rounded-full border border-purple-500/50" style={{ left: "50%", marginLeft: "-80px" }} />
                            </>
                        )}
                    </div>

                    {/* Status */}
                    <p className={`text-xs font-bold uppercase tracking-[0.3em] mb-6 ${isListening ? "text-purple-400" : isSpeaking ? "text-emerald-400" : isProcessing ? "text-amber-400" : "text-gray-500"}`}>
                        {isListening ? "Listening..." : isSpeaking ? "Speaking..." : isProcessing ? "Thinking..." : "Tap to speak"}
                    </p>

                    {/* Transcript */}
                    {transcript && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-2xl bg-gray-900/80 border border-gray-800 text-left">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">You said:</p>
                            <p className="text-sm text-white">{transcript}</p>
                        </motion.div>
                    )}

                    {/* AI Response */}
                    {aiResponse && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-left max-h-[250px] overflow-y-auto">
                            <p className="text-[10px] text-purple-400 uppercase font-bold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AUREM says:</p>
                            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                        </motion.div>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-red-400 mb-4">{error}</p>
                    )}

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                        {aiResponse && (
                            <button onClick={() => speakResponse(aiResponse)}
                                className="px-5 py-3 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold hover:bg-gray-700 transition-all flex items-center gap-2">
                                <Volume2 className="w-4 h-4" /> Replay
                            </button>
                        )}
                        {(transcript || aiResponse) && (
                            <button onClick={() => { setTranscript(""); setAiResponse(""); startListening(); }}
                                className="px-5 py-3 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-all flex items-center gap-2">
                                <Mic className="w-4 h-4" /> Ask Again
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
