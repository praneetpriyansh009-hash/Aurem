import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PerformanceContext = createContext();

export const usePerformance = () => useContext(PerformanceContext);

export const PerformanceProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [performanceData, setPerformanceData] = useState([]);

    // Load from localStorage on mount or user change
    useEffect(() => {
        if (!currentUser?.uid) {
            setPerformanceData([]);
            return;
        }

        const stored = localStorage.getItem(`aurem_perf_${currentUser.uid}`);
        if (stored) {
            try {
                setPerformanceData(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse performance data", e);
                setPerformanceData([]);
            }
        } else {
            setPerformanceData([]);
        }
    }, [currentUser]);

    // Save to localStorage whenever it changes
    useEffect(() => {
        if (currentUser?.uid && performanceData.length > 0) {
            localStorage.setItem(`aurem_perf_${currentUser.uid}`, JSON.stringify(performanceData));
        }
    }, [performanceData, currentUser]);

    // Add a new performance record (score out of 100)
    const addRecord = (featureId, score) => {
        const newRecord = {
            id: Date.now().toString(),
            featureId,
            score: Number(score),
            timestamp: new Date().toISOString()
        };

        setPerformanceData(prev => {
            // Keep only the last 50 recs to prevent bloating
            const updated = [newRecord, ...prev];
            return updated.slice(0, 50);
        });
    };

    // Get all records for a specific feature, or all if none specified
    const getRecords = (featureId = null) => {
        if (featureId) {
            return performanceData.filter(r => r.featureId === featureId);
        }
        return performanceData;
    };

    // Determine difficulty level based on recent average or specific score
    // 0-60: easy, 61-80: intermediate, 81-100: hard
    const getDifficultyLevel = (scoreOverride = null) => {
        let scoreToUse = scoreOverride;

        if (scoreToUse === null) {
            if (performanceData.length === 0) return 'intermediate'; // Default

            // Average last 3 scores to determine current level
            const recent = performanceData.slice(0, 3);
            const sum = recent.reduce((acc, curr) => acc + curr.score, 0);
            scoreToUse = sum / recent.length;
        }

        if (scoreToUse <= 60) return 'easy';
        if (scoreToUse <= 80) return 'intermediate';
        return 'hard';
    };

    const value = {
        performanceData,
        addRecord,
        getRecords,
        getDifficultyLevel
    };

    return (
        <PerformanceContext.Provider value={value}>
            {children}
        </PerformanceContext.Provider>
    );
};
