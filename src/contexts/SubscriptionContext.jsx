import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

// Daily limits for Basic tier
const BASIC_LIMITS = {
    'college-compass': 1,
    'podcast': 1,
    'quiz': 2,
    'mindmap': 2,
    'flashcards': 3,  // Aurem Lens flashcards - 3 uses per day
    'youtube': 0,     // YouTube video loading - Premium only
    // Doubt Solver and Document Study core are UNLIMITED
};

// Daily limits for Go tier
const GO_LIMITS = {
    'college-compass': 5,
    'podcast': 5,
    'quiz': 10,
    'mindmap': 10,
    'flashcards': 15,
    'youtube': 2,
};

// Check if we're in dev/testing mode
const isDevMode = () => {
    try {
        return import.meta.env.VITE_DEV_MODE === 'true';
    } catch {
        return false;
    }
};

const getDefaultTier = () => {
    try {
        const tier = import.meta.env.VITE_DEFAULT_TIER;
        if (tier === 'pro' || tier === 'go' || tier === 'dev') return tier;
        return 'basic';
    } catch {
        return 'basic';
    }
};

export const SubscriptionProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [tier, setTier] = useState(getDefaultTier());
    const [dailyUsage, setDailyUsage] = useState({});
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState('');
    const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

    // Load subscription tier from Firestore (primary) with localStorage fallback
    useEffect(() => {
        const loadSubscription = async () => {
            if (!currentUser?.uid) {
                setTier(getDefaultTier());
                setIsLoadingSubscription(false);
                return;
            }

            setIsLoadingSubscription(true);

            try {
                // Try Firestore first (source of truth)
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists() && userDoc.data().subscriptionTier) {
                    const firestoreTier = userDoc.data().subscriptionTier;
                    console.log('[Subscription] Loaded from Firestore:', firestoreTier);
                    setTier(firestoreTier);
                    localStorage.setItem(`aurem_tier_${currentUser.uid}`, firestoreTier);
                } else {
                    // Check localStorage as fallback (and migrate to Firestore)
                    const storedTier = localStorage.getItem(`aurem_tier_${currentUser.uid}`);
                    if (storedTier === 'pro' || storedTier === 'dev') {
                        console.log('[Subscription] Migrating from localStorage to Firestore:', storedTier);
                        // Migrate to Firestore, treating 'dev' as 'pro' for persistence
                        await setDoc(userDocRef, {
                            subscriptionTier: 'pro',
                            upgradedAt: new Date().toISOString()
                        }, { merge: true });

                        // Persist locally to survive reload and update state
                        if (currentUser?.uid) {
                            localStorage.setItem(`aurem_tier_${currentUser.uid}`, 'pro');
                        }
                        setTier('pro');
                    } else {
                        setTier(getDefaultTier());
                    }
                }
            } catch (error) {
                console.error('[Subscription] Firestore load error:', error);
                const storedTier = localStorage.getItem(`aurem_tier_${currentUser.uid}`);
                if (storedTier === 'pro' || storedTier === 'dev') {
                    setTier(storedTier);
                } else {
                    setTier(getDefaultTier());
                }
            } finally {
                setIsLoadingSubscription(false);
            }
        };

        loadSubscription();
    }, [currentUser]);

    // Load usage from localStorage on mount
    useEffect(() => {
        const storedData = localStorage.getItem('aurem_usage');
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                const today = new Date().toDateString();

                // Reset if it's a new day
                if (parsed.date !== today) {
                    setDailyUsage({});
                    localStorage.setItem('aurem_usage', JSON.stringify({ date: today, usage: {} }));
                } else {
                    setDailyUsage(parsed.usage || {});
                }
            } catch {
                setDailyUsage({});
            }
        }
    }, []);

    // Save usage to localStorage when it changes
    useEffect(() => {
        const today = new Date().toDateString();
        localStorage.setItem('aurem_usage', JSON.stringify({ date: today, usage: dailyUsage }));
    }, [dailyUsage]);

    // Check if user can use a feature
    const canUseFeature = (feature) => {
        // Dev mode or Pro tier = unlimited
        if (isDevMode() || tier === 'dev' || tier === 'pro') {
            return true;
        }

        const limits = tier === 'go' ? GO_LIMITS : BASIC_LIMITS;

        // Features without limits (Doubt Solver, Document Study core)
        if (limits[feature] === undefined) {
            return true;
        }

        // Check daily limit
        const currentUsage = dailyUsage[feature] || 0;
        return currentUsage < limits[feature];
    };

    // Increment usage for a feature
    const incrementUsage = (feature) => {
        const limits = tier === 'go' ? GO_LIMITS : BASIC_LIMITS;

        if (limits[feature] === undefined) return; // No tracking for unlimited features

        setDailyUsage(prev => ({
            ...prev,
            [feature]: (prev[feature] || 0) + 1
        }));
    };

    // Get remaining uses for a feature
    const getRemainingUses = (feature) => {
        if (isDevMode() || tier === 'dev' || tier === 'pro') {
            return Infinity;
        }

        const limits = tier === 'go' ? GO_LIMITS : BASIC_LIMITS;

        if (limits[feature] === undefined) {
            return Infinity;
        }

        const currentUsage = dailyUsage[feature] || 0;
        return Math.max(0, limits[feature] - currentUsage);
    };

    // Trigger upgrade modal
    const triggerUpgradeModal = (feature) => {
        setUpgradeFeature(feature);
        setShowUpgradeModal(true);
    };

    // Upgrade to Go - persists to Firestore AND localStorage
    const upgradeToGo = async () => {
        setTier('go');
        if (currentUser?.uid) {
            localStorage.setItem(`aurem_tier_${currentUser.uid}`, 'go');
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                await setDoc(userDocRef, { subscriptionTier: 'go' }, { merge: true });
            } catch (err) {
                console.error('[Subscription] Firestore save error:', err);
            }
        }
    };

    // Upgrade to pro - persists to Firestore AND localStorage
    const upgradeToPro = async () => {
        setTier('pro');
        if (currentUser?.uid) {
            localStorage.setItem(`aurem_tier_${currentUser.uid}`, 'pro');
            // Persist to Firestore (survives cache clears)
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                await setDoc(userDocRef, { subscriptionTier: 'pro' }, { merge: true });
                console.log('[Subscription] Upgraded to Pro - saved to Firestore');
            } catch (err) {
                console.error('[Subscription] Firestore save error:', err);
            }
        }
    };

    // Downgrade to basic - persists to Firestore AND localStorage
    const downgradeToBasic = async () => {
        setTier('basic');
        if (currentUser?.uid) {
            localStorage.removeItem(`aurem_tier_${currentUser.uid}`);
            // Update Firestore
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                await setDoc(userDocRef, { subscriptionTier: 'basic' }, { merge: true });
                console.log('[Subscription] Downgraded to Basic - saved to Firestore');
            } catch (err) {
                console.error('[Subscription] Firestore save error:', err);
            }
        }
    };

    const value = {
        tier,
        setTier,
        canUseFeature,
        incrementUsage,
        getRemainingUses,
        showUpgradeModal,
        setShowUpgradeModal,
        upgradeFeature,
        triggerUpgradeModal,
        upgradeToGo,
        upgradeToPro,
        downgradeToBasic,
        isDevMode: isDevMode(),
        isGo: tier === 'go',
        isPro: tier === 'pro' || tier === 'dev' || isDevMode(),
        isLoadingSubscription, // New: for loading states in UI
        BASIC_LIMITS,
        GO_LIMITS
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};
