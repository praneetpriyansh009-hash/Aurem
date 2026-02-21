"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { Menu, Mic } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const VoiceMode = dynamic(() => import("@/components/voice-mode"), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { currentUser, loading } = useAuth();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [voiceOpen, setVoiceOpen] = useState(false);

    useEffect(() => {
        if (!loading && !currentUser) {
            router.push("/login");
        }
    }, [loading, currentUser, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-aurem-500/30 border-t-aurem-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!currentUser) return null;

    return (
        <div className="flex h-screen overflow-hidden">
            <UpgradeModal />

            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                isCollapsed={sidebarCollapsed}
                setIsCollapsed={setSidebarCollapsed}
            />

            <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Mobile Header */}
                <header className="md:hidden glass-panel rounded-none border-x-0 border-t-0 p-4 pt-12 flex items-center gap-3 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-white/50 hover:text-white"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-aurem-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">A</span>
                        </div>
                        <span className="font-display font-semibold text-white">AUREM</span>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>

                {/* Mobile Nav */}
                <MobileNav />

                {/* Voice Mode FAB */}
                <button
                    onClick={() => setVoiceOpen(true)}
                    className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl shadow-violet-500/30 flex items-center justify-center hover:scale-110 transition-transform"
                    title="Voice Mode"
                >
                    <Mic className="w-6 h-6" />
                </button>

                {/* Voice Mode Overlay */}
                <AnimatePresence>
                    {voiceOpen && <VoiceMode onClose={() => setVoiceOpen(false)} />}
                </AnimatePresence>
            </div>
        </div>
    );
}
