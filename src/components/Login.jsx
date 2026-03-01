import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuremLogo } from './SplashScreen';
import { X } from './Icons';

const Login = ({ onSwitchToSignup }) => {
    const [error, setError] = useState('');
    const { loginWithGoogle } = useAuth();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
        if (cardRef.current) {
            cardRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
        } catch (err) {
            console.error(err);
            let msg = 'Failed to sign in.';
            if (err.code === 'auth/popup-closed-by-user') msg = 'Sign-in cancelled.';
            if (err.code === 'auth/network-request-failed') msg = 'Connection error. Check your internet.';
            if (err.code === 'auth/invalid-api-key') msg = 'System Error: Invalid API Key.';
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden cursor-none bg-theme-bg">
            {/* Ambient orbs using theme colors */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full blur-[150px]"
                    style={{ background: 'rgba(var(--theme-primary), 0.08)', animation: 'auth-float 12s ease-in-out infinite' }} />
                <div className="absolute bottom-[15%] right-[15%] w-[350px] h-[350px] rounded-full blur-[130px]"
                    style={{ background: 'rgba(var(--theme-secondary), 0.05)', animation: 'auth-float 15s ease-in-out infinite', animationDelay: '-5s' }} />
                <div className="absolute top-8 right-20 w-20 h-20 rounded-full blur-2xl opacity-20"
                    style={{ background: 'rgba(var(--theme-primary), 0.2)', animation: 'auth-float 8s ease-in-out infinite' }} />
                <div className="absolute bottom-12 left-12 w-28 h-28 rounded-full blur-2xl opacity-15"
                    style={{ background: 'rgba(var(--theme-primary), 0.15)', animation: 'auth-float 10s ease-in-out infinite', animationDelay: '2s' }} />
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(var(--theme-primary), 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--theme-primary), 0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
            }} />

            {/* 3D Tilt Card */}
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full max-w-[440px] relative group transition-all duration-500 ease-out z-10"
                style={{ transform: 'perspective(2000px)', transformStyle: 'preserve-3d' }}
            >
                {/* Glow behind card */}
                <div className="absolute -inset-4 rounded-[40px] blur-3xl transition duration-1000 group-hover:opacity-100 opacity-20 animate-pulse"
                    style={{ background: 'linear-gradient(135deg, rgba(var(--theme-primary), 0.15), rgba(var(--theme-secondary), 0.1))' }} />

                {/* Card */}
                <div className="relative p-12 rounded-[40px] flex flex-col items-center text-center border shadow-2xl shadow-black/60 bg-theme-surface border-theme-primary/10"
                    style={{ backdropFilter: 'blur(24px)' }}
                >
                    {/* Accent bar */}
                    <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-[40px]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--theme-primary),1), transparent)' }} />

                    {/* Light Sweep Effect */}
                    <div className="absolute inset-0 rounded-[40px] overflow-hidden pointer-events-none">
                        <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent rotate-45 group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                    </div>

                    {/* Logo */}
                    <div className="mb-8 relative">
                        <div className="relative">
                            <AuremLogo className="w-20 h-20" />
                            <div className="absolute -inset-4 rounded-full blur-2xl -z-10"
                                style={{ background: 'rgba(var(--theme-primary), 0.12)', animation: 'pulse 3s ease-in-out infinite' }} />
                        </div>
                    </div>

                    <h2 className="text-3xl font-serif italic mb-2 tracking-wide text-theme-text">
                        Welcome to{' '}
                        <span className="text-theme-primary">Aurem</span>
                    </h2>

                    <p className="text-sm mb-8 leading-relaxed max-w-[280px] text-theme-muted">
                        Where curiosity becomes clarity.
                        <br />Your AI-powered study companion.
                    </p>

                    {error && (
                        <div className="mb-6 w-full p-3 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center gap-3 text-red-400 text-xs text-left">
                            <X className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="w-full space-y-4">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="group relative w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl font-semibold
                                transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
                                disabled:opacity-60 disabled:cursor-not-allowed cursor-none
                                bg-theme-primary text-theme-bg hover:opacity-90 shadow-lg
                            "
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-theme-bg/30 border-t-theme-bg rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-10 pt-6 w-full flex justify-between items-center text-[11px] border-t border-theme-border text-theme-muted" style={{ opacity: 0.4 }}>
                        <span className="font-medium">Aurem v2.0</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Systems Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes auth-float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(15px, -20px); }
                }
            `}</style>
        </div>
    );
};

export default Login;
