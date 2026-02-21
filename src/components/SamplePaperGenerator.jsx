import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, Download, Play, Trophy, ArrowRight, Save, RotateCcw } from './Icons';
import * as pdfjsLib from 'pdfjs-dist';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../utils/api';

// Use the worker from the npm package directly if possible, or a specific version from CDN that matches.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const SamplePaperGenerator = ({ retryableFetch }) => {
    const { isDark } = useTheme();
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(''); // 'parsing', 'analyzing', 'generating'
    const [error, setError] = useState(null);

    // Interactive State
    const [paperData, setPaperData] = useState(null); // The parsed JSON paper
    const [mode, setMode] = useState('upload'); // 'upload', 'attempt', 'result'
    const [answers, setAnswers] = useState({}); // { qId: "user answer" }
    const [evaluation, setEvaluation] = useState(null); // AI grading result

    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setPaperData(null);
            setMode('upload');
        }
    };

    const convertPdfToImages = async (pdfData) => {
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = Math.min(pdf.numPages, 5); // Limit to first 5 pages for vision context
        const images = [];
        let extractedText = "";

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);

            // Extract text
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            extractedText += `--- Page ${i} ---\n${pageText}\n\n`;

            // Render to image
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            images.push(canvas.toDataURL('image/jpeg', 0.8));
        }

        if (pdf.numPages > 5) {
            extractedText += `... (Remaining pages truncacted for performance)`;
        }

        return { images, extractedText };
    };

    const handleUploadAndGenerate = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);

        try {
            let extractedText = "";
            let images = [];

            // 1. Process File
            setLoadingStep('Processing file...');

            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await convertPdfToImages(arrayBuffer);
                extractedText = result.extractedText;
                images = result.images;
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                });
                reader.readAsDataURL(file);
                const base64Img = await base64Promise;
                images = [base64Img];
                extractedText = "Analyzed from image content.";
            } else {
                throw new Error("Unsupported file type. Please upload PDF or Image.");
            }

            // 2. Call AI
            setLoadingStep('AI designing new paper (this may take a minute)...');

            const data = await retryableFetch(`${API_BASE_URL}/ai/generate-paper`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ extractedText, images })
            });

            if (data.error) throw new Error(data.error || 'Failed to generate paper');
            if (!data.paper || !data.paper.sections) throw new Error('Invalid paper format received from AI');

            setPaperData(data.paper);
            setMode('attempt');

            // Initialize empty answers
            const initialAnswers = {};
            data.paper.sections.forEach(section => {
                section.questions.forEach(q => {
                    initialAnswers[q.id] = "";
                });
            });
            setAnswers(initialAnswers);

        } catch (err) {
            console.error("Generator Error:", err);
            setError(err.message || "Something went wrong during generation.");
        } finally {
            setIsLoading(false);
            setLoadingStep('');
        }
    };

    const handleAnswerChange = (qId, value) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
    };

    const handleSubmitPaper = async () => {
        if (!paperData) return;

        // Confirm submission
        if (!window.confirm("Are you sure you want to submit your paper for grading?")) return;

        setIsLoading(true);
        setLoadingStep('AI Examiner is grading your answers...');

        try {
            // Flatten questions for evaluation
            const allQuestions = [];
            paperData.sections.forEach(s => s.questions.forEach(q => allQuestions.push(q)));

            const data = await retryableFetch(`${API_BASE_URL}/ai/evaluate-paper`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAnswers: answers,
                    questions: allQuestions
                })
            });

            if (data.error) throw new Error(data.error);

            setEvaluation(data.evaluation);
            setMode('result');

        } catch (err) {
            console.error("Evaluation Error:", err);
            setError(err.message || "Failed to submit paper.");
        } finally {
            setIsLoading(false);
            setLoadingStep('');
        }
    };

    const downloadPaperMarkdown = () => {
        if (!paperData) return;

        let md = `# ${paperData.title}\n\n`;
        paperData.sections.forEach(section => {
            md += `## ${section.name}\n\n`;
            section.questions.forEach(q => {
                md += `**Q${q.number}.** ${q.text} (${q.marks} marks)\n`;
                if (q.type === 'mcq' && q.options) {
                    q.options.forEach((opt, idx) => md += `- ${String.fromCharCode(65 + idx)}. ${opt}\n`);
                }
                md += `\n`;
            });
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-paper-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // --- Render Helpers ---

    const renderQuestion = (q) => {
        return (
            <div key={q.id} className={`p-6 rounded-[24px] border glass-3d glow-border transition-all duration-300 mb-6
                ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-warm-200/50 shadow-sm'}
            `}>
                <div className="flex justify-between items-start mb-4">
                    <span className="font-black text-[10px] uppercase tracking-widest text-theme-muted">Question {q.number}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20`}>{q.marks} Marks</span>
                </div>

                <p className="text-lg font-bold mb-6 leading-relaxed">{q.text}</p>

                {q.type === 'mcq' && q.options ? (
                    <div className="space-y-2">
                        {q.options.map((option, idx) => (
                            <label key={idx} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all
                                ${answers[q.id] === option
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value={option}
                                    checked={answers[q.id] === option}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="ml-3 text-slate-700 dark:text-slate-300">{option}</span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <textarea
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px]"
                        placeholder="Type your answer here..."
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                )}
            </div>
        );
    };

    const renderResultParams = (qId) => {
        if (!evaluation) return null;
        const result = evaluation.results.find(r => r.id === qId);
        if (!result) return null;

        const isFullMarks = result.marksObtained === (paperData.sections.find(s => s.questions.find(q => q.id === qId))?.questions.find(q => q.id === qId)?.marks || 0);

        return (
            <div className={`mt-4 p-4 rounded-lg text-sm border-l-4 ${result.marksObtained > 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-500' : 'bg-red-50 dark:bg-red-900/10 border-red-500'}`}>
                <div className="flex justify-between font-bold mb-1">
                    <span className={result.marksObtained > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                        {result.marksObtained > 0 ? 'Marks Awarded' : 'Needs Improvement'}
                    </span>
                    <span>{result.marksObtained} Marks</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{result.feedback}</p>
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full transition-colors duration-300 overflow-hidden ${isDark ? 'bg-midnight-950 text-white' : 'bg-warm-50 text-slate-900'}`}>
            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between z-30 glass-3d border-b rounded-b-3xl mx-4 mt-4 shrink-0
                ${isDark ? 'bg-midnight-900/40 border-white/[0.08]' : 'bg-white/40 border-warm-200/50'}
            `}>
                <div className="flex items-center gap-4 group">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500`}>
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent uppercase tracking-tight">
                                Synthetic Examiner
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30 mt-1">Under Development (Beta Version)</span>
                        </div>
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mt-0.5">High-Fidelity Test Generation</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                <div className="max-w-4xl mx-auto w-full space-y-12 pb-20">

                    <div className="text-center space-y-4">
                        <p className="text-theme-muted max-w-2xl mx-auto leading-relaxed italic">
                            {mode === 'upload' && "Autonomous replication of standard testing protocols. Upload your reference material to initialize."}
                            {mode === 'attempt' && "Session active. Optimal performance requested."}
                            {mode === 'result' && "Evaluation complete. Metrics synthesized below."}
                        </p>
                    </div>

                    {/* Upload Mode */}
                    {mode === 'upload' && !isLoading && (
                        <div className={`rounded-[40px] p-12 border glass-3d glow-border transition-all duration-500 hover:scale-[1.01]
                            ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white/90 border-warm-200/50 shadow-2xl'}
                        `}>
                            <div className="flex flex-col items-center justify-center space-y-6">
                                <div className="p-6 bg-indigo-500/10 rounded-3xl animate-pulse">
                                    <Upload className="w-10 h-10 text-indigo-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-black text-theme-primary uppercase tracking-tight">
                                        {file ? file.name : "Initialize Neural Upload"}
                                    </p>
                                    <p className="text-xs text-theme-muted mt-2 uppercase tracking-widest font-black">PDF / Image • Standard Protocol</p>
                                </div>

                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-indigo-500 glass-3d glow-border rounded-2xl hover:bg-indigo-500/5 transition-all">
                                        {file ? "Change Target" : "Select Source"}
                                    </button>
                                    {file && (
                                        <button onClick={handleUploadAndGenerate} className="px-8 py-3 text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all">
                                            Active Protocol
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-white">AI Examiner Working</h3>
                                <p className="text-slate-500 dark:text-slate-400">{loadingStep}</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-red-900 dark:text-red-200">Error Occurred</h4>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Attempt & Result Mode */}
                    {(mode === 'attempt' || mode === 'result') && paperData && !isLoading && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-10">
                            {/* Paper Title & Actions */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <h2 className="text-2xl font-bold">{paperData.title}</h2>
                                <div className="flex gap-2">
                                    <button onClick={downloadPaperMarkdown} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                                        <Download className="w-4 h-4" /> Save Markdown
                                    </button>
                                    {mode === 'result' && (
                                        <button onClick={() => { setMode('upload'); setFile(null); setPaperData(null); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">
                                            <RotateCcw className="w-4 h-4" /> New Test
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Result Score Card */}
                            {mode === 'result' && evaluation && (
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg animate-in zoom-in">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-indigo-100 font-medium mb-1">Total Score</p>
                                            <h3 className="text-4xl font-bold">{evaluation.studentScore} <span className="text-2xl opacity-70">/ {evaluation.totalMarks}</span></h3>
                                        </div>
                                        <Trophy className="w-16 h-16 text-yellow-300 opacity-90" />
                                    </div>
                                </div>
                            )}

                            {/* Sections & Questions */}
                            {paperData.sections.map((section, sIdx) => (
                                <div key={sIdx} className="space-y-4">
                                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white border-b pb-2">{section.name}</h3>
                                    {section.questions.map((q) => (
                                        <div key={q.id}>
                                            {renderQuestion(q, section.name)}
                                            {mode === 'result' && renderResultParams(q.id)}
                                        </div>
                                    ))}
                                </div>
                            ))}

                            {/* Submit Button */}
                            {mode === 'attempt' && (
                                <div className="sticky bottom-6 flex justify-center pt-4">
                                    <button
                                        onClick={handleSubmitPaper}
                                        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all text-lg"
                                    >
                                        <CheckCircle2 className="w-6 h-6" /> Submit for Grading
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SamplePaperGenerator;
