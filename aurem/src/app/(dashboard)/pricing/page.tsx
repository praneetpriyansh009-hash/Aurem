"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, ArrowRight, Star } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";

const plans = [
    {
        id: "free" as const,
        name: "Free",
        price: 0,
        currency: "₹",
        period: "/mo",
        icon: Sparkles,
        color: "from-slate-500 to-zinc-500",
        description: "Get started with basics",
        features: [
            "20 AI chat messages/day",
            "2 document uploads/day",
            "3 quizzes/day",
            "1 podcast/day",
            "1 timetable plan/day",
            "Community support",
        ],
        excluded: ["Video generation", "Unlimited access", "Priority AI models"],
    },
    {
        id: "go" as const,
        name: "Go",
        price: 400,
        currency: "₹",
        period: "/mo",
        icon: Zap,
        color: "from-emerald-500 to-green-500",
        description: "For serious students",
        popular: false,
        features: [
            "100 AI chat messages/day",
            "10 document uploads/day",
            "15 quizzes/day",
            "5 podcasts/day",
            "5 timetable plans/day",
            "2 video generations/day",
            "Priority support",
        ],
        excluded: ["Unlimited access"],
    },
    {
        id: "pro" as const,
        name: "Pro",
        price: 600,
        currency: "₹",
        period: "/mo",
        icon: Crown,
        color: "from-aurem-500 to-pink-500",
        description: "Ultimate study power",
        popular: true,
        features: [
            "Unlimited AI chat",
            "Unlimited documents",
            "Unlimited quizzes",
            "Unlimited podcasts",
            "Unlimited timetables",
            "10 video generations/day",
            "Priority AI + fastest models",
            "Advanced analytics",
            "Early access to features",
        ],
        excluded: [],
    },
];

export default function PricingPage() {
    const { tier, upgradeTo } = useSubscription();

    return (
        <div className="h-full overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-6 no-scrollbar">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                        Choose Your <span className="text-gradient">Plan</span>
                    </h1>
                    <p className="text-white/40 max-w-md mx-auto">
                        Unlock your full academic potential with AUREM&apos;s premium features.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {plans.map((plan, i) => {
                        const isCurrent = tier === plan.id;
                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.1 }}
                                className={`glass-panel p-6 relative ${plan.popular ? "border-aurem-500/30 ring-1 ring-aurem-500/10" : ""}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="pro-badge px-3 py-1 flex items-center gap-1">
                                            <Star className="w-3 h-3" /> Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}>
                                    <plan.icon className="w-6 h-6 text-white" />
                                </div>

                                <h3 className="text-xl font-display font-bold text-white">{plan.name}</h3>
                                <p className="text-white/40 text-sm mb-4">{plan.description}</p>

                                <div className="mb-6">
                                    <span className="text-3xl font-bold text-white">{plan.currency}{plan.price}</span>
                                    <span className="text-white/30 text-sm">{plan.period}</span>
                                </div>

                                <button
                                    onClick={() => !isCurrent && upgradeTo(plan.id)}
                                    disabled={isCurrent}
                                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mb-6 ${isCurrent
                                            ? "bg-white/[0.06] text-white/40 cursor-not-allowed"
                                            : plan.popular
                                                ? "btn-primary"
                                                : "btn-secondary"
                                        }`}
                                >
                                    {isCurrent ? (
                                        "Current Plan"
                                    ) : (
                                        <>{plan.price === 0 ? "Get Started" : "Upgrade"} <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>

                                <ul className="space-y-3">
                                    {plan.features.map((feat) => (
                                        <li key={feat} className="flex items-start gap-2.5 text-sm text-white/60">
                                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            {feat}
                                        </li>
                                    ))}
                                    {plan.excluded.map((feat) => (
                                        <li key={feat} className="flex items-start gap-2.5 text-sm text-white/20 line-through">
                                            <Check className="w-4 h-4 text-white/10 flex-shrink-0 mt-0.5" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
