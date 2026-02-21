"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Zap, Crown, ArrowRight, Star } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";

const plans = [
    {
        id: "go" as const,
        name: "Go",
        price: 400,
        icon: Zap,
        color: "from-emerald-500 to-green-500",
        highlight: "100 messages/day • 10 uploads • Video gen",
    },
    {
        id: "pro" as const,
        name: "Pro",
        price: 600,
        icon: Crown,
        color: "from-aurem-500 to-pink-500",
        highlight: "Unlimited everything • Fastest AI • Priority support",
        popular: true,
    },
];

export function UpgradeModal() {
    const { showUpgradeModal, setShowUpgradeModal, upgradeFeature, upgradeTo } = useSubscription();

    return (
        <AnimatePresence>
            {showUpgradeModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowUpgradeModal(false)}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative z-10 w-full max-w-md"
                    >
                        <div className="glass-panel p-8 relative overflow-hidden">
                            {/* Decorative */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-aurem-500/10 to-transparent rounded-bl-full" />

                            {/* Close */}
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-aurem-500 to-pink-500 flex items-center justify-center mb-4 shadow-glow">
                                    <Star className="w-7 h-7 text-white" />
                                </div>

                                <h2 className="text-2xl font-display font-bold text-white mb-1">Upgrade AUREM</h2>
                                {upgradeFeature && (
                                    <p className="text-white/40 text-sm mb-6">
                                        You&apos;ve reached the daily limit for <span className="text-aurem-400">{upgradeFeature}</span>. Upgrade for more.
                                    </p>
                                )}

                                <div className="space-y-3">
                                    {plans.map((plan) => (
                                        <button
                                            key={plan.id}
                                            onClick={() => upgradeTo(plan.id)}
                                            className={`w-full p-4 rounded-xl border text-left transition-all group ${plan.popular
                                                    ? "border-aurem-500/30 bg-aurem-500/5 hover:bg-aurem-500/10"
                                                    : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                                                    <plan.icon className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-semibold">{plan.name}</span>
                                                        <span className="text-white font-bold">₹{plan.price}/mo</span>
                                                        {plan.popular && <span className="pro-badge text-[8px]">Popular</span>}
                                                    </div>
                                                    <p className="text-white/40 text-xs mt-0.5">{plan.highlight}</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <p className="text-center text-white/20 text-xs mt-4">Cancel anytime • Secure payment</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
