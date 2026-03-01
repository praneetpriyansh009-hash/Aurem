import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Bot, FileText, LogOut, Moon, Sun, ChevronRight, ChevronLeft, GraduationCap, FilePlus, ClipboardList, Mic, Sparkles, Crown, Eye, Settings, RefreshCw, Video, Trophy, Swords } from './Icons';

const Sidebar = ({ currentView, setCurrentView, isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed, user, onLogin, onLogout }) => {
    const { isDark } = useTheme();
    const { tier, isPro, isDevMode, triggerUpgradeModal } = useSubscription();

    const navItems = [
        { id: 'doubt-solver', label: 'Neural Query', icon: Bot },
        { id: 'document-study', label: 'Aurem Lens', icon: Eye },
        { id: 'neural-arena', label: 'Cognitive Colosseum', icon: Swords },
        { id: 'exam-hub', label: 'Competitive Prep', icon: Trophy },
        { id: 'podcast-generator', label: 'Audio Studio', icon: Mic },
        { id: 'college-compass', label: 'Admissions Pilot', icon: GraduationCap },
        { id: 'quiz-assessment', label: 'Adaptive Testing', icon: ClipboardList },
        { id: 'video-generator', label: 'Visual Studio', icon: Video },
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
                transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform
                ${isCollapsed ? 'w-[76px]' : 'w-[280px] md:w-[272px]'}
                ${isSidebarOpen ? 'translate-x-0 translate-z-0 left-0' : '-translate-x-full md:translate-x-0 translate-z-0'}
            `}>
                <div className="h-full flex flex-col rounded-[32px] overflow-hidden transition-all duration-300 border border-theme-border bg-theme-bg/80 backdrop-blur-3xl shadow-[5px_0_30px_rgba(0,0,0,0.5)]">

                    {/* ═══ Header / Logo ═══ */}
                    <div className="p-5 pb-4 flex items-center justify-between">
                        {!isCollapsed && (
                            <div className="flex items-center gap-3 animate-fade-in">
                                <div className="relative">
                                    <div className="p-2.5 bg-gold/10 border border-gold/20 rounded-2xl">
                                        <Sparkles className="w-5 h-5 text-gold" />
                                    </div>
                                </div>
                                <div>
                                    <span className="font-serif italic font-light text-2xl tracking-wide text-theme-text select-none">
                                        <span className="text-theme-primary not-italic mr-1">✦</span>
                                        <span className="text-[#c9a55a]">Aurem</span>
                                    </span>
                                    <p className="text-[9px] font-medium text-theme-muted mt-1 tracking-[0.2em] uppercase select-none">EdTech Platform</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`p-2 rounded-xl transition-colors duration-200 text-theme-muted hover:text-theme-primary hover:bg-theme-surface/50 cursor-none
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
                                        // Auto-retract sidebar on navigation for both desktop and mobile
                                        setIsSidebarOpen(false); // Mobile
                                        if (window.innerWidth >= 768) {
                                            setIsCollapsed(true); // Desktop
                                        }
                                    }}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={`
                                         w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 group relative cursor-none
                                         ${isActive
                                            ? 'bg-gold/10 text-gold border border-gold/20'
                                            : 'text-cream/50 hover:text-cream hover:bg-gold/5 border border-transparent'
                                        }
                                         ${isCollapsed ? 'justify-center px-0' : ''}
                                     `}
                                >
                                    {/* Active indicator bar */}
                                    {isActive && !isCollapsed && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gold rounded-r-full" />
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
                    <div className="p-3 space-y-1.5 border-t border-theme-border">
                        {/* Settings */}
                        <button
                            onClick={() => setCurrentView('settings')}
                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-colors duration-200 cursor-none
                                ${currentView === 'settings'
                                    ? 'bg-theme-surface text-theme-primary'
                                    : 'text-theme-muted hover:text-theme-secondary hover:bg-theme-surface/50'
                                }
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                        >
                            <Settings className="w-[18px] h-[18px]" />
                            {!isCollapsed && <span className="text-[13px] font-medium">Settings</span>}
                        </button>

                        {/* Theme Toggle Removed */}

                        {/* Upgrade / Pro Badge */}
                        {!isPro && !isDevMode ? (
                            <button
                                onClick={() => triggerUpgradeModal('upgrade')}
                                className={`w-full p-2.5 rounded-xl flex items-center gap-2.5 transition-colors duration-300
                                    bg-theme-primary text-theme-bg hover:bg-theme-secondary cursor-none
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                            >
                                <Crown className="w-4 h-4" />
                                {!isCollapsed && <span className="text-[11px] uppercase tracking-[0.18em] font-medium">Upgrade</span>}
                            </button>
                        ) : (
                            !isCollapsed && (
                                <div className="flex items-center justify-center gap-2 py-1.5 rounded-xl border border-theme-primary/20 bg-theme-primary/[0.04]">
                                    <Crown className="w-3.5 h-3.5 text-theme-primary" />
                                    <span className="text-[9px] font-bold text-theme-primary tracking-[0.2em] uppercase">Pro Active</span>
                                </div>
                            )
                        )}

                        {/* User Profile */}
                        <div className={`flex items-center gap-3 p-2.5 rounded-xl border border-theme-border mt-1
                            bg-theme-surface
                            ${isCollapsed ? 'justify-center' : ''}
                        `}>
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-theme-primary font-serif italic text-sm shadow-md">
                                    {user?.displayName ? user.displayName[0].toUpperCase() : '?'}
                                </div>
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#4ade80] rounded-full border border-[var(--surface)]" />
                            </div>

                            {!isCollapsed && (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium tracking-wide truncate text-theme-text">
                                            {user?.displayName || 'User'}
                                        </p>
                                        <p className="text-[9px] text-theme-muted truncate uppercase tracking-widest mt-0.5">
                                            {user?.email || 'STUDENT'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onLogout}
                                        className="p-1.5 rounded-lg transition-colors duration-200 text-theme-muted hover:text-theme-primary hover:bg-theme-primary/10 cursor-none"
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
