"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Sparkles, BookOpen, HelpCircle, List, Loader2, X, Download } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";

interface DocAnalysis {
    summary: string;
    keyPoints: string[];
    questions: { question: string; answer: string }[];
}

export default function DocumentsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [docContent, setDocContent] = useState("");
    const [analysis, setAnalysis] = useState<DocAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState<"summary" | "keypoints" | "questions">("summary");
    const { canUseFeature, incrementUsage, triggerUpgrade } = useSubscription();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploaded = e.target.files?.[0];
        if (!uploaded) return;
        setFile(uploaded);
        const text = await uploaded.text();
        setDocContent(text.substring(0, 50000));
    };

    const analyzeDocument = async () => {
        if (!docContent) return;
        if (!canUseFeature("documentUploads")) {
            triggerUpgrade("Document Analysis");
            return;
        }

        setIsAnalyzing(true);
        incrementUsage("documentUploads");

        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: docContent }),
            });
            const data = await res.json();
            setAnalysis(data);
        } catch {
            setAnalysis({
                summary: "Analysis failed. Please try again.",
                keyPoints: ["Upload a document to get started"],
                questions: [],
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const tabs = [
        { id: "summary" as const, label: "Summary", icon: BookOpen },
        { id: "keypoints" as const, label: "Key Points", icon: List },
        { id: "questions" as const, label: "Questions", icon: HelpCircle },
    ];

    return (
        <div className="h-full overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-6 no-scrollbar">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-white">Aurem Lens</h1>
                        <p className="text-xs text-white/40">Upload documents • AI summarizes • Auto-generates questions</p>
                    </div>
                </div>

                {/* Upload Area */}
                {!file && (
                    <label className="glass-panel-hover p-12 flex flex-col items-center justify-center cursor-pointer group border-dashed border-2 border-white/[0.08] hover:border-aurem-500/30">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-aurem-500/10 transition-colors">
                            <Upload className="w-8 h-8 text-white/30 group-hover:text-aurem-500 transition-colors" />
                        </div>
                        <p className="text-white/60 font-medium mb-1">Drop your PDF or text file here</p>
                        <p className="text-white/30 text-sm">Supports PDF, TXT — Max 10MB</p>
                        <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} id="doc-upload" />
                    </label>
                )}

                {/* File Uploaded */}
                {file && !analysis && (
                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <FileText className="w-5 h-5 text-orange-400" />
                            <span className="text-white font-medium flex-1 truncate">{file.name}</span>
                            <button onClick={() => { setFile(null); setDocContent(""); }} className="text-white/30 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-white/40 text-sm mb-4">{(docContent.length / 1000).toFixed(1)}k characters loaded</p>
                        <button onClick={analyzeDocument} disabled={isAnalyzing} className="btn-primary w-full flex items-center justify-center gap-2" id="analyze-doc">
                            {isAnalyzing ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                            ) : (
                                <><Sparkles className="w-5 h-5" /> Analyze with AI</>
                            )}
                        </button>
                    </div>
                )}

                {/* Analysis Results */}
                {analysis && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* File Info */}
                        <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-orange-400" />
                            <span className="text-sm text-white/60 flex-1 truncate">{file?.name}</span>
                            <button onClick={() => { setFile(null); setDocContent(""); setAnalysis(null); }} className="text-xs text-white/30 hover:text-white">
                                Upload New
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/60"
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="glass-panel p-6">
                            {activeTab === "summary" && (
                                <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{analysis.summary}</div>
                            )}
                            {activeTab === "keypoints" && (
                                <ul className="space-y-3">
                                    {analysis.keyPoints.map((point, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-aurem-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-[10px] text-aurem-400 font-bold">{i + 1}</span>
                                            </div>
                                            <span className="text-white/70 text-sm leading-relaxed">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {activeTab === "questions" && (
                                <div className="space-y-4">
                                    {analysis.questions.map((q, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                            <p className="text-white/80 text-sm font-medium mb-2">Q{i + 1}: {q.question}</p>
                                            <p className="text-white/40 text-sm">💡 {q.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
