// Firebase Client Configuration for AUREM
// Safe for SSR/build-time — lazy initializes only when needed

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getApp(): FirebaseApp {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApps()[0];
}

// Lazy getters that only initialize when accessed at runtime (not during build)
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

export function getFirebaseAuth(): Auth {
    if (!_auth) _auth = getAuth(getApp());
    return _auth;
}

export function getFirebaseDb(): Firestore {
    if (!_db) _db = getFirestore(getApp());
    return _db;
}

export function getGoogleProvider(): GoogleAuthProvider {
    if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
    return _googleProvider;
}

// Backward-compatible exports for convenience
// These will throw at build time if accessed, but are safe in client components
export const auth = typeof window !== "undefined" ? getFirebaseAuth() : (null as unknown as Auth);
export const db = typeof window !== "undefined" ? getFirebaseDb() : (null as unknown as Firestore);
export const googleProvider = typeof window !== "undefined" ? getGoogleProvider() : (null as unknown as GoogleAuthProvider);
