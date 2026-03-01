import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sparkles, Loader2, X } from './Icons';

const Signup = ({ onSignupSuccess, onSwitchToLogin }) => {
    const { isDark } = useTheme();
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        try {
            onSwitchToLogin?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = `w-full rounded-xl px-5 py-3.5 text-sm font-medium outline-none transition-all duration-200 cursor-none
        bg-theme-bg text-theme-text placeholder:text-theme-muted border border-theme-border focus:border-theme-primary focus:shadow-[0_0_0_3px_rgba(var(--theme-primary),0.06)]
    `;

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 cursor-none bg-theme-bg relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full blur-[150px]"
                    style={{ background: 'rgba(var(--theme-primary), 0.07)', animation: 'auth-float 12s ease-in-out infinite' }} />
                <div className="absolute bottom-[15%] right-[15%] w-[350px] h-[350px] rounded-full blur-[130px]"
                    style={{ background: 'rgba(var(--theme-secondary), 0.04)', animation: 'auth-float 15s ease-in-out infinite', animationDelay: '-5s' }} />
            </div>

            <div className="w-full max-w-[440px] p-10 sm:p-12 rounded-[32px] relative overflow-hidden animate-page-enter border shadow-2xl shadow-black/60 bg-theme-surface border-theme-primary/10 z-10"
                style={{ backdropFilter: 'blur(24px)' }}
            >
                {/* Primary accent bar */}
                <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-[32px]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--theme-primary),1), transparent)' }} />

                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="p-4 bg-theme-primary/10 border border-theme-primary/20 rounded-2xl">
                        <Sparkles className="w-8 h-8 text-theme-primary" />
                    </div>
                </div>

                <h2 className="text-3xl font-serif italic mb-2 text-center text-theme-text tracking-wide">
                    Join <span className="text-theme-primary">Aurem</span>
                </h2>
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] mb-10 text-theme-primary" style={{ opacity: 0.5 }}>
                    Create your neural profile
                </p>

                {error && (
                    <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center gap-2 text-red-400 text-xs">
                        <X className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-theme-muted uppercase tracking-widest">Username</label>
                        <input type="text" required className={inputClass} placeholder="Student123"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-theme-muted uppercase tracking-widest">Email</label>
                        <input type="email" required className={inputClass} placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-theme-muted uppercase tracking-widest">Password</label>
                        <input type="password" required className={inputClass} placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5 text-theme-muted uppercase tracking-widest">Confirm Password</label>
                        <input type="password" required className={inputClass} placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-[0.1em] transition-all duration-300 cursor-none
                            border border-theme-primary/30 text-theme-primary bg-theme-primary/10 hover:bg-theme-primary hover:text-theme-bg
                            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-theme-muted">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="text-theme-primary hover:text-theme-secondary font-semibold transition-colors cursor-none">
                        Sign In
                    </button>
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

export default Signup;
