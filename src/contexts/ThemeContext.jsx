import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(undefined);

export const THEMES = {
    OCEAN: 'ocean',
    SUNSET: 'sunset',
    FOREST: 'forest',
    LAVENDER: 'lavender',
    ROSE: 'rose',
    SLATE: 'slate',
    AMBER: 'amber'
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('atlas-theme-v2') || THEMES.OCEAN;
        }
        return THEMES.OCEAN;
    });

    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('atlas-mode');
            if (stored) return stored === 'dark';
            return true; // Default to dark
        }
        return true;
    });

    useEffect(() => {
        const root = document.documentElement;

        // Remove old classes
        root.classList.remove('light', 'dark');
        Object.values(THEMES).forEach(t => root.classList.remove(`theme-${t}`));

        // Add new classes
        root.classList.add(isDark ? 'dark' : 'light');
        root.classList.add(`theme-${theme}`);

        localStorage.setItem('atlas-theme-v2', theme);
        localStorage.setItem('atlas-mode', isDark ? 'dark' : 'light');
    }, [theme, isDark]);

    const setTheme = (newTheme) => {
        if (Object.values(THEMES).includes(newTheme)) {
            setThemeState(newTheme);
        }
    };

    const toggleMode = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleMode, THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
