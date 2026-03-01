import React from 'react';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { Moon, Sun, Crown, Settings as SettingsIcon, Eye, ChevronRight } from './Icons';
import { useAuth } from '../contexts/AuthContext';

const ThemeOption = ({ themeKey, colorClass, label, isDark }) => {
    const { theme, setTheme } = useTheme();
    const isActive = theme === themeKey;

    return (
        <button
            onClick={() => setTheme(themeKey)}
            className={`
                group relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300
                ${isActive
                    ? isDark
                        ? 'ring-2 ring-theme-primary bg-white/[0.06]'
                        : 'ring-2 ring-theme-primary bg-theme-primary/10'
                    : isDark
                        ? 'hover:bg-white/[0.04] border border-white/[0.04]'
                        : 'hover:bg-theme-primary/5 border border-theme-primary/10'
                }
            `}
        >
            <div className={`w-10 h-10 rounded-full mb-2.5 bg-gradient-to-br ${colorClass} shadow-lg group-hover:scale-110 transition-transform duration-300 relative`}>
                {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                )}
            </div>
            <span className={`text-[11px] font-semibold ${isActive ? 'text-theme-primary' : isDark ? 'text-theme-muted' : 'text-theme-muted'}`}>
                {label}
            </span>
        </button>
    );
};

const SettingsSection = ({ title, icon: Icon, children, isDark }) => (
    <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center mb-4 px-1">
            <div className={`p-2 rounded-xl mr-3 ${isDark ? 'bg-theme-primary/15' : 'bg-theme-primary/10'}`}>
                <Icon className="w-4 h-4 text-theme-primary" />
            </div>
            <h3 className={`text-base font-serif font-bold ${isDark ? 'text-theme-text' : 'text-theme-text'}`}>{title}</h3>
        </div>
        <div className={`p-6 rounded-3xl border backdrop-blur-sm bg-theme-surface border-theme-border shadow-depth`}>
            {children}
        </div>
    </div>
);

const Settings = () => {
    const { isDark } = useTheme();
    const { currentUser, logout } = useAuth();

    return (
        <div className={`h-full overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32 bg-theme-bg`}>
            <div className="max-w-3xl mx-auto">
                <header className="mb-10">
                    <h1 className={`text-3xl font-serif italic tracking-wide mb-1.5 text-theme-text`}>
                        Settings
                    </h1>
                    <p className="text-theme-muted text-sm uppercase tracking-widest font-bold">Customize your Aurem experience</p>
                </header>

                {/* Appearance */}
                <SettingsSection title="Appearance" icon={Eye} isDark={isDark}>
                    <div>
                        <h4 className={`font-semibold text-sm mb-4 text-theme-text`}>Aesthetic Identity</h4>
                        <div className="grid grid-cols-3 gap-4 border border-theme-border/50 p-2 rounded-3xl bg-theme-bg">
                            <ThemeOption themeKey={THEMES.PREMIUM} label="Premium (Gold)" colorClass="from-[#c9a55a] to-[#e0c07a]" isDark={isDark} />
                            <ThemeOption themeKey={THEMES.VIBRANT} label="Vibrant (Indigo)" colorClass="from-indigo-500 to-fuchsia-500" isDark={isDark} />
                            <ThemeOption themeKey={THEMES.SIMPLE} label="Simple (Minimal)" colorClass="from-zinc-400 to-zinc-600" isDark={isDark} />
                        </div>
                    </div>
                </SettingsSection>

                {/* Account */}
                <SettingsSection title="Account" icon={Crown} isDark={isDark}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-12 h-12 rounded-2xl bg-theme-primary flex items-center justify-center text-theme-bg font-bold text-lg mr-4 shadow-lg shadow-theme-primary/20">
                                {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <h4 className={`font-semibold text-sm text-theme-text`}>
                                    {currentUser?.displayName || 'User'}
                                </h4>
                                <p className="text-xs text-theme-muted">{currentUser?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 text-red-500 hover:bg-red-500/10 border border-red-500/20`}
                        >
                            Sign Out
                        </button>
                    </div>
                </SettingsSection>

                {/* About */}
                <SettingsSection title="About" icon={SettingsIcon} isDark={isDark}>
                    <div className="space-y-3 text-sm">
                        <div className={`flex justify-between items-center py-2.5 border-b border-theme-border`}>
                            <span className="text-theme-muted">Version</span>
                            <span className={`font-mono text-xs text-theme-text`}>v2.0.0 (Luminary)</span>
                        </div>
                        <div className={`flex justify-between items-center py-2.5 border-b border-theme-border`}>
                            <span className="text-theme-muted">Build</span>
                            <span className={`font-mono text-xs text-theme-text`}>Production</span>
                        </div>
                        <div className="pt-2">
                            <p className="text-theme-muted text-xs">© 2026 Aurem EdTech. All rights reserved.</p>
                        </div>
                    </div>
                </SettingsSection>
            </div>
        </div>
    );
};

export default Settings;
