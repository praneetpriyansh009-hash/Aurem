"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { WeakPoint } from "@/types";

interface WeaknessContextType {
    weakPoints: WeakPoint[];
    isLoading: boolean;
    addQuizResults: (results: Array<{ topic: string; subject: string; chapter?: string; isCorrect: boolean }>) => void;
    getWeakTopics: (subject?: string) => WeakPoint[];
    getTopicMastery: (topic: string) => number;
    getWeakTopicNames: () => string[];
    clearWeakPoints: () => void;
}

const SSR_WEAKNESS: WeaknessContextType = {
    weakPoints: [],
    isLoading: true,
    addQuizResults: () => { },
    getWeakTopics: () => [],
    getTopicMastery: () => 0,
    getWeakTopicNames: () => [],
    clearWeakPoints: () => { },
};

const WeaknessContext = createContext<WeaknessContextType | null>(null);

export const useWeakness = () => {
    const ctx = useContext(WeaknessContext);
    if (!ctx) return SSR_WEAKNESS;
    return ctx;
};

function calculateTrend(history: Array<{ date: string; score: number }>): "improving" | "declining" | "stable" {
    if (history.length < 3) return "stable";
    const recent = history.slice(-3);
    const avgRecent = recent.reduce((a, b) => a + b.score, 0) / recent.length;
    const older = history.slice(-6, -3);
    if (older.length === 0) return "stable";
    const avgOlder = older.reduce((a, b) => a + b.score, 0) / older.length;
    if (avgRecent > avgOlder + 10) return "improving";
    if (avgRecent < avgOlder - 10) return "declining";
    return "stable";
}

export function WeaknessProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load from Firestore + localStorage
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            // Try localStorage first (fast)
            try {
                const cached = localStorage.getItem("aurem_weakpoints");
                if (cached) setWeakPoints(JSON.parse(cached));
            } catch { /* ignore */ }

            // Then sync from Firestore if logged in
            if (currentUser?.uid) {
                try {
                    const docRef = doc(getFirebaseDb(), "users", currentUser.uid, "progress", "weakpoints");
                    const snapshot = await getDoc(docRef);
                    if (snapshot.exists()) {
                        const data = snapshot.data().weakPoints as WeakPoint[];
                        setWeakPoints(data);
                        localStorage.setItem("aurem_weakpoints", JSON.stringify(data));
                    }
                } catch (err) {
                    console.error("[Weakness] Firestore load error:", err);
                }
            }
            setIsLoading(false);
        };
        load();
    }, [currentUser]);

    // Persist changes
    const persist = useCallback(async (points: WeakPoint[]) => {
        localStorage.setItem("aurem_weakpoints", JSON.stringify(points));
        if (currentUser?.uid) {
            try {
                const docRef = doc(getFirebaseDb(), "users", currentUser.uid, "progress", "weakpoints");
                await setDoc(docRef, { weakPoints: points, updatedAt: new Date().toISOString() }, { merge: true });
            } catch (err) {
                console.error("[Weakness] Firestore save error:", err);
            }
        }
    }, [currentUser]);

    const addQuizResults = useCallback((results: Array<{ topic: string; subject: string; chapter?: string; isCorrect: boolean }>) => {
        setWeakPoints(prev => {
            const updated = [...prev];
            const today = new Date().toISOString().split("T")[0];

            for (const result of results) {
                const idx = updated.findIndex(w => w.topic.toLowerCase() === result.topic.toLowerCase() && w.subject.toLowerCase() === result.subject.toLowerCase());

                if (idx >= 0) {
                    // Update existing
                    const wp = { ...updated[idx] };
                    wp.totalAttempts += 1;
                    if (result.isCorrect) wp.correctAttempts += 1;
                    wp.score = Math.round((wp.correctAttempts / wp.totalAttempts) * 100);
                    wp.lastAttempted = new Date();
                    wp.history = [...(wp.history || []), { date: today, score: wp.score }].slice(-20);
                    wp.recentTrend = calculateTrend(wp.history);
                    updated[idx] = wp;
                } else {
                    // New weak point
                    updated.push({
                        topic: result.topic,
                        subject: result.subject,
                        chapter: result.chapter,
                        score: result.isCorrect ? 100 : 0,
                        totalAttempts: 1,
                        correctAttempts: result.isCorrect ? 1 : 0,
                        lastAttempted: new Date(),
                        recentTrend: "stable",
                        history: [{ date: today, score: result.isCorrect ? 100 : 0 }],
                    });
                }
            }

            persist(updated);
            return updated;
        });
    }, [persist]);

    const getWeakTopics = useCallback((subject?: string) => {
        let filtered = weakPoints.filter(w => w.score < 70);
        if (subject) filtered = filtered.filter(w => w.subject.toLowerCase() === subject.toLowerCase());
        return filtered.sort((a, b) => a.score - b.score);
    }, [weakPoints]);

    const getTopicMastery = useCallback((topic: string) => {
        const wp = weakPoints.find(w => w.topic.toLowerCase() === topic.toLowerCase());
        return wp ? wp.score : -1; // -1 = not attempted
    }, [weakPoints]);

    const getWeakTopicNames = useCallback(() => {
        return weakPoints.filter(w => w.score < 60).map(w => w.topic);
    }, [weakPoints]);

    const clearWeakPoints = useCallback(() => {
        setWeakPoints([]);
        localStorage.removeItem("aurem_weakpoints");
    }, []);

    return (
        <WeaknessContext.Provider value={{ weakPoints, isLoading, addQuizResults, getWeakTopics, getTopicMastery, getWeakTopicNames, clearWeakPoints }}>
            {children}
        </WeaknessContext.Provider>
    );
}
