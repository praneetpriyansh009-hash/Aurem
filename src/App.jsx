import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { LearnLoopProvider, useLearnLoop } from './contexts/LearnLoopContext';
import SplashScreen from './components/SplashScreen';
import Sidebar from './components/Sidebar';
import DoubtSolver from './components/DoubtSolver';
import CollegeCompass from './components/CollegeCompass';
import DocumentStudy from './components/DocumentStudy';
import PodcastGenerator from './components/PodcastGenerator';
import VideoGenerator from './components/VideoGenerator';
import QuizAssessment from './components/QuizAssessment';
import UpgradeModal from './components/UpgradeModal';
import Login from './components/Login';
import Signup from './components/Signup';
import Settings from './components/Settings';
import { Bot, GraduationCap, FileText, Menu, LogIn, FilePlus, Mic, Sparkles, ClipboardList, Settings as SettingsIcon, RefreshCw, Video, Eye, Trophy } from './components/Icons';
import { useRetryableFetch } from './utils/api';
import SamplePaperGenerator from './components/SamplePaperGenerator';
import LoopManager from './components/LearnLoop/LoopManager';
import LandingPageV2 from './components/LandingPageV2';
import ExamHub from './components/ExamHub';
import ErrorBoundary from './components/ErrorBoundary';

// Floating particles background
const FloatingParticles = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
            <div
                key={i}
                className="absolute rounded-full bg-indigo-500/[0.03]"
                style={{
                    width: `${150 + i * 60}px`,
                    height: `${150 + i * 60}px`,
                    top: `${10 + i * 15}%`,
                    left: `${5 + i * 16}%`,
                    filter: `blur(${60 + i * 15}px)`,
                    animation: `globalFloat ${12 + i * 3}s ease-in-out infinite`,
                    animationDelay: `${-i * 2}s`,
                }}
            />
        ))}
    </div>
);

const AppContent = () => {
    const { isDark } = useTheme();
    const { currentUser, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { retryableFetch } = useRetryableFetch();
    const { activeLoop } = useLearnLoop();

    // ═══ FLOW STATE ═══
    // Phase: 'splash' → 'landing'/'login'/'app' → ...
    const [phase, setPhase] = useState('splash');
    const [currentView, setCurrentView] = useState('doubt-solver');

    const hasVisited = localStorage.getItem('hasVisited') === 'true';

    // Initial splash completes
    const handleSplashComplete = () => {
        if (currentUser) {
            setPhase('app');
        } else {
            // Force landing page for now to ensure user sees the new overhaul
            setPhase('landing');
        }
    };

    // Landing page "Get Started" clicked
    const handleGetStarted = () => {
        localStorage.setItem('hasVisited', 'true');
        setPhase('splash-to-login');
    };

    // Second splash completes (after landing)
    const handleSecondSplashComplete = () => {
        setPhase('login');
    };

    // After successful auth, currentUser changes
    useEffect(() => {
        if (currentUser && (phase === 'login' || phase === 'signup')) {
            setPhase('app');
            setCurrentView('doubt-solver');
        }
    }, [currentUser, phase]);

    useEffect(() => {
        if (activeLoop && activeLoop.isActive) {
            setCurrentView('learn-loop');
        }
    }, [activeLoop]);

    const handleLogout = async () => {
        await logout();
        setPhase('login');
    };

    const renderContent = () => {
        switch (currentView) {
            case 'settings': return <Settings />;
            case 'learn-loop': return <LoopManager />;
            case 'doubt-solver': return <DoubtSolver retryableFetch={retryableFetch} />;
            case 'document-study': return <DocumentStudy retryableFetch={retryableFetch} />;
            case 'college-compass': return <CollegeCompass retryableFetch={retryableFetch} />;
            case 'podcast-generator': return <PodcastGenerator retryableFetch={retryableFetch} />;
            case 'video-generator': return <VideoGenerator />;
            case 'quiz-assessment': return <QuizAssessment retryableFetch={retryableFetch} onNavigate={setCurrentView} />;
            case 'sample-paper': return <SamplePaperGenerator retryableFetch={retryableFetch} />;
            case 'exam-hub': return <ExamHub />;
            default: return <DoubtSolver retryableFetch={retryableFetch} />;
        }
    };

    const getHeaderTitle = () => {
        const titles = {
            'settings': 'Settings',
            'learn-loop': 'Learn Loop',
            'doubt-solver': 'Doubt Solver',
            'document-study': 'Aurem Lens',
            'college-compass': 'College Compass',
            'podcast-generator': 'Podcast Studio',
            'video-generator': 'AI Video Studio',
            'quiz-assessment': 'Quiz & Assessment',
            'sample-paper': 'Smart Paper Generator',
            'exam-hub': 'Competitive Hub',
        };
        return titles[currentView] || 'Aurem';
    };

    const getHeaderIcon = () => {
        const iconMap = {
            'settings': <SettingsIcon className="w-5 h-5 mr-2 text-theme-muted" />,
            'learn-loop': <RefreshCw className="w-5 h-5 mr-2 text-violet-500" />,
            'doubt-solver': <Bot className="w-5 h-5 mr-2 text-violet-500" />,
            'document-study': <Eye className="w-5 h-5 mr-2 text-amber-500" />,
            'college-compass': <GraduationCap className="w-5 h-5 mr-2 text-cyan-500" />,
            'podcast-generator': <Mic className="w-5 h-5 mr-2 text-rose-500" />,
            'video-generator': <Video className="w-5 h-5 mr-2 text-fuchsia-500" />,
            'quiz-assessment': <ClipboardList className="w-5 h-5 mr-2 text-emerald-500" />,
            'sample-paper': <FileText className="w-5 h-5 mr-2 text-purple-500" />,
            'exam-hub': <Trophy className="w-5 h-5 mr-2 text-yellow-500" />,
        };
        return iconMap[currentView] || <Sparkles className="w-5 h-5 mr-2 text-amber-500" />;
    };

    // ═══ RENDER PHASES ═══

    // Initial splash
    if (phase === 'splash') {
        return <SplashScreen onComplete={handleSplashComplete} />;
    }

    // Landing page (new users)
    if (phase === 'landing') {
        return <LandingPageV2 onGetStarted={handleGetStarted} />;
    }

    // Second splash (after landing → before login)
    if (phase === 'splash-to-login') {
        return <SplashScreen onComplete={handleSecondSplashComplete} />;
    }

    // Login
    if (phase === 'login') {
        return <Login onSwitchToSignup={() => setPhase('signup')} />;
    }

    // Signup
    if (phase === 'signup') {
        return <Signup onSwitchToLogin={() => setPhase('login')} />;
    }

    // ═══ MAIN APP ═══
    return (
        <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500
            ${isDark ? 'bg-midnight-900' : 'bg-warm-50'}
        `}>
            {/* Global floating particles */}
            <FloatingParticles />

            {/* Aurora background */}
            <div className="aurora-bg">
                <div className="blob"></div>
            </div>

            <UpgradeModal />

            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                user={currentUser}
                onLogin={() => setPhase('login')}
                onLogout={handleLogout}
            />

            <div className={`
                flex-1 flex flex-col h-full relative z-10 transition-all duration-500
                md:my-[2vh] md:mr-[2vh] md:rounded-3xl overflow-hidden
                ${isDark
                    ? 'md:bg-midnight-800/50 md:border md:border-white/[0.04]'
                    : 'md:bg-white/40 md:border md:border-warm-300/25'
                }
                md:shadow-depth md:backdrop-blur-xl
            `}>
                {/* Mobile Header */}
                <header className={`md:hidden p-4 pt-12 shadow-sm flex items-center z-30 sticky top-0
                    ${isDark
                        ? 'bg-midnight-900/90 border-b border-white/[0.04]'
                        : 'bg-warm-50/90 border-b border-warm-300/25'
                    }
                    backdrop-blur-xl
                `}>
                    <button onClick={() => setIsSidebarOpen(true)} className="mr-3 text-theme-muted hover:text-theme-primary transition-colors">
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className={`font-display font-bold flex items-center ${isDark ? 'text-white' : 'text-warm-800'}`}>
                        {getHeaderIcon()}
                        {getHeaderTitle()}
                    </h1>
                </header>

                <main className="flex-1 overflow-y-auto relative">
                    <div key={currentView} className="h-full animate-page-enter">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const AuthGate = () => {
    const { currentUser, loading } = useAuth();
    if (loading) return <SplashScreen />;
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
};

const App = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <SubscriptionProvider>
                    <LearnLoopProvider>
                        <AuthGate />
                    </LearnLoopProvider>
                </SubscriptionProvider>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
