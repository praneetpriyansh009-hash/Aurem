import React from 'react';
import { AlertCircle, RefreshCw } from './Icons';

const CuteError = ({ message, onRetry }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div className="w-24 h-24 mb-6 relative">
                {/* Cute Ghost Illustration using CSS/SVG */}
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                    <path d="M50 10 C30 10 15 25 15 50 V80 Q15 90 25 90 Q35 90 35 80 Q35 70 45 80 Q55 90 55 80 Q55 70 65 80 Q75 90 75 80 V50 C75 25 70 10 50 10 Z" fill="#F0F4F8" />
                    <circle cx="35" cy="40" r="3" fill="#334155" />
                    <circle cx="65" cy="40" r="3" fill="#334155" />
                    <path d="M40 55 Q50 65 60 55" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <circle cx="20" cy="85" r="2" fill="#CBD5E1" className="animate-ping" style={{ animationDuration: '2s' }} />
                    <circle cx="80" cy="20" r="3" fill="#CBD5E1" className="animate-ping" style={{ animationDuration: '3s' }} />
                </svg>
            </div>

            <h3 className="text-xl font-bold text-theme-text mb-2">Oops! A Tiny Hiccup</h3>
            <p className="text-theme-muted mb-6 max-w-xs mx-auto">
                {message || "The learning spirits are taking a quick nap. Let's wake them up!"}
            </p>

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-2.5 bg-theme-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-theme-primary/25 hover:shadow-theme-primary/40 hover:-translate-y-0.5 transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                </button>
            )}
        </div>
    );
};

export default CuteError;
