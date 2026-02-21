"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function SplashScreen({ onComplete }: { onComplete?: () => void }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onComplete?.(), 500);
        }, 2500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-midnight-950"
                >
                    {/* Background Orbs */}
                    <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-aurem-500/20 blur-[100px]"
                        />
                        <motion.div
                            animate={{
                                scale: [1.2, 1, 1.2],
                                opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-violet-500/15 blur-[100px]"
                        />
                    </div>

                    {/* Logo */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-8 rounded-full border border-aurem-500/20"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-16 rounded-full border border-violet-500/10"
                        />

                        <div className="relative">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-aurem-500 via-pink-500 to-violet-500 flex items-center justify-center shadow-glow-lg"
                            >
                                <Sparkles className="w-10 h-10 text-white" />
                            </motion.div>
                        </div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="mt-8 text-5xl font-display font-bold text-gradient"
                        >
                            AUREM
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="mt-3 text-white/40 text-sm tracking-widest uppercase"
                        >
                            AI Study Companion
                        </motion.p>

                        {/* Loading dots */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="mt-8 flex gap-1.5"
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                                    className="w-1.5 h-1.5 rounded-full bg-aurem-500"
                                />
                            ))}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
