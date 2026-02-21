// AUREM V2 Types

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export type SubscriptionTier = "free" | "pro" | "go";

export interface SubscriptionPlan {
    id: SubscriptionTier;
    name: string;
    price: number;
    currency: string;
    features: string[];
    limits: FeatureLimits;
}

export interface FeatureLimits {
    chatMessages: number;
    documentUploads: number;
    quizzes: number;
    podcasts: number;
    videoGenerations: number;
    timetableGenerations: number;
    youtubeProcessing: number;
    flashcardDecks: number;
}

// --- Chat ---
export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    citations?: Citation[];
    confidenceScore?: number;
    isConceptGated?: boolean;
    weakTopicsReferenced?: string[];
}

export interface Citation {
    source: string;
    page?: number;
    relevance: number;
}

// --- Documents ---
export interface Document {
    id: string;
    name: string;
    content: string;
    summary?: string;
    keyPoints?: string[];
    questions?: QuizQuestion[];
    uploadedAt: Date;
}

// --- Enhanced Quiz System ---
export type Board = "CBSE" | "ICSE" | "State" | "IB" | "AP" | "SAT" | "ACT" | "JEE" | "NEET";
export type QuestionType = "mcq" | "theory" | "true-false" | "mixed";
export type DifficultyLevel = "easy" | "medium" | "hard" | "adaptive";

export interface QuizConfig {
    board: Board;
    classLevel: string;      // "9" | "10" | "11" | "12"
    subject: string;
    chapters: string[];
    questionCount: number;    // 5 | 10 | 15 | 20 | 35
    difficulty: DifficultyLevel;
    questionType: QuestionType;
    useWeakTopics: boolean;   // adapt based on weakness data
}

export interface QuizQuestion {
    id: string;
    type: "mcq" | "theory" | "true-false";
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
    topic: string;
    chapter?: string;
    subject?: string;
    marks?: number;
}

export interface QuizResult {
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    marksObtained: number;
    maxMarks: number;
    topic: string;
    difficulty: string;
}

export interface QuizSession {
    id: string;
    config: QuizConfig;
    questions: QuizQuestion[];
    results: QuizResult[];
    score: number;
    totalMarks: number;
    completedAt: Date;
    weakTopicsIdentified: string[];
}

// --- Weak Point Tracking ---
export interface WeakPoint {
    topic: string;
    subject: string;
    chapter?: string;
    score: number;            // 0-100 mastery
    totalAttempts: number;
    correctAttempts: number;
    lastAttempted: Date;
    recentTrend: "improving" | "declining" | "stable";
    history: Array<{ date: string; score: number }>;
}

export interface UserProgress {
    userId: string;
    weakPoints: WeakPoint[];
    quizHistory: QuizSession[];
    totalStudyMinutes: number;
    streakDays: number;
    lastActiveDate: string;
    flashcardsDue: number;
}

// --- Timetable ---
export interface TimetableEntry {
    id: string;
    day: string;
    timeSlot: string;
    subject: string;
    topic: string;
    duration: number;
    priority: "high" | "medium" | "low";
    completed: boolean;
    isWeakTopic?: boolean;
}

// --- Podcast ---
export interface PodcastScript {
    speaker: "Alex" | "Sam";
    text: string;
}

export interface PodcastData {
    script: PodcastScript[];
    topic: string;
    duration: number;
    audioUrl?: string;
}

// --- Video ---
export interface VideoGeneration {
    id: string;
    topic: string;
    status: "queued" | "generating" | "completed" | "failed";
    videoUrl?: string;
    thumbnailUrl?: string;
    duration: number;
    createdAt: Date;
}

// --- YouTube Processing ---
export interface YouTubeVideo {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    duration: string;
    transcript: string;
    summary?: string;
    notes?: string[];
    flashcards?: Flashcard[];
    questions?: QuizQuestion[];
    processedAt: Date;
}

// --- Flashcards (Spaced Repetition) ---
export interface Flashcard {
    id: string;
    front: string;
    back: string;
    topic: string;
    subject?: string;
    difficulty: "easy" | "medium" | "hard";
    // SM-2 spaced repetition fields
    interval: number;        // days until next review
    easeFactor: number;      // 1.3 - 2.5+ multiplier
    repetitions: number;
    nextReview: Date;
    lastReview?: Date;
    status: "new" | "learning" | "review" | "mastered";
}

export interface FlashcardDeck {
    id: string;
    name: string;
    description: string;
    cards: Flashcard[];
    source: "manual" | "document" | "youtube" | "quiz";
    createdAt: Date;
    dueCount: number;
    masteredCount: number;
}

// --- College Compass ---
export interface CollegeProfile {
    gpa: number;
    testScores: { name: string; score: number }[];
    targetMajor: string;
    extracurriculars: string[];
    budget: string;
    preferredLocation: string;
    preferredCountry: string;
}

export interface CollegeMatch {
    name: string;
    location: string;
    matchPercentage: number;
    ranking: string;
    acceptanceRate: string;
    tuition: string;
    strengths: string[];
    scholarshipInfo?: string;
}

// --- Study Rooms ---
export interface StudyRoom {
    id: string;
    name: string;
    subject: string;
    hostName: string;
    participants: string[];
    maxParticipants: number;
    isActive: boolean;
    focusTimer: number;
    createdAt: Date;
}
