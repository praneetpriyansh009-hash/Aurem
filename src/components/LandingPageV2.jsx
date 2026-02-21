import React, { useEffect, useState, useRef } from 'react';
import { AuremLogo } from './SplashScreen';
import { Bot, Brain, Target, RefreshCw, Star, CheckCircle2, X } from './Icons';
import './LandingPageV2.css';

// Cosmic 3D Background with Wireframes & Stars
const CosmicBackground = ({ count = 30 }) => {
    const [stars, setStars] = useState([]);
    const [cubes, setCubes] = useState([]);

    useEffect(() => {
        setStars(Array.from({ length: count }, (_, i) => ({
            id: i,
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 15,
            duration: 1.5 + Math.random() * 3,
            size: 1 + Math.random() * 2,
            angle: 45 + Math.random() * 10,
        })));

        setCubes(Array.from({ length: 15 }, (_, i) => ({
            id: i,
            top: Math.random() * 100,
            left: Math.random() * 100,
            size: 30 + Math.random() * 60,
            delay: Math.random() * -20,
            duration: 15 + Math.random() * 15
        })));
    }, [count]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ perspective: '1000px' }}>
            {/* Stars */}
            {stars.map(star => (
                <div
                    key={`star-${star.id}`}
                    className="absolute rounded-full bg-cyan-300"
                    style={{
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        boxShadow: `0 0 ${star.size * 4}px ${star.size}px rgba(0,212,255,0.6), -${star.size * 20}px 0 ${star.size * 10}px ${star.size * 0.5}px rgba(0,212,255,0.3)`,
                        transform: `rotate(${star.angle}deg)`,
                        animation: `loginStar ${star.duration}s ${star.delay}s ease-in infinite`,
                        opacity: 0,
                    }}
                />
            ))}

            {/* Floating 3D Cubes */}
            {cubes.map(cube => (
                <div
                    key={`cube-${cube.id}`}
                    className="wireframe-cube"
                    style={{
                        top: `${cube.top}%`,
                        left: `${cube.left}%`,
                        width: `${cube.size}px`,
                        height: `${cube.size}px`,
                        animationDelay: `${cube.delay}s`,
                        animationDuration: `${cube.duration}s`
                    }}
                >
                    <div className="face front"></div>
                    <div className="face back"></div>
                    <div className="face right"></div>
                    <div className="face left"></div>
                    <div className="face top"></div>
                    <div className="face bottom"></div>
                </div>
            ))}
        </div>
    );
};

// Interactive Neural Core Visualizer
const NeuralCore = () => {
    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto mb-12 flex items-center justify-center pointer-events-none">
            {/* Outer rings */}
            <div className="absolute inset-[-20%] border border-[#7928ca]/20 rounded-full animate-spin-slow opacity-50" />
            <div className="absolute inset-[-40%] border border-[#00d4ff]/10 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-30" />

            {/* Morphing Core */}
            <div className="neural-core absolute inset-0" />

            {/* Inner intense light */}
            <div className="absolute inset-[20%] bg-gradient-to-tr from-[#ff007f] to-[#00d4ff] rounded-full blur-xl opacity-80 animate-pulse" />

            <Brain className="w-12 h-12 md:w-16 md:h-16 text-white relative z-10 opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
        </div>
    );
};

const LandingPageV2 = ({ onGetStarted }) => {
    const [scrolled, setScrolled] = useState(false);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const heroRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setVisibleSections(prev => new Set([...prev, entry.target.id]));
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
        };
    }, []);

    const features = [
        { icon: '🧪', title: 'AI Doubt Solver', desc: 'Ask anything academic. Get curriculum-aligned, hallucination-resistant answers with deep-context RAG.', color: 'emerald' },
        { icon: '📚', title: 'Aurem Lens', desc: 'Transform any PDF or lecture into 2000+ word detailed study guides, flashcards, and quizzes.', color: 'violet' },
        { icon: '🎯', title: 'Mastery Loop', desc: 'Our unique 4-phase cycle: Analysis → Learning → Assessment → Remediation until mastery.', color: 'rose' },
        { icon: '🏆', title: 'Competitive Hub', desc: 'Custom prep flows for JEE, NEET, SAT, and more. Adaptive mock tests that focus on your weaknesses.', color: 'amber' },
        { icon: '🎙️', title: 'Podcast Studio', desc: 'Turn your notes into high-fidelity dual-voice podcasts for learning on the go.', color: 'cyan' },
        { icon: '🧭', title: 'College Compass', desc: 'AI-powered guidance for admissions. Proven strategies to secure spots in global top-tier institutions.', color: 'indigo' },
    ];

    // Phase 8: Expanding to 16+ global, regional, and intermediate schools
    const colleges = [
        'MIT', 'Oxford', 'Stanford', 'Delhi University', 'VIT Vellore', 'Manipal University', 'SRM University', 'Anna University', 'Pune University', 'Jadavpur University', 'Christ University', 'IIT Bombay', 'BITS Pilani', 'Harvard', 'RMIT', 'Amity University', 'Symbiosis'
    ];

    // Targeted Demographic Reviews: Featuring Aurem features and realistic schools
    const reviews = [
        { name: "Rahul S.", college: "Delhi University", text: "I couldn't afford expensive coaching. Aurem Lens analyzed my basic syllabus and generated 2000+ word detailed chapters. It's the ultimate equalizer.", rating: 5 },
        { name: "Sarah N.", college: "VIT Vellore", text: "The commercial prep books are too shallow. The depth of Aurem's RAG system means zero hallucinations, just pure, verified 3000-word study guides.", rating: 5 },
        { name: "Vijay P.", college: "Pune University", text: "Coming from a state board, I didn't have access to top-tier teachers. The Mastery Loop gave me unlimited remediation until the concepts finally clicked.", rating: 5 },
        { name: "Elena R.", college: "Oxford", text: "My public school counselor had 400 other kids. College Compass gave me personalized, elite-level admission strategy that got me accepted.", rating: 5 },
        { name: "Samir K.", college: "SRM University", text: "When you rely entirely on self-study, you need details. Aurem Lens doesn't do bullet points; it generates massive, highly-structured textbook chapters tailored exactly to my weak spots.", rating: 5 },
        { name: "Anita V.", college: "Anna University", text: "Private tutors were out of the question for my family. The adaptive quizzes in the Mastery Loop pinpoint exactly what I misunderstood.", rating: 5 },
        { name: "David L.", college: "Christ University", text: "I threw away my $100 prep books. I just upload my PDFs and Aurem builds my entire curriculum and tests me on it. Incredible.", rating: 5 },
        { name: "Priya M.", college: "Jadavpur University", text: "The Podcast Studio feature is incredible. Rather than paying for crash courses, I listen to AI dual-voice podcasts of my 50-page lecture notes during my commute.", rating: 5 },
    ];

    const colorMap = {
        emerald: 'from-emerald-400 to-emerald-600',
        violet: 'from-violet-400 to-violet-600',
        rose: 'from-rose-400 to-rose-600',
        amber: 'from-amber-400 to-amber-600',
        cyan: 'from-cyan-400 to-cyan-600',
        indigo: 'from-indigo-400 to-indigo-600',
    };

    const bgColorMap = {
        emerald: 'bg-emerald-500/10 border-emerald-500/20',
        violet: 'bg-violet-500/10 border-violet-500/20',
        rose: 'bg-rose-500/10 border-rose-500/20',
        amber: 'bg-amber-500/10 border-amber-500/20',
        cyan: 'bg-cyan-500/10 border-cyan-500/20',
        indigo: 'bg-indigo-500/10 border-indigo-500/20',
    };

    return (
        <div className="lp-page-v2 overflow-x-hidden bg-[#03030b]">
            {/* === AMBIENT BACKGROUND & 3D GEOMETRY === */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[5%] left-[5%] w-[60vw] h-[60vw] bg-[#7928ca]/5 blur-[200px] rounded-full" />
                <div className="absolute bottom-[10%] right-[5%] w-[50vw] h-[50vw] bg-[#00d4ff]/5 blur-[180px] rounded-full" style={{ animation: 'float 15s ease-in-out infinite alternate' }} />
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: 'radial-gradient(rgba(0,212,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                }} />
                {/* Global Cosmic Geometry */}
                <CosmicBackground count={45} />
            </div>

            {/* === NAV === */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 transition-all duration-300
                ${scrolled ? 'py-3 bg-[#050510]/80 backdrop-blur-2xl border-b border-white/[0.05]' : 'py-5 md:py-6'}
            `}>
                <div className="flex items-center gap-3">
                    <AuremLogo className="w-8 h-8 md:w-9 md:h-9" />
                    <span className="text-lg md:text-xl font-black tracking-tighter text-cosmic">
                        AUREM
                    </span>
                </div>
                <div className="hidden md:flex items-center gap-10">
                    <a href="#features" className="text-[13px] text-white/40 hover:text-white transition-colors font-medium">Features</a>
                    <a href="#loop" className="text-[13px] text-white/40 hover:text-white transition-colors font-medium">Mastery Loop</a>
                    <a href="#comparison" className="text-[13px] text-white/40 hover:text-white transition-colors font-medium">Comparison</a>
                    <a href="#reviews" className="text-[13px] text-white/40 hover:text-white transition-colors font-medium">Results</a>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onGetStarted} className="holographic-border px-5 py-2 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white bg-[#0a0515] rounded-2xl hover:-translate-y-0.5 transition-all">
                        Get Started
                    </button>
                </div>
            </nav>

            {/* === HERO === */}
            <section ref={heroRef} className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-32 pb-20 relative z-10 w-full overflow-hidden">
                <NeuralCore />

                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/5 animate-scale-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[9px] md:text-[10px] font-black tracking-[0.25em] text-cyan-300 uppercase">The Evolution of Intelligence</span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tight leading-[1] md:leading-[0.9] mb-6 md:mb-8 max-w-[95vw] md:max-w-none relative z-10">
                    <span className="text-white block opacity-90">Cognitive </span>
                    <span className="text-cosmic">
                        Augmentation.
                    </span>
                </h1>

                <p className="text-base md:text-xl text-white/40 max-w-[90%] md:max-w-2xl px-4 mb-10 md:mb-12 leading-relaxed font-light relative z-10">
                    Aurem transcends note-taking. It is a living neural network that analyzes dependencies in your curriculum and actively repairs your knowledge gaps.
                </p>

                <div className="flex flex-col w-[90%] sm:w-auto sm:flex-row gap-4 md:gap-5 mb-16 md:mb-20 animate-page-enter relative z-20" style={{ animationDelay: '0.2s' }}>
                    <button onClick={onGetStarted} className="holographic-border w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 text-base md:text-lg font-black text-white bg-[#03030b] rounded-3xl hover:-translate-y-1.5 transition-all flex items-center justify-center gap-3">
                        Initialize System
                        <span className="text-xl">→</span>
                    </button>
                </div>

                {/* College Belt */}
                <div className="w-full max-w-7xl mx-auto overflow-hidden relative py-12 md:py-16 mt-10 md:mt-16 border-t border-white/[0.04]">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl md:text-3xl font-black text-white/90">
                            Want to get in here? <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent italic">We will help.</span>
                        </h3>
                    </div>
                    <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-[#03030b] to-transparent z-10" />
                    <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-[#03030b] to-transparent z-10" />
                    <div className="animate-marquee whitespace-nowrap flex items-center">
                        {[...colleges, ...colleges].map((college, i) => (
                            <span key={i} className="mx-10 md:mx-16 text-3xl md:text-5xl font-serif font-black text-white/20 hover:text-white/60 transition-colors cursor-default" style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}>
                                {college}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* === FEATURES GRID === */}
            <section id="features" data-reveal className={`relative z-10 px-6 py-24 max-w-6xl mx-auto transition-all duration-1000 ${visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                <div className="text-center mb-16 px-4">
                    <span className="text-[11px] font-bold tracking-[0.2em] text-indigo-400 uppercase text-glow">Core Platform</span>
                    <h2 className="text-3xl md:text-5xl font-black text-white mt-3 tracking-tight">
                        Everything a student needs.<br className="hidden md:block" />
                        <span className="text-white/40">In one place.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <div key={i}
                            className="glass-panel glass-3d-hover relative p-8 rounded-3xl cursor-default"
                        >
                            <div className={`w-12 h-12 rounded-2xl ${bgColorMap[f.color]} border flex items-center justify-center text-2xl mb-5 relative z-10`}>
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 relative z-10">{f.title}</h3>
                            <p className="text-sm text-white/40 leading-relaxed relative z-10">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* === THE MASTERY LOOP === */}
            <section id="loop" data-reveal className={`relative z-10 px-6 py-24 md:py-32 max-w-7xl mx-auto border-t border-white/[0.04] transition-all duration-1000 ${visibleSections.has('loop') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
                    <div>
                        <span className="text-[11px] font-black tracking-[0.3em] text-indigo-400 uppercase">Proprietary Method</span>
                        <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-white mt-4 mb-6 md:mb-8 leading-[1.1]">
                            The Mastery <br className="hidden md:block" /><span className="text-white/40">Loop.</span>
                        </h2>
                        <p className="text-base md:text-lg text-white/40 mb-8 md:mb-10 leading-relaxed font-light">
                            Traditional study is linear. Aurem is circular. We don't just teach you; we identify exactly why you're struggling and fix it in real-time.
                        </p>

                        <div className="space-y-4 md:space-y-6">
                            {[
                                { title: "Phase 1: Deep Analysis", desc: "Our RAG engine ingests your materials and connects them to a massive knowledge base.", icon: <Brain />, color: "text-blue-400" },
                                { title: "Phase 2: Active Synthesis", desc: "Generation of textbook-level notes, flashcards, and podcasts tailored to your syllabus.", icon: <RefreshCw />, color: "text-indigo-400" },
                                { title: "Phase 3: Adaptive Testing", desc: "Quizzes that probe your edge cases, not just surface-level facts.", icon: <Target />, color: "text-violet-400" },
                                { title: "Phase 4: Remediation", desc: "Aurem calculates your gaps and re-explains missed concepts using different cognitive angles.", icon: <Bot />, color: "text-purple-400" },
                            ].map((step, idx) => (
                                <div key={idx} className="loop-step p-5 md:p-6 rounded-2xl glass-panel flex gap-4 md:gap-5 items-start">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl bg-white/[0.03] flex items-center justify-center ${step.color} border border-white/[0.05]`}>
                                        {step.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1 text-sm md:text-base">{step.title}</h4>
                                        <p className="text-xs md:text-sm text-white/30 leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative mt-12 lg:mt-0 flex justify-center lg:block">
                        <div className="aspect-square w-[280px] md:w-auto md:h-auto rounded-full border border-white/[0.04] flex items-center justify-center p-8 md:p-12 relative animate-spin-slow">
                            {/* Orbital path */}
                            <div className="absolute inset-0 border border-indigo-500/10 rounded-full" />
                            <AuremLogo className="w-24 h-24 md:w-32 md:h-32 absolute animate-none" />

                            {/* Floating nodes */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-3xl blur-2xl opacity-30" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 bg-purple-500 rounded-3xl blur-2xl opacity-30" />
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-indigo-500 rounded-3xl blur-2xl opacity-30" />
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-violet-500 rounded-3xl blur-2xl opacity-30" />
                        </div>

                        {/* Summary glass card */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-64 p-6 md:p-8 glass-panel-heavy rounded-3xl md:rounded-[40px] text-center shadow-2xl">
                            <h3 className="text-xl md:text-2xl font-black mb-1 md:mb-2 tracking-tighter italic text-glow">98%</h3>
                            <p className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Mastery Conversion</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* === COMPARISON === */}
            <section id="comparison" data-reveal className={`relative z-10 px-4 py-24 md:py-32 max-w-5xl mx-auto transition-all duration-1000 ${visibleSections.has('comparison') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                <div className="text-center mb-12 md:mb-20 px-4">
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                        How We <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent italic leading-relaxed">Dominate.</span>
                    </h2>
                </div>

                <div className="glass-panel rounded-3xl md:rounded-[40px] shadow-2xl shadow-indigo-500/10 mobile-overflow-x p-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
                    <table className="w-full min-w-[600px] relative z-10">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="p-4 md:p-8 text-left text-[10px] md:text-xs font-black text-white/30 uppercase tracking-widest">Capabilities</th>
                                <th className="p-4 md:p-8 text-center text-xs md:text-sm font-black text-indigo-400 italic">AUREM ELITE</th>
                                <th className="p-4 md:p-8 text-center text-[10px] md:text-xs font-black text-white/20 uppercase tracking-widest">THE OTHERS</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium">
                            {[
                                { feat: "Notes Quality", aurem: "2000+ Word Textbook Level", others: "Point-form Summaries" },
                                { feat: "Intelligence", aurem: "Citations & Multi-Modal", others: "Prompting LLMs" },
                                { feat: "Methodology", aurem: "The Mastery Loop™", others: "Linear Static Practice" },
                                { feat: "Reliability", aurem: "Zero Hallucination Target", others: "Frequent Confabulations" },
                                { feat: "Offline Use", aurem: "High-Fidelity Podcasts", others: "App Only" }
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4 md:p-8 text-xs md:text-sm text-white/60">{row.feat}</td>
                                    <td className="p-4 md:p-8 text-center text-xs md:text-sm font-bold text-white italic">{row.aurem}</td>
                                    <td className="p-4 md:p-8 text-center text-xs text-white/20">{row.others}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* === STUDENT SUCCESS / REVIEWS (MOVING GLASS BELT) === */}
            <section id="reviews" className="relative z-10 py-24 md:py-32 overflow-hidden px-4">
                <div className="max-w-7xl mx-auto md:px-6 relative z-10 border-t border-white/[0.04] pt-24">
                    <div className="text-center mb-16 md:mb-20 px-4">
                        <span className="text-[9px] md:text-[11px] font-black tracking-[0.3em] text-[#00d4ff] uppercase">Student Success</span>
                        <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-white mt-4 mb-3 tracking-tighter">
                            The Proof
                        </h2>
                        <p className="text-white/30 text-sm md:text-lg font-light max-w-md mx-auto">See how self-taught students replaced expensive tutors with 2000+ word AI study guides.</p>
                    </div>

                    {/* Infinite Scrolling Glass Belt */}
                    <div className="relative w-full overflow-hidden p-4">
                        <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-[#03030b] to-transparent z-20 pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-[#03030b] to-transparent z-20 pointer-events-none" />

                        <div className="flex animate-marquee-fast hover:pause gap-6 md:gap-8 w-max">
                            {[...reviews, ...reviews].map((rev, i) => (
                                <div key={i} className="glass-3d-hover review-card glass-panel flex-shrink-0 w-[320px] md:w-[450px] p-8 md:p-10 rounded-3xl md:rounded-[40px] flex flex-col justify-between whitespace-normal relative group">
                                    <div className="space-y-4 md:space-y-6">
                                        <div className="flex gap-1.5">
                                            {[...Array(rev.rating)].map((_, star) => (
                                                <Star key={star} className="w-4 h-4 md:w-5 md:h-5 fill-[#ff007f] text-[#ff007f]" />
                                            ))}
                                        </div>
                                        <p className="text-base md:text-lg font-bold leading-relaxed text-white italic">
                                            "{rev.text}"
                                        </p>
                                    </div>
                                    <div className="mt-8 md:mt-10 flex items-center gap-4 md:gap-5 pt-6 md:pt-8 border-t border-white/5">
                                        <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full bg-gradient-to-br from-[#7928ca] to-[#00d4ff] flex items-center justify-center text-lg md:text-xl font-bold">
                                            {rev.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-black text-white text-sm md:text-base">{rev.name}</div>
                                            <div className="text-[10px] md:text-xs font-black text-[#00d4ff] uppercase tracking-widest">{rev.college}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* === FINAL CTA === */}
            <section className="relative z-10 px-6 py-28 md:py-40 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 md:mb-10 opacity-30">
                        <AuremLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto" />
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 md:mb-10 leading-[1.1]">
                        The gap stops <span className="text-white/20 italic">here.</span>
                    </h2>
                    <button
                        onClick={onGetStarted}
                        className="holographic-border group px-10 py-5 md:px-14 md:py-6 text-lg md:text-xl font-black text-white bg-[#03030b] rounded-3xl md:rounded-[32px] hover:-translate-y-2 transition-all relative z-10"
                    >
                        Secure My Early Access
                        <span className="ml-3 group-hover:translate-x-2 transition-transform inline-block">→</span>
                    </button>
                    <p className="mt-8 md:mt-10 text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Curated Intelligence for World-Class Results</p>
                </div>
            </section>

            {/* === FOOTER === */}
            <footer className="relative z-10 px-6 py-10 md:py-12 border-t border-white/[0.04]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
                    <div className="flex items-center gap-3 md:gap-4">
                        <AuremLogo className="w-6 h-6 md:w-8 md:h-8 opacity-40" />
                        <span className="text-xs md:text-sm font-black text-white/30 tracking-widest uppercase italic">Aurem v2.0 Elite</span>
                    </div>
                    <div className="flex gap-6 md:gap-10 text-[9px] md:text-[11px] font-bold text-white/20 uppercase tracking-widest">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Security</a>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest">Global Node Hub: Active</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPageV2;
