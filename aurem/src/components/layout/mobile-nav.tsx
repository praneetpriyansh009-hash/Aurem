"use client";

import { MessageSquare, Brain, Youtube, Layers, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const mobileNavItems = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/quiz", label: "Quiz", icon: Brain },
    { href: "/youtube", label: "YouTube", icon: Youtube },
    { href: "/flashcards", label: "Cards", icon: Layers },
    { href: "/college", label: "College", icon: Compass },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            <div className="bg-midnight-950/90 backdrop-blur-2xl border-t border-white/[0.06] px-2 pb-safe">
                <div className="flex items-center justify-around py-2">
                    {mobileNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-active"
                                        className="absolute inset-0 bg-white/[0.06] rounded-xl"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 relative z-10 transition-colors",
                                        isActive ? "text-aurem-500" : "text-white/30"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "text-[10px] font-medium relative z-10 transition-colors",
                                        isActive ? "text-white" : "text-white/30"
                                    )}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
