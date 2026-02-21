"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    FileText,
    Calendar,
    Brain,
    Mic,
    Video,
    Users,
    CreditCard,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    X,
    Settings,
    Youtube,
    Layers,
    Compass,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/chat", label: "Smart Chat", icon: MessageSquare, color: "text-blue-400" },
    { href: "/documents", label: "Aurem Lens", icon: FileText, color: "text-orange-400" },
    { href: "/quiz", label: "Quizzes", icon: Brain, color: "text-violet-400" },
    { href: "/youtube", label: "YouTube", icon: Youtube, color: "text-red-400" },
    { href: "/flashcards", label: "Flashcards", icon: Layers, color: "text-purple-400" },
    { href: "/timetable", label: "Timetable", icon: Calendar, color: "text-emerald-400" },
    { href: "/podcast", label: "Podcasts", icon: Mic, color: "text-rose-400" },
    { href: "/college", label: "College Compass", icon: Compass, color: "text-teal-400" },
    { href: "/network", label: "Study Rooms", icon: Users, color: "text-amber-400" },
    { href: "/video", label: "Video Gen", icon: Video, color: "text-cyan-400", pro: true },
    { href: "/pricing", label: "Pricing", icon: CreditCard, color: "text-pink-400" },
];

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { currentUser, logout } = useAuth();
    const { tier, tierName, isPro } = useSubscription();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={cn(
                    "fixed top-0 left-0 h-full z-50 flex flex-col",
                    "bg-midnight-950/95 backdrop-blur-2xl border-r border-white/[0.06]",
                    "transition-all duration-300 ease-out",
                    // Mobile: slide in/out
                    "md:relative md:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                    isCollapsed ? "w-20" : "w-72"
                )}
            >
                {/* Header */}
                <div className={cn("flex items-center p-5 border-b border-white/[0.06]", isCollapsed && "justify-center px-3")}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aurem-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-glow">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="font-display font-bold text-lg text-white leading-tight">AUREM</h1>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest">Study AI</p>
                            </div>
                        </div>
                    )}

                    {isCollapsed && (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-aurem-500 to-pink-500 flex items-center justify-center shadow-glow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                    )}

                    {/* Close on Mobile */}
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-white/40 hover:text-white p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn("sidebar-link group", isActive && "active", isCollapsed && "justify-center px-3")}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? item.color : "text-white/40 group-hover:text-white/70")} />
                                {!isCollapsed && (
                                    <span className="flex-1 truncate text-sm">{item.label}</span>
                                )}
                                {!isCollapsed && item.pro && (
                                    <span className="pro-badge">PRO</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className={cn("border-t border-white/[0.06] p-4", isCollapsed && "px-3")}>
                    {!isCollapsed && currentUser && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-aurem-500/30 to-violet-500/30 flex items-center justify-center text-white/70 text-sm font-semibold flex-shrink-0 border border-white/10">
                                {currentUser.displayName?.charAt(0)?.toUpperCase() || currentUser.email?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">
                                    {currentUser.displayName || "Student"}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold uppercase tracking-wider",
                                            tier === "pro" ? "text-gradient" : tier === "go" ? "text-emerald-400" : "text-white/30"
                                        )}
                                    >
                                        {tierName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={cn("flex gap-2", isCollapsed ? "flex-col items-center" : "")}>
                        <button
                            onClick={handleLogout}
                            className={cn(
                                "flex items-center gap-2 text-white/40 hover:text-red-400 transition-colors text-sm",
                                isCollapsed ? "p-2" : "flex-1"
                            )}
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            {!isCollapsed && <span>Logout</span>}
                        </button>
                    </div>
                </div>

                {/* Collapse Toggle (Desktop only) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-midnight-900 border border-white/10 items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all z-10"
                >
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            </motion.aside>
        </>
    );
}
