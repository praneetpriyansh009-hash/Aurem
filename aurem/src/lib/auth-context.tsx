"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    updateProfile,
    User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import type { User } from "@/types";

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, displayName: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SSR_AUTH: AuthContextType = {
    currentUser: null,
    loading: true,
    login: async () => { },
    signup: async () => { },
    loginWithGoogle: async () => { },
    logout: async () => { },
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    // Return safe defaults during SSR/build when provider isn't mounted
    if (!ctx) return SSR_AUTH;
    return ctx;
};

function mapFirebaseUser(user: FirebaseUser): User {
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getFirebaseAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user ? mapFirebaseUser(user) : null);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    };

    const signup = async (email: string, password: string, displayName: string) => {
        const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
        await updateProfile(credential.user, { displayName });
    };

    const loginWithGoogle = async () => {
        await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
    };

    const logout = async () => {
        await signOut(getFirebaseAuth());
    };

    return (
        <AuthContext.Provider value={{ currentUser, loading, login, signup, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
