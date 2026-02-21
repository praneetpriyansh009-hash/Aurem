import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const LearnLoopContext = createContext(undefined);

export const PHASES = {
    IDLE: 'idle',
    ASSESSMENT_INITIAL: 'assessment_initial',
    ANALYSIS: 'analysis',
    CONTENT_VIDEO: 'content_video',
    CONTENT_NOTES: 'content_notes',
    ASSESSMENT_FINAL: 'assessment_final',
    MASTERY: 'mastery'
};

export const LearnLoopProvider = ({ children }) => {
    const { currentUser } = useAuth();

    // State for the active learning session
    const [activeLoop, setActiveLoop] = useState({
        isActive: false,
        topic: null,           // The doubt/topic being eradicated
        phase: PHASES.IDLE,
        attempt: 0,
        initialScore: 0,
        currentScore: 0,
        weakPoints: [],        // Specific sub-topics failed
        contentGenerated: false
    });

    // History of eradicated doubts (persisted eventually)
    const [masteryHistory, setMasteryHistory] = useState([]);

    const startLoop = (topic) => {
        console.log(`[LearnLoop] Starting loop for topic: ${topic}`);
        setActiveLoop({
            isActive: true,
            topic,
            phase: PHASES.ASSESSMENT_INITIAL,
            attempt: 1,
            initialScore: 0,
            currentScore: 0,
            weakPoints: [],
            contentGenerated: false
        });
    };

    const advancePhase = (currentPhase, data = {}) => {
        setActiveLoop(prev => {
            let nextPhase = prev.phase;
            const updates = { ...data };

            switch (currentPhase) {
                case PHASES.ASSESSMENT_INITIAL:
                    updates.initialScore = data.score;
                    updates.weakPoints = data.weakPoints || [];
                    // If score is high enough (e.g. > 80%), skip directly to mastery?
                    // For now, always go to content to reinforce
                    nextPhase = PHASES.CONTENT_VIDEO;
                    break;

                case PHASES.CONTENT_VIDEO:
                    nextPhase = PHASES.CONTENT_NOTES;
                    break;

                case PHASES.CONTENT_NOTES:
                    nextPhase = PHASES.ASSESSMENT_FINAL; // Re-test
                    break;

                case PHASES.ASSESSMENT_FINAL:
                    updates.currentScore = data.score;
                    if (data.score >= 80) { // Mastery threshold
                        nextPhase = PHASES.MASTERY;
                    } else {
                        // Loop back!
                        updates.attempt = prev.attempt + 1;
                        nextPhase = PHASES.CONTENT_VIDEO; // Watch again / different angle?
                    }
                    break;

                case PHASES.MASTERY:
                    nextPhase = PHASES.IDLE;
                    saveMastery(prev.topic, prev.attempt);
                    break;

                default:
                    nextPhase = PHASES.IDLE;
            }

            return { ...prev, phase: nextPhase, ...updates };
        });
    };

    const saveMastery = (topic, attempts) => {
        setMasteryHistory(prev => [
            ...prev,
            { topic, attempts, date: new Date().toISOString() }
        ]);
    };

    const exitLoop = () => {
        setActiveLoop({
            isActive: false,
            topic: null,
            phase: PHASES.IDLE,
            attempt: 0,
            initialScore: 0,
            currentScore: 0,
            weakPoints: [],
            contentGenerated: false
        });
    };

    return (
        <LearnLoopContext.Provider value={{ activeLoop, startLoop, advancePhase, exitLoop, PHASES, masteryHistory }}>
            {children}
        </LearnLoopContext.Provider>
    );
};

export const useLearnLoop = () => {
    const context = useContext(LearnLoopContext);
    if (context === undefined) {
        throw new Error('useLearnLoop must be used within a LearnLoopProvider');
    }
    return context;
};

export default LearnLoopContext;
