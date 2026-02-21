import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Bot, FileText, LogOut, Moon, Sun, ChevronRight, ChevronLeft, GraduationCap, FilePlus, ClipboardList, Mic, Sparkles, Crown, Eye, Settings, RefreshCw, Video, Trophy } from './Icons';

const Sidebar = ({ currentView, setCurrentView, isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed, user, onLogin, onLogout }) => {
    const { isDark, toggleMode } = useTheme();
    const { tier, isPro, isDevMode, triggerUpgradeModal } = useSubscription();

    const navItems = [
        { id: 'doubt-solver', label: 'Doubt Solver', icon: Bot, color: 'from-violet-500 to-indigo-500', glow: 'shadow-violet-500/20' },
        { id: 'document-study', label: 'Aurem Lens', icon: Eye, color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/20' },
        { id: 'exam-hub', label: 'Competitive Hub', icon: Trophy, color: 'from-yellow-400 to-orange-500', glow: 'shadow-yellow-500/20' },
        { id: 'podcast-generator', label: 'Podcast Studio', icon: Mic, color: 'from-rose-500 to-pink-500', glow: 'shadow-rose-500/20' },
        { id: 'college-compass', label: 'College Compass', icon: GraduationCap, color: 'from-cyan-500 to-blue-500', glow: 'shadow-cyan-500/20' },
        { id: 'quiz-assessment', label: 'Quiz & Assessment', icon: ClipboardList, color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-500/20' },
        { id: 'video-generator', label: 'AI Video Studio', icon: Video, color: 'from-fuchsia-500 to-purple-500', glow: 'shadow-fuchsia-500/20' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed md:relative z-50 h-full md:h-[96vh] md:my-[2vh] ml-0 md:ml-[2vh]
                transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isCollapsed ? 'w-[76px]' : 'w-[280px] md:w-[272px]'}
                ${isSidebarOpen ? 'translate-x-0 left-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className={`
                    h-full flex flex-col rounded-3xl overflow-hidden
                    transition-all duration-300 border glass-3d
                    ${isDark
                        ? 'bg-midnight-900/40 border-white/[0.08] shadow-glass-dark'
                        : 'bg-white/40 border-warm-200/50 shadow-depth'
                    }
                `}>

                    {/* ═══ Header / Logo ═══ */}
                    <div className="p-5 pb-4 flex items-center justify-between">
                        {!isCollapsed && (
                            <div className="flex items-center gap-3 animate-fade-in">
                                <div className="relative">
                                    <div className="p-2.5 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl shadow-lg shadow-violet-500/25">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-lg opacity-30 -z-10" />
                                </div>
                                <div>
                                    <span className="font-display font-extrabold text-xl tracking-tight gradient-text">
                                        Aurem
                                    </span>
                                    <p className="text-[10px] font-medium text-theme-muted -mt-0.5 tracking-wider uppercase">AI Study</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`p-2 rounded-xl transition-all duration-200 text-theme-muted
                                ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-warm-200/60'}
                                ${isCollapsed ? 'mx-auto' : ''}
                            `}
                        >
                            {isCollapsed
                                ? <ChevronRight className="w-4 h-4" />
                                : <ChevronLeft className="w-4 h-4" />
                            }
                        </button>
                    </div>

                    {/* ═══ Navigation ═══ */}
                    <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                        {!isCollapsed && (
                            <p className="px-3 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-theme-muted opacity-60">
                                Features
                            </p>
                        )}

                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = currentView === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setCurrentView(item.id);
                                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                                    }}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={`
                                         w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 group relative
                                         ${isActive
                                            ? `bg-gradient-to-r ${item.color} text-white shadow-xl ${item.glow} scale-[1.02]`
                                            : isDark
                                                ? 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                                                : 'text-warm-600 hover:text-warm-900 hover:bg-warm-200/60'
                                        }
                                         ${isCollapsed ? 'justify-center px-0' : ''}
                                     `}
                                >
                                    {/* Active indicator bar */}
                                    {isActive && !isCollapsed && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/80 rounded-r-full" />
                                    )}

                                    <div className={`
                                        flex-shrink-0 transition-transform duration-300
                                        ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                                    `}>
                                        <Icon className="w-[18px] h-[18px]" />
                                    </div>

                                    {!isCollapsed && (
                                        <>
                                            <span className="font-medium text-[13px] truncate">{item.label}</span>
                                            {!isActive && (
                                                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0 transition-all duration-200" />
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* ═══ Footer Actions ═══ */}
                    <div className={`p-3 space-y-1.5 border-t ${isDark ? 'border-white/[0.04]' : 'border-warm-300/30'}`}>
                        {/* Settings */}
                        <button
                            onClick={() => setCurrentView('settings')}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all duration-200
                                ${currentView === 'settings'
                                    ? isDark ? 'bg-white/10 text-white' : 'bg-warm-200/70 text-warm-800'
                                    : isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.04]' : 'text-warm-500 hover:text-warm-700 hover:bg-warm-200/40'
                                }
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            <Settings className="w-[18px] h-[18px]" />
                            {!isCollapsed && <span className="text-[13px] font-medium">Settings</span>}
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleMode}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all duration-200
                                ${isDark ? 'text-white/50 hover:text-amber-400 hover:bg-amber-500/10' : 'text-warm-500 hover:text-indigo-600 hover:bg-indigo-50'}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            {isDark
                                ? <Sun className="w-[18px] h-[18px]" />
                                : <Moon className="w-[18px] h-[18px]" />
                            }
                            {!isCollapsed && <span className="text-[13px] font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                        </button>

                        {/* Upgrade / Pro Badge */}
                        {!isPro && !isDevMode ? (
                            <button
                                onClick={() => triggerUpgradeModal('upgrade')}
                                className={`w-full p-2.5 rounded-2xl flex items-center gap-2.5 transition-all duration-300
                                    bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white
                                    shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                            >
                                <Crown className="w-4 h-4" />
                                {!isCollapsed && <span className="text-[13px] font-bold">Upgrade to Pro</span>}
                            </button>
                        ) : (
                            !isCollapsed && (
                                <div className={`flex items-center justify-center gap-2 py-1.5 rounded-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">Pro Active</span>
                                </div>
                            )
                        )}

                        {/* User Profile */}
                        <div className={`flex items-center gap-3 p-2.5 rounded-2xl mt-1
                            ${isDark ? 'bg-white/[0.03]' : 'bg-warm-200/30'}
                            ${isCollapsed ? 'justify-center' : ''}
                        `}>
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                    {user?.displayName ? user.displayName[0].toUpperCase() : '?'}
                                </div>
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-current rounded-full"
                                    style={{ borderColor: isDark ? '#0A0A0F' : '#FAF9F6' }}
                                />
                            </div>

                            {!isCollapsed && (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-warm-800'}`}>
                                            {user?.displayName || 'User'}
                                        </p>
                                        <p className="text-[10px] text-theme-muted truncate">
                                            {user?.email || ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onLogout}
                                        className={`p-1.5 rounded-lg transition-all duration-200
                                            ${isDark ? 'hover:bg-red-500/10 text-white/40 hover:text-red-400' : 'hover:bg-red-50 text-warm-400 hover:text-red-500'}
                                        `}
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
