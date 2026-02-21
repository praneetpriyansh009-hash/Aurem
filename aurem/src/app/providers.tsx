"use client";

import { useState, useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import { WeaknessProvider } from "@/lib/weakness-context";

export function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <AuthProvider>
            <SubscriptionProvider>
                <WeaknessProvider>{children}</WeaknessProvider>
            </SubscriptionProvider>
        </AuthProvider>
    );
}
