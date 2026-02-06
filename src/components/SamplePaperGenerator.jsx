import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, FileCheck, CheckCircle2, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useSubscription } from '../contexts/SubscriptionContext';
import { API_BASE_URL } from '../utils/api';

// Use the worker from the npm package directly if possible, or a specific version from CDN that matches.
// Vite sometimes struggles with this, so we use the unpkg URL which is more reliable for valid ESM.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const SamplePaperGenerator = ({ retryableFetch }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(''); // 'parsing', 'analyzing', 'generating'
    const [generatedPaper, setGeneratedPaper] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setGeneratedPaper(null);
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

        // Extract text from remaining pages if any
        if (pdf.numPages > 5) {
            for (let i = 6; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                extractedText += `--- Page ${i} ---\n${pageText}\n\n`;
            }
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
                // For direct image upload, convert to base64
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
            setLoadingStep('AI analyzing structure & generating new paper...');

            const data = await retryableFetch(`${API_BASE_URL}/ai/generate-paper`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ extractedText, images })
            });

            // retryableFetch returns parsed JSON directly or throws on error
            if (data.error) {
                throw new Error(data.error || 'Failed to generate paper');
            }

            setGeneratedPaper(data.paper);

        } catch (err) {
            console.error("Generator Error:", err);
            setError(err.message || "Something went wrong during generation.");
        } finally {
            setIsLoading(false);
            setLoadingStep('');
        }
    };

    const downloadPaper = () => {
        if (!generatedPaper) return;
        const blob = new Blob([generatedPaper], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-paper-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                        Smart Paper Generator
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Upload a sample paper, and AI will generate a brand new one following the same pattern.
                    </p>
                </div>

                {/* Upload Section */}
                {!generatedPaper && !isLoading && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 transition-colors shadow-sm">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                                    {file ? file.name : "Drag & drop or click to upload"}
                                </p>
                                <p className="text-sm text-slate-500">Supported formats: PDF, JPG, PNG</p>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,image/*"
                                className="hidden"
                            />

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                >
                                    {file ? "Change File" : "Select File"}
                                </button>
                                {file && (
                                    <button
                                        onClick={handleUploadAndGenerate}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md hover:shadow-lg"
                                    >
                                        Generate Paper
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
                                <FileText className="w-8 h-8 text-indigo-600 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Generating Your Paper</h3>
                            <p className="text-slate-500 dark:text-slate-400">{loadingStep}</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-red-900 dark:text-red-200">Generation Failed</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Result View */}
                {generatedPaper && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-6 h-6" />
                                <span className="font-semibold text-lg">Paper Generated Successfully!</span>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setGeneratedPaper(null)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                >
                                    Generate Another
                                </button>
                                <button
                                    onClick={downloadPaper}
                                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download Markdown</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-8 prose dark:prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-sm md:text-base leading-relaxed">
                                    {generatedPaper}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SamplePaperGenerator;
