import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuremLogo } from './SplashScreen';
import { X } from './Icons';

// Generate shooting stars
const generateStars = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 60 - 10,
        delay: Math.random() * 6,
        duration: 1 + Math.random() * 2,
        size: 1 + Math.random() * 1.5,
        angle: 25 + Math.random() * 30,
        opacity: 0.3 + Math.random() * 0.5,
    }));
};

const Login = ({ onSwitchToSignup }) => {
    const [error, setError] = useState('');
    const { loginWithGoogle } = useAuth();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const cardRef = useRef(null);
    const [stars] = useState(() => generateStars(25));

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
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
            style={{
                background: 'linear-gradient(145deg, #050510 0%, #0d0d2b 30%, #0a0a1a 60%, #050510 100%)'
            }}
        >
            {/* Shooting Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {stars.map(star => (
                    <div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            top: `${star.top}%`,
                            left: `${star.left}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            background: '#818cf8',
                            boxShadow: `0 0 ${star.size * 3}px ${star.size}px rgba(129,140,248,0.5), -${star.size * 15}px 0 ${star.size * 10}px ${star.size * 0.5}px rgba(129,140,248,0.2)`,
                            transform: `rotate(${star.angle}deg)`,
                            animation: `loginStar ${star.duration}s ${star.delay}s ease-in infinite`,
                            opacity: 0,
                        }}
                    />
                ))}
            </div>

            {/* Ambient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full blur-[150px] bg-indigo-600/10" style={{ animation: 'floatSlow 12s ease-in-out infinite' }} />
                <div className="absolute bottom-[15%] right-[15%] w-[350px] h-[350px] rounded-full blur-[130px] bg-violet-600/8" style={{ animation: 'floatSlow 15s ease-in-out infinite', animationDelay: '-5s' }} />
                <div className="absolute top-8 right-20 w-20 h-20 rounded-full blur-2xl opacity-30 bg-indigo-500/30" style={{ animation: 'floatSlow 8s ease-in-out infinite' }} />
                <div className="absolute bottom-12 left-12 w-28 h-28 rounded-full blur-2xl opacity-20 bg-violet-500/20" style={{ animation: 'floatSlow 10s ease-in-out infinite', animationDelay: '2s' }} />
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(129,140,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
            }} />

            {/* 3D Tilt Card */}
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full max-w-[400px] relative group transition-transform duration-200 ease-out z-10"
                style={{ transform: 'perspective(1200px)', transformStyle: 'preserve-3d' }}
            >
                {/* Glow behind card */}
                <div className="absolute -inset-1.5 rounded-3xl blur-xl transition duration-700 bg-gradient-to-r from-indigo-500/15 via-violet-500/15 to-purple-500/15 group-hover:opacity-100 opacity-40" />

                {/* Card */}
                <div className="relative p-10 rounded-3xl flex flex-col items-center text-center backdrop-blur-xl border bg-[#0d0d25]/80 border-white/[0.06] shadow-2xl shadow-indigo-500/5">
                    {/* Logo */}
                    <div className="mb-8 relative">
                        <div className="relative">
                            <AuremLogo className="w-20 h-20" />
                            <div className="absolute -inset-4 bg-indigo-500/15 rounded-full blur-2xl -z-10" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
                        </div>
                    </div>

                    <h2 className="text-3xl font-display font-extrabold mb-2 tracking-tight text-white">
                        Welcome to{' '}
                        <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">Aurem</span>
                    </h2>

                    <p className="text-sm mb-8 leading-relaxed max-w-[280px] text-white/35">
                        Where curiosity becomes clarity.
                        <br />Your AI-powered study companion.
                    </p>

                    {error && (
                        <div className="mb-6 w-full p-3 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center gap-3 text-red-400 text-xs text-left animate-scale-in">
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
                                disabled:opacity-60 disabled:cursor-not-allowed
                                bg-white text-gray-900 hover:shadow-lg hover:shadow-white/10
                            "
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
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
                    <div className="mt-10 pt-6 w-full flex justify-between items-center text-[11px] border-t border-white/[0.04] text-white/20">
                        <span className="font-medium">Aurem v2.0</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Systems Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes loginStar {
                    0% { transform: rotate(var(--angle, 35deg)) translateX(0); opacity: 0; }
                    3% { opacity: var(--star-opacity, 0.7); }
                    60% { opacity: 0.3; }
                    100% { transform: rotate(var(--angle, 35deg)) translateX(400px); opacity: 0; }
                }
                @keyframes floatSlow {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(15px, -20px); }
                }
            `}</style>
        </div>
    );
};

export default Login;
