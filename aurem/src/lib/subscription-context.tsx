"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { SubscriptionTier, FeatureLimits } from "@/types";

const TIER_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
    free: {
        chatMessages: 20,
        documentUploads: 2,
        quizzes: 3,
        podcasts: 1,
        videoGenerations: 0,
        timetableGenerations: 1,
    },
    go: {
        chatMessages: 100,
        documentUploads: 10,
        quizzes: 15,
        podcasts: 5,
        videoGenerations: 2,
        timetableGenerations: 5,
    },
    pro: {
        chatMessages: -1,
        documentUploads: -1,
        quizzes: -1,
        podcasts: -1,
        videoGenerations: 10,
        timetableGenerations: -1,
    },
};

const TIER_INFO = {
    free: { name: "Free", price: 0, currency: "₹" },
    go: { name: "Go", price: 400, currency: "₹" },
    pro: { name: "Pro", price: 600, currency: "₹" },
};

interface DailyUsage {
    [feature: string]: number;
}

interface SubscriptionContextType {
    tier: SubscriptionTier;
    tierName: string;
    isPro: boolean;
    isGo: boolean;
    limits: FeatureLimits;
    dailyUsage: DailyUsage;
    canUseFeature: (feature: keyof FeatureLimits) => boolean;
    incrementUsage: (feature: keyof FeatureLimits) => void;
    getRemainingUses: (feature: keyof FeatureLimits) => number;
    showUpgradeModal: boolean;
    setShowUpgradeModal: (show: boolean) => void;
    upgradeFeature: string;
    triggerUpgrade: (feature: string) => void;
    upgradeTo: (tier: SubscriptionTier) => Promise<void>;
    isLoadingSubscription: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const SSR_SUBSCRIPTION: SubscriptionContextType = {
    tier: "free",
    tierName: "Free",
    isPro: false,
    isGo: false,
    limits: TIER_LIMITS.free,
    dailyUsage: {},
    canUseFeature: () => false,
    incrementUsage: () => { },
    getRemainingUses: () => 0,
    showUpgradeModal: false,
    setShowUpgradeModal: () => { },
    upgradeFeature: "",
    triggerUpgrade: () => { },
    upgradeTo: async () => { },
    isLoadingSubscription: true,
};

export const useSubscription = () => {
    const ctx = useContext(SubscriptionContext);
    // Return safe defaults during SSR/build when provider isn't mounted
    if (!ctx) return SSR_SUBSCRIPTION;
    return ctx;
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const [tier, setTier] = useState<SubscriptionTier>("free");
    const [dailyUsage, setDailyUsage] = useState<DailyUsage>({});
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState("");
    const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

    // Load subscription tier from Firestore
    useEffect(() => {
        const loadSubscription = async () => {
            if (!currentUser?.uid) {
                setTier("free");
                setIsLoadingSubscription(false);
                return;
            }
            setIsLoadingSubscription(true);
            try {
                const userDocRef = doc(getFirebaseDb(), "users", currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().subscriptionTier) {
                    setTier(userDoc.data().subscriptionTier as SubscriptionTier);
                } else {
                    setTier("free");
                }
            } catch {
                setTier("free");
            } finally {
                setIsLoadingSubscription(false);
            }
        };
        loadSubscription();
    }, [currentUser]);

    // Load / reset daily usage
    useEffect(() => {
        const stored = localStorage.getItem("aurem_usage");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const today = new Date().toDateString();
                if (parsed.date !== today) {
                    setDailyUsage({});
                    localStorage.setItem("aurem_usage", JSON.stringify({ date: today, usage: {} }));
                } else {
                    setDailyUsage(parsed.usage || {});
                }
            } catch {
                setDailyUsage({});
            }
        }
    }, []);

    // Persist daily usage
    useEffect(() => {
        const today = new Date().toDateString();
        localStorage.setItem("aurem_usage", JSON.stringify({ date: today, usage: dailyUsage }));
    }, [dailyUsage]);

    const limits = TIER_LIMITS[tier];

    const canUseFeature = useCallback(
        (feature: keyof FeatureLimits) => {
            const limit = limits[feature];
            if (limit === -1) return true; // unlimited
            const used = dailyUsage[feature] || 0;
            return used < limit;
        },
        [limits, dailyUsage]
    );

    const incrementUsage = useCallback((feature: keyof FeatureLimits) => {
        setDailyUsage((prev) => ({
            ...prev,
            [feature]: (prev[feature] || 0) + 1,
        }));
    }, []);

    const getRemainingUses = useCallback(
        (feature: keyof FeatureLimits) => {
            const limit = limits[feature];
            if (limit === -1) return Infinity;
            const used = dailyUsage[feature] || 0;
            return Math.max(0, limit - used);
        },
        [limits, dailyUsage]
    );

    const triggerUpgrade = useCallback((feature: string) => {
        setUpgradeFeature(feature);
        setShowUpgradeModal(true);
    }, []);

    const upgradeTo = useCallback(
        async (newTier: SubscriptionTier) => {
            setTier(newTier);
            if (currentUser?.uid) {
                try {
                    const userDocRef = doc(getFirebaseDb(), "users", currentUser.uid);
                    await setDoc(userDocRef, { subscriptionTier: newTier }, { merge: true });
                } catch (err) {
                    console.error("[Subscription] Firestore save error:", err);
                }
            }
            setShowUpgradeModal(false);
        },
        [currentUser]
    );

    const value: SubscriptionContextType = {
        tier,
        tierName: TIER_INFO[tier].name,
        isPro: tier === "pro",
        isGo: tier === "go",
        limits,
        dailyUsage,
        canUseFeature,
        incrementUsage,
        getRemainingUses,
        showUpgradeModal,
        setShowUpgradeModal,
        upgradeFeature,
        triggerUpgrade,
        upgradeTo,
        isLoadingSubscription,
    };

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
