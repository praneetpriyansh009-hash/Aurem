import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { LearnLoopProvider, useLearnLoop } from './contexts/LearnLoopContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
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
import { Bot, GraduationCap, FileText, Menu, LogIn, FilePlus, Mic, Sparkles, ClipboardList, Settings as SettingsIcon, RefreshCw, Video, Eye, Trophy, Swords } from './components/Icons';
import { useRetryableFetch } from './utils/api';
import SamplePaperGenerator from './components/SamplePaperGenerator';
import LoopManager from './components/LearnLoop/LoopManager';
import LandingPageV2 from './components/LandingPageV2';
import ExamHub from './components/ExamHub';
import NeuralArena from './components/NeuralArena';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingGuide from './components/OnboardingGuide';

// Luminary Custom Cursor Tracker
const CustomCursor = () => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const moveCursor = (e) => {
            setPos({ x: e.clientX, y: e.clientY });
        };
        const handleMouseOver = (e) => {
            if (e.target.closest('button, a, input, select, textarea, [role="button"], .interactive')) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);
        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return (
        <>
            <div className="cursor-dot" style={{ left: pos.x, top: pos.y, opacity: isHovering ? 0 : 1 }} />
            <div className="cursor-circle" style={{ left: pos.x, top: pos.y, transform: `translate(-50%, -50%) scale(${isHovering ? 1.5 : 1})`, borderColor: isHovering ? 'var(--gold-light)' : 'var(--gold)' }} />
        </>
    );
};

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
    const [showOnboarding, setShowOnboarding] = useState(false);

    const hasVisited = localStorage.getItem('hasVisited') === 'true';

    // Initial splash completes
    const handleSplashComplete = () => {
        if (currentUser) {
            setPhase('app');
            if (localStorage.getItem('showOnboarding') === 'true') {
                setShowOnboarding(true);
            }
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
            if (localStorage.getItem('showOnboarding') === 'true') {
                setShowOnboarding(true);
            }
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

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        localStorage.removeItem('showOnboarding');
    };

    const renderContent = () => {
        switch (currentView) {
            case 'settings': return <Settings />;
            case 'learn-loop': return <LoopManager />;
            case 'doubt-solver': return <DoubtSolver retryableFetch={retryableFetch} />;
            case 'document-study': return <DocumentStudy retryableFetch={retryableFetch} onNavigate={setCurrentView} />;
            case 'college-compass': return <CollegeCompass retryableFetch={retryableFetch} />;
            case 'podcast-generator': return <PodcastGenerator retryableFetch={retryableFetch} />;
            case 'video-generator': return <VideoGenerator />;
            case 'quiz-assessment': return <QuizAssessment retryableFetch={retryableFetch} onNavigate={setCurrentView} />;
            case 'sample-paper': return <SamplePaperGenerator retryableFetch={retryableFetch} />;
            case 'exam-hub': return <ExamHub />;
            case 'neural-arena': return <NeuralArena onExit={() => setCurrentView('document-study')} setIsCollapsed={setIsCollapsed} />;
            default: return <DoubtSolver retryableFetch={retryableFetch} />;
        }
    };

    const getHeaderTitle = () => {
        const titles = {
            'settings': 'Settings',
            'learn-loop': 'Mastery Lifecycle',
            'doubt-solver': 'Neural Query',
            'document-study': 'Aurem Lens',
            'college-compass': 'Admissions Pilot',
            'podcast-generator': 'Audio Studio',
            'video-generator': 'Visual Studio',
            'quiz-assessment': 'Adaptive Testing',
            'sample-paper': 'Dynamic Paper Gen',
            'exam-hub': 'Competitive Prep',
            'neural-arena': 'Cognitive Colosseum',
        };
        return titles[currentView] || 'Aurem';
    };

    const getHeaderIcon = () => {
        const iconMap = {
            'settings': <SettingsIcon className="w-5 h-5 mr-2 text-theme-muted" />,
            'learn-loop': <RefreshCw className="w-5 h-5 mr-2 text-gold" />,
            'doubt-solver': <Bot className="w-5 h-5 mr-2 text-gold" />,
            'document-study': <Eye className="w-5 h-5 mr-2 text-gold" />,
            'college-compass': <GraduationCap className="w-5 h-5 mr-2 text-gold" />,
            'podcast-generator': <Mic className="w-5 h-5 mr-2 text-gold" />,
            'video-generator': <Video className="w-5 h-5 mr-2 text-gold-light" />,
            'quiz-assessment': <ClipboardList className="w-5 h-5 mr-2 text-gold" />,
            'sample-paper': <FileText className="w-5 h-5 mr-2 text-gold-light" />,
            'exam-hub': <Trophy className="w-5 h-5 mr-2 text-gold" />,
            'neural-arena': <Swords className="w-5 h-5 mr-2 text-gold" />,
        };
        return iconMap[currentView] || <Sparkles className="w-5 h-5 mr-2 text-gold" />;
    };

    // ═══ RENDER PHASES ═══
    const renderPhase = () => {
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
            <div className="flex w-full h-[100dvh] font-sans overflow-hidden bg-theme-bg text-theme-text transition-colors duration-500">
                <UpgradeModal />

                {showOnboarding && <OnboardingGuide onComplete={handleOnboardingComplete} />}

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
                    md:my-[2vh] md:mr-[2vh] md:rounded-[32px] overflow-hidden bg-theme-surface border border-theme-border
                `}>
                    {/* Mobile Header */}
                    <header className="md:hidden p-4 pt-12 flex items-center z-30 sticky top-0 bg-theme-bg/90 backdrop-blur-xl border-b border-theme-border">
                        <button onClick={() => setIsSidebarOpen(true)} className="mr-3 text-theme-muted hover:text-theme-primary transition-colors cursor-none">
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="font-serif italic font-light flex items-center text-theme-text">
                            {getHeaderIcon()}
                            {getHeaderTitle()}
                        </h1>
                    </header>

                    <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
                        <div key={currentView} className="h-full animate-page-enter">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        );
    };

    return (
        <>
            <CustomCursor />
            {renderPhase()}
        </>
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
                    <PerformanceProvider>
                        <LearnLoopProvider>
                            <AuthGate />
                        </LearnLoopProvider>
                    </PerformanceProvider>
                </SubscriptionProvider>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
