import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, Download, Play, Trophy, ArrowRight, Save, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useSubscription } from '../contexts/SubscriptionContext';
import { API_BASE_URL } from '../utils/api';

// Use the worker from the npm package directly if possible, or a specific version from CDN that matches.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const SamplePaperGenerator = ({ retryableFetch }) => {
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

    const renderQuestion = (q, sectionName) => {
        return (
            <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Q{q.number}</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{q.marks} Marks</span>
                </div>

                <p className="text-slate-800 dark:text-slate-200 mb-4 whitespace-pre-wrap">{q.text}</p>

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
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3 h-3" />
                        Beta Feature • Under Development
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                        Interactive Paper Generator
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                        {mode === 'upload' && "Upload a sample to generate a similar interactive test. This feature is experimental and may produce unexpected results."}
                        {mode === 'attempt' && "Good luck! Attempt the questions below."}
                        {mode === 'result' && "Analysis complete. Review your performance."}
                    </p>
                </div>

                {/* Upload Mode */}
                {mode === 'upload' && !isLoading && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 transition-colors shadow-sm animate-in fade-in">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                                    {file ? file.name : "Drag & drop original paper (PDF/Image)"}
                                </p>
                            </div>

                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />

                            <div className="flex space-x-3">
                                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                                    {file ? "Change File" : "Select File"}
                                </button>
                                {file && (
                                    <button onClick={handleUploadAndGenerate} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md">
                                        Generate & Start Test
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
    );
};

export default SamplePaperGenerator;
