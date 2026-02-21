"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Sparkles, Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { signup, loginWithGoogle } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) return setError("Please fill in all fields");
        if (password.length < 6) return setError("Password must be at least 6 characters");
        setIsLoading(true);
        setError("");
        try {
            await signup(email, password, name);
            router.push("/chat");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        setError("");
        try {
            await loginWithGoogle();
            router.push("/chat");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Google signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative">
            <div className="floating-orb w-[500px] h-[500px] top-[-150px] left-[-150px] bg-violet-500/10" />
            <div className="floating-orb w-[400px] h-[400px] bottom-[-100px] right-[-100px] bg-aurem-500/8" style={{ animationDelay: "2s" }} />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-aurem-500 items-center justify-center mb-4 shadow-glow">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-white">Create Account</h1>
                    <p className="text-white/40 mt-2">Start your journey with AUREM today</p>
                </div>

                <div className="glass-panel p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="glass-input w-full pl-11" placeholder="Your name" id="signup-name" />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input w-full pl-11" placeholder="your@email.com" id="signup-email" />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="glass-input w-full pl-11 pr-11"
                                    placeholder="Min 6 characters"
                                    id="signup-password"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50" id="signup-submit">
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>

                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-white/20 text-xs uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>

                    <button onClick={handleGoogle} disabled={isLoading} className="btn-secondary w-full flex items-center justify-center gap-3 disabled:opacity-50" id="signup-google">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="text-center text-white/30 text-sm mt-6">
                        Already have an account?{" "}
                        <Link href="/login" className="text-aurem-500 hover:text-aurem-400 transition-colors">Sign in</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
