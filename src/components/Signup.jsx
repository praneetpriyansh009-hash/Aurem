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
            // For now, just switch to login since we use Google auth primarily
            onSwitchToLogin?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = `w-full rounded-2xl px-5 py-3.5 text-sm font-medium outline-none transition-all duration-200
        ${isDark
            ? 'bg-midnight-700/50 text-white placeholder:text-white/25 border border-white/[0.06] focus:border-violet-500/40 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]'
            : 'bg-white/70 text-warm-800 placeholder:text-warm-400 border border-warm-300/25 focus:border-violet-400/40 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.06)]'
        }
    `;

    return (
        <div className="flex flex-col items-center justify-center h-full p-6"
            style={{
                background: isDark
                    ? 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 40%, #12121F 100%)'
                    : 'linear-gradient(135deg, #FAF9F6 0%, #F5F0EB 40%, #EDE5DC 100%)'
            }}
        >
            <div className={`w-full max-w-[420px] p-8 sm:p-10 rounded-3xl border backdrop-blur-xl animate-scale-in relative overflow-hidden
                ${isDark
                    ? 'bg-midnight-800/80 border-white/[0.06] shadow-glass-dark'
                    : 'bg-white/70 border-warm-300/30 shadow-depth-lg'
                }
            `}>
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />

                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl shadow-lg shadow-violet-500/20">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                </div>

                <h2 className={`text-2xl font-display font-extrabold mb-1 text-center ${isDark ? 'text-white' : 'text-warm-800'}`}>
                    Join <span className="gradient-text">Aurem</span>
                </h2>
                <p className={`text-center text-sm mb-8 ${isDark ? 'text-white/40' : 'text-warm-500'}`}>
                    Create your account
                </p>

                {error && (
                    <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center gap-2 text-red-400 text-xs animate-scale-in">
                        <X className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-white/50' : 'text-warm-500'}`}>Username</label>
                        <input type="text" required className={inputClass} placeholder="Student123"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-white/50' : 'text-warm-500'}`}>Email</label>
                        <input type="email" required className={inputClass} placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-white/50' : 'text-warm-500'}`}>Password</label>
                        <input type="password" required className={inputClass} placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-white/50' : 'text-warm-500'}`}>Confirm Password</label>
                        <input type="password" required className={inputClass} placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all duration-300
                            bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/25
                            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                    </button>
                </form>

                <div className={`mt-6 text-center text-sm ${isDark ? 'text-white/40' : 'text-warm-500'}`}>
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="text-violet-500 hover:text-violet-400 font-semibold transition-colors">
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Signup;
