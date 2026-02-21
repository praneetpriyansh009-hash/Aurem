import React from 'react';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { Moon, Sun, Crown, Settings as SettingsIcon, Eye, ChevronRight } from './Icons';
import { useAuth } from '../contexts/AuthContext';

const ThemeOption = ({ themeKey, colorClass, label }) => {
    const { theme, setTheme, isDark } = useTheme();
    const isActive = theme === themeKey;

    return (
        <button
            onClick={() => setTheme(themeKey)}
            className={`
                group relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300
                ${isActive
                    ? isDark
                        ? 'ring-2 ring-violet-500 bg-white/[0.06]'
                        : 'ring-2 ring-violet-500 bg-warm-200/50'
                    : isDark
                        ? 'hover:bg-white/[0.04] border border-white/[0.04]'
                        : 'hover:bg-warm-200/30 border border-warm-300/20'
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
            <span className={`text-[11px] font-semibold ${isActive ? 'text-violet-500' : isDark ? 'text-white/50' : 'text-warm-500'}`}>
                {label}
            </span>
        </button>
    );
};

const SettingsSection = ({ title, icon: Icon, children, isDark }) => (
    <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center mb-4 px-1">
            <div className={`p-2 rounded-xl mr-3 ${isDark ? 'bg-violet-500/15' : 'bg-violet-100'}`}>
                <Icon className="w-4 h-4 text-violet-500" />
            </div>
            <h3 className={`text-base font-display font-bold ${isDark ? 'text-white' : 'text-warm-800'}`}>{title}</h3>
        </div>
        <div className={`p-6 rounded-3xl border backdrop-blur-sm
            ${isDark ? 'bg-midnight-700/40 border-white/[0.04]' : 'bg-white/60 border-warm-300/20 shadow-depth'}
        `}>
            {children}
        </div>
    </div>
);

const Settings = () => {
    const { isDark, toggleMode } = useTheme();
    const { currentUser, logout } = useAuth();

    return (
        <div className={`h-full overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32 ${isDark ? 'bg-midnight-900' : 'bg-warm-50'}`}>
            <div className="max-w-3xl mx-auto">
                <header className="mb-10">
                    <h1 className={`text-3xl font-display font-extrabold tracking-tight mb-1.5 ${isDark ? 'text-white' : 'text-warm-800'}`}>
                        Settings
                    </h1>
                    <p className="text-theme-muted text-sm">Customize your Aurem experience</p>
                </header>

                {/* Appearance */}
                <SettingsSection title="Appearance" icon={Eye} isDark={isDark}>
                    <div className={`flex items-center justify-between mb-6 pb-6 border-b ${isDark ? 'border-white/[0.04]' : 'border-warm-300/15'}`}>
                        <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4
                                ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-100 text-indigo-500'}
                            `}>
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-warm-800'}`}>Dark Mode</h4>
                                <p className="text-xs text-theme-muted">Toggle between light and dark</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleMode}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300
                                ${isDark ? 'bg-violet-500' : 'bg-warm-300'}
                            `}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300
                                ${isDark ? 'translate-x-6' : 'translate-x-1'}
                            `} />
                        </button>
                    </div>

                    <div>
                        <h4 className={`font-semibold text-sm mb-4 ${isDark ? 'text-white' : 'text-warm-800'}`}>Color Theme</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            <ThemeOption themeKey={THEMES.OCEAN} label="Ocean" colorClass="from-cyan-500 to-blue-600" />
                            <ThemeOption themeKey={THEMES.SUNSET} label="Sunset" colorClass="from-orange-500 to-rose-600" />
                            <ThemeOption themeKey={THEMES.FOREST} label="Forest" colorClass="from-emerald-500 to-teal-600" />
                            <ThemeOption themeKey={THEMES.LAVENDER} label="Lavender" colorClass="from-violet-500 to-purple-600" />
                            <ThemeOption themeKey={THEMES.ROSE} label="Rose" colorClass="from-rose-400 to-pink-500" />
                            <ThemeOption themeKey={THEMES.SLATE} label="Slate" colorClass="from-slate-500 to-zinc-600" />
                            <ThemeOption themeKey={THEMES.AMBER} label="Amber" colorClass="from-amber-400 to-yellow-500" />
                        </div>
                    </div>
                </SettingsSection>

                {/* Account */}
                <SettingsSection title="Account" icon={Crown} isDark={isDark}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg shadow-violet-500/20">
                                {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-warm-800'}`}>
                                    {currentUser?.displayName || 'User'}
                                </h4>
                                <p className="text-xs text-theme-muted">{currentUser?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200
                                ${isDark
                                    ? 'text-red-400 hover:bg-red-500/10 border border-red-500/10'
                                    : 'text-red-500 hover:bg-red-50 border border-red-200/40'
                                }
                            `}
                        >
                            Sign Out
                        </button>
                    </div>
                </SettingsSection>

                {/* About */}
                <SettingsSection title="About" icon={SettingsIcon} isDark={isDark}>
                    <div className="space-y-3 text-sm">
                        <div className={`flex justify-between items-center py-2.5 border-b ${isDark ? 'border-white/[0.04]' : 'border-warm-300/15'}`}>
                            <span className="text-theme-muted">Version</span>
                            <span className={`font-mono text-xs ${isDark ? 'text-white' : 'text-warm-800'}`}>v2.0.0 (Generational)</span>
                        </div>
                        <div className={`flex justify-between items-center py-2.5 border-b ${isDark ? 'border-white/[0.04]' : 'border-warm-300/15'}`}>
                            <span className="text-theme-muted">Build</span>
                            <span className={`font-mono text-xs ${isDark ? 'text-white' : 'text-warm-800'}`}>Production</span>
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
