import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(undefined);

export const THEMES = {
    PREMIUM: 'premium',
    VIBRANT: 'vibrant',
    SIMPLE: 'simple'
};

// Theme variable maps - applied as inline CSS variables on <html>
// This guarantees they can't be overridden by any stylesheet
const THEME_VARS = {
    [THEMES.PREMIUM]: {
        '--theme-bg': '14, 11, 7',
        '--theme-surface': '20, 16, 9',
        '--theme-text': '240, 232, 216',
        '--theme-muted': '168, 152, 128',
        '--theme-primary': '201, 165, 90',
        '--theme-secondary': '224, 192, 122',
        '--theme-border': '201, 165, 90',
        '--aurora-1': '35, 100%, 50%',
        '--aurora-2': '45, 100%, 50%',
        '--aurora-3': '15, 100%, 50%',
    },
    [THEMES.VIBRANT]: {
        '--theme-bg': '15, 23, 42',
        '--theme-surface': '30, 41, 59',
        '--theme-text': '248, 250, 252',
        '--theme-muted': '148, 163, 184',
        '--theme-primary': '139, 92, 246',
        '--theme-secondary': '236, 72, 153',
        '--theme-border': '139, 92, 246',
        '--aurora-1': '260, 80%, 60%',
        '--aurora-2': '320, 80%, 60%',
        '--aurora-3': '200, 80%, 60%',
    },
    [THEMES.SIMPLE]: {
        '--theme-bg': '30, 30, 30',
        '--theme-surface': '44, 44, 44',
        '--theme-text': '225, 225, 225',
        '--theme-muted': '156, 153, 147',
        '--theme-primary': '217, 119, 87',
        '--theme-secondary': '230, 144, 116',
        '--theme-border': '225, 225, 225',
        '--aurora-1': '20, 10%, 40%',
        '--aurora-2': '30, 10%, 30%',
        '--aurora-3': '0, 0%, 20%',
    },
};

// Apply theme by injecting CSS vars directly as inline styles (highest specificity, no CSS fights)
const applyTheme = (theme) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const vars = THEME_VARS[theme] || THEME_VARS[THEMES.PREMIUM];

    // Apply CSS variables as inline styles on <html>
    Object.entries(vars).forEach(([prop, value]) => {
        root.style.setProperty(prop, value);
    });

    // Update theme classes for any CSS selectors that still use them
    Object.values(THEMES).forEach(t => {
        root.classList.remove(`theme-${t}`);
        document.body.classList.remove(`theme-${t}`);
    });
    root.classList.add('dark', `theme-${theme}`);
    document.body.classList.add('dark', `theme-${theme}`);
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        const saved = typeof window !== 'undefined'
            ? localStorage.getItem('atlas-theme-v2') || THEMES.PREMIUM
            : THEMES.PREMIUM;
        // Apply synchronously before first render
        applyTheme(saved);
        return saved;
    });

    const [isDark] = useState(true);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem('atlas-theme-v2', theme);
    }, [theme]);

    const setTheme = (newTheme) => {
        if (Object.values(THEMES).includes(newTheme)) {
            setThemeState(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isDark, THEMES }}>
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
