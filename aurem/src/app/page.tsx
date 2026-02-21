"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import SplashScreen from "@/components/layout/splash-screen";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Brain, Mic, FileText, Calendar, Zap, Shield } from "lucide-react";
import Link from "next/link";

const features = [
    { icon: Brain, title: "Smart Chat", desc: "RAG-grounded AI tutor", color: "from-blue-500 to-cyan-500" },
    { icon: FileText, title: "Aurem Lens", desc: "Document analysis", color: "from-orange-500 to-amber-500" },
    { icon: Calendar, title: "Smart Timetable", desc: "AI-powered study plans", color: "from-emerald-500 to-green-500" },
    { icon: Mic, title: "Podcasts", desc: "Audio study recaps", color: "from-rose-500 to-pink-500" },
    { icon: Zap, title: "Adaptive Quizzes", desc: "Conceptually gated", color: "from-violet-500 to-purple-500" },
    { icon: Shield, title: "Video Gen", desc: "Animated explainers", color: "from-cyan-500 to-blue-500" },
];

export default function HomePage() {
    const { currentUser, loading } = useAuth();
    const router = useRouter();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        if (!loading && currentUser) {
            router.push("/chat");
        }
    }, [loading, currentUser, router]);

    if (showSplash) {
        return <SplashScreen onComplete={() => setShowSplash(false)} />;
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Floating Orbs */}
            <div className="floating-orb w-[600px] h-[600px] top-[-200px] left-[-200px] bg-aurem-500/10" />
            <div className="floating-orb w-[500px] h-[500px] bottom-[-100px] right-[-100px] bg-violet-500/10" style={{ animationDelay: "3s" }} />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-aurem-500" />
                        <span className="text-sm text-white/60">The Future of Studying</span>
                    </motion.div>

                    <h1 className="text-6xl md:text-8xl font-display font-bold mb-6">
                        <span className="text-white">Study with </span>
                        <span className="text-gradient">AUREM</span>
                    </h1>

                    <p className="text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
                        The ultimate AI study companion for grades 9-12 and competitive exams.
                        Deep understanding, not just quick answers.
                    </p>

                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link href="/login" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
                            Get Started <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link href="/pricing" className="btn-secondary flex items-center gap-2 text-lg px-8 py-4">
                            View Plans
                        </Link>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex items-center justify-center gap-6 mt-10 text-white/20 text-sm">
                        <span>✦ JEE / NEET Ready</span>
                        <span>✦ SAT / ACT Ready</span>
                        <span>✦ IELTS / TOEFL Ready</span>
                    </div>
                </motion.div>

                {/* Feature Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            className="glass-panel-hover p-6 group cursor-pointer"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                <f.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-1">{f.title}</h3>
                            <p className="text-white/40 text-sm">{f.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-center mt-20 text-white/20 text-sm"
                >
                    <p>Hallucination-resistant • RAG-grounded • Conceptually gated</p>
                </motion.div>
            </div>
        </div>
    );
}
