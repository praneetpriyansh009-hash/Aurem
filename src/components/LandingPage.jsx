import React, { useEffect, useRef, useState } from 'react';
import './LandingPage.css';

const LandingPage = ({ onNavigate }) => {
    const [scrolled, setScrolled] = useState(false);
    const [activeExam, setActiveExam] = useState('jee-main');

    useEffect(() => {
        // Scroll reveal
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('lp-visible'), 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

        document.querySelectorAll('.lp-reveal').forEach(el => observer.observe(el));

        // Nav scroll effect
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);

        // Progress bar animation
        document.querySelectorAll('.lp-progress-fill').forEach(fill => {
            const w = fill.style.width;
            fill.style.width = '0%';
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => { entry.target.style.width = w; }, 300);
                        obs.unobserve(entry.target);
                    }
                });
            });
            obs.observe(fill);
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
        };
    }, []);

    const handleGetStarted = () => onNavigate('login');

    const exams = [
        { id: 'jee-main', emoji: '🇮🇳', name: 'JEE Main' },
        { id: 'jee-adv', emoji: '⚗️', name: 'JEE Advanced' },
        { id: 'neet', emoji: '🧬', name: 'NEET' },
        { id: 'sat', emoji: '🇺🇸', name: 'SAT' },
        { id: 'act', emoji: '📐', name: 'ACT' },
        { id: 'ielts', emoji: '🌏', name: 'IELTS' },
        { id: 'toefl', emoji: '🎓', name: 'TOEFL' },
        { id: 'upsc', emoji: '⚖️', name: 'UPSC' },
        { id: 'gre', emoji: '📊', name: 'GRE' },
        { id: 'gmat', emoji: '💼', name: 'GMAT' },
        { id: 'aps', emoji: '🏫', name: 'APS' },
        { id: 'cuet', emoji: '📚', name: 'CUET' },
    ];

    const marqueeExams = [
        ...exams,
        { id: 'igcse', emoji: '🌍', name: 'IGCSE' },
        { id: 'ib', emoji: '📗', name: 'IB' },
        { id: 'a-levels', emoji: '🇬🇧', name: 'A-Levels' },
        { id: 'ap', emoji: '🎯', name: 'AP' },
    ];

    return (
        <div className="lp-page">

            {/* NAV */}
            <nav className={`lp-nav ${scrolled ? 'lp-scrolled' : ''}`}>
                <div className="lp-nav-logo">AUREM</div>
                <ul className="lp-nav-links">
                    <li><a href="#features">Features</a></li>
                    <li><a href="#lens">AUREM Lens</a></li>
                    <li><a href="#exams">Exam Hub</a></li>
                    <li><a href="#how">How it works</a></li>
                </ul>
                <div className="lp-nav-cta">
                    <button className="lp-btn-primary" onClick={handleGetStarted}>Get Started →</button>
                </div>
            </nav>

            {/* HERO */}
            <section className="lp-hero">

                {/* Floating cards */}
                {/* Floating cards commented out to debug
                <div className="lp-floating-card lp-floating-card-1">
                    <div className="lp-fc-icon">🧠</div>
                    <div className="lp-fc-val">72%</div>
                    <div className="lp-fc-label">Mastery score</div>
                </div>
                <div className="lp-floating-card lp-floating-card-2">
                    <div className="lp-fc-icon">🔁</div>
                    <div className="lp-fc-val">Loop 2/3</div>
                    <div className="lp-fc-label">Remediation active</div>
                </div>
                */}

                <div className="lp-hero-badge">
                    <div className="lp-badge-dot"></div>
                    RAG-Powered · Hallucination-Resistant
                </div>

                <h1 className="lp-hero-title" style={{ color: 'white', fontSize: '64px', fontWeight: 800, zIndex: 9999, position: 'relative', opacity: 1, display: 'block', textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                    <span className="lp-word-1">Learn Smarter.</span><br />
                    <span className="lp-word-2">Master Everything.</span>
                </h1>

                <p className="lp-hero-subtitle-italic">Education that never gives up on you.</p>

                <p className="lp-hero-desc">
                    AUREM is an AI ecosystem built for grades 9–12 and competitive exam aspirants. RAG-grounded, curriculum-aware, and designed to close every knowledge gap — not just answer questions.
                </p>

                <div className="lp-hero-actions">
                    <button className="lp-btn-hero lp-btn-hero-primary" onClick={handleGetStarted}>
                        Get Started →
                    </button>
                </div>

                <div className="lp-hero-stats glass-3d perspective-1000">
                    <div className="lp-stat translate-z-20">
                        <div className="lp-stat-num">9–12</div>
                        <div className="lp-stat-label">Grades covered</div>
                    </div>
                    <div className="lp-stat translate-z-20">
                        <div className="lp-stat-num">12+</div>
                        <div className="lp-stat-label">Competitive exams</div>
                    </div>
                    <div className="lp-stat translate-z-20">
                        <div className="lp-stat-num">0%</div>
                        <div className="lp-stat-label">Hallucination target</div>
                    </div>
                    <div className="lp-stat translate-z-20">
                        <div className="lp-stat-num">∞</div>
                        <div className="lp-stat-label">Mastery loops</div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <div className="lp-full-divider"></div>
            <section className="lp-section" id="features">
                <span className="lp-section-tag lp-reveal">Core Platform</span>
                <h2 className="lp-section-title lp-reveal">Everything a student needs.<br />In one place.</h2>
                <p className="lp-section-desc lp-reveal">Not another fragmented EdTech tool. AUREM unifies every aspect of secondary education into a single, intelligent ecosystem.</p>

                <div className="lp-features-grid lp-reveal perspective-2000">
                    <div className="lp-card-3d">
                        <div className="lp-feature-icon lp-icon-purple translate-z-50">🧪</div>
                        <div className="lp-feature-title translate-z-20">RAG Academic Chat</div>
                        <div className="lp-feature-desc translate-z-10">Ask any academic question. Answers grounded in your official syllabus — never hallucinated, always curriculum-aligned.</div>
                    </div>
                    <div className="lp-card-3d">
                        <div className="lp-feature-icon lp-icon-blue translate-z-50">🎥</div>
                        <div className="lp-feature-title translate-z-20">AUREM Lens</div>
                        <div className="lp-feature-desc translate-z-10">Drop any YouTube URL. Get instant notes, summaries, flashcards, mind maps, quizzes — and a mastery loop that won't stop until you get it.</div>
                    </div>
                    <div className="lp-card-3d">
                        <div className="lp-feature-icon lp-icon-green translate-z-50">🎯</div>
                        <div className="lp-feature-title translate-z-20">Adaptive Assessments</div>
                        <div className="lp-feature-desc translate-z-10">Diagnostic quizzes that pinpoint exactly what you don't know — then generate a remediation plan targeting only those gaps.</div>
                    </div>
                    <div className="lp-card-3d">
                        <div className="lp-feature-icon lp-icon-yellow translate-z-50">🏆</div>
                        <div className="lp-feature-title translate-z-20">Competitive Exam Hub</div>
                        <div className="lp-feature-desc translate-z-10">Personalized dashboards for JEE, NEET, SAT, ACT, IELTS, UPSC and more. Daily study plans, mock tests, AI explainer videos.</div>
                    </div>
                    <div className="lp-card-3d">
                        <div className="lp-feature-icon lp-icon-pink translate-z-50">🎙️</div>
                        <div className="lp-feature-title translate-z-20">AI Podcast Learning</div>
                        <div className="lp-feature-desc translate-z-10">Every topic as a dual-voice podcast conversation. Study while commuting. Learn with your ears, not just your eyes.</div>
                    </div>
                    <div className="lp-card-3d">
                        <div className="lp-feature-icon lp-icon-orange translate-z-50">🏫</div>
                        <div className="lp-feature-title translate-z-20">School Network</div>
                        <div className="lp-feature-desc translate-z-10">Connects students, teachers, and parents in one loop. Conceptual-gated homework help. Real-time progress for educators.</div>
                    </div>
                </div>
            </section>

            {/* AUREM LENS DEMO */}
            <div className="lp-full-divider"></div>
            <section className="lp-lens-section" id="lens">
                <span className="lp-section-tag lp-reveal">AUREM Lens</span>
                <h2 className="lp-section-title lp-reveal">Any YouTube video.<br />Complete mastery.</h2>
                <p className="lp-section-desc lp-reveal">Paste a link. Get a full study ecosystem in seconds. The mastery loop keeps going until you've actually learned the topic.</p>

                <div className="lp-lens-demo lp-reveal">
                    <div className="lp-lens-topbar">
                        <div className="lp-traffic-lights">
                            <div className="lp-tl lp-tl-r"></div>
                            <div className="lp-tl lp-tl-y"></div>
                            <div className="lp-tl lp-tl-g"></div>
                        </div>
                        <div className="lp-url-bar">
                            <div className="lp-url-dot"></div>
                            youtube.com/watch?v=dQw4w9WgXcQ · Newton's Laws of Motion — 10th Grade Physics
                        </div>
                    </div>
                    <div className="lp-lens-content">
                        <div className="lp-lens-sidebar">
                            <div className="lp-sidebar-item lp-active">📄 &nbsp;Notes</div>
                            <div className="lp-sidebar-item">📝 &nbsp;Summary</div>
                            <div className="lp-sidebar-item">🃏 &nbsp;Flashcards</div>
                            <div className="lp-sidebar-item">🗺️ &nbsp;Mind Map</div>
                            <div className="lp-sidebar-item">🧪 &nbsp;Quiz</div>
                            <div className="lp-sidebar-item" style={{ color: 'var(--lp-pink)', marginTop: '8px' }}>🔁 &nbsp;Mastery Loop</div>
                        </div>
                        <div className="lp-lens-main">
                            <div className="lp-note-block">
                                <div className="lp-note-h1">Newton's Three Laws of Motion</div>
                                <div className="lp-note-p">Newton's laws describe the relationship between forces and the motion of objects. They form the foundation of classical mechanics and apply to all everyday physical phenomena.</div>
                                <div className="lp-note-formula">F = ma &nbsp;|&nbsp; Every action has an equal and opposite reaction</div>
                            </div>
                            <div className="lp-note-block" style={{ borderLeftColor: 'var(--lp-accent3)' }}>
                                <div className="lp-note-h1">First Law — Law of Inertia</div>
                                <div className="lp-note-p">An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by a net external force.</div>
                            </div>
                            <div className="lp-mastery-indicator">
                                <span>🔁 Mastery Loop Active — Loop 1 of 3</span>
                                <div className="lp-mastery-bar-wrap">
                                    <div className="lp-mastery-bar-fill"></div>
                                </div>
                                <span style={{ color: 'var(--lp-text2)', fontWeight: 400 }}>72%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MASTERY LOOP SECTION */}
            <section className="lp-mastery-section">
                <div className="lp-mastery-inner">
                    <div>
                        <span className="lp-section-tag">The Mastery Loop</span>
                        <h2 className="lp-section-title lp-reveal">Won't stop until<br />
                            <span style={{ background: 'linear-gradient(135deg, #f472b6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                you actually get it.
                            </span>
                        </h2>
                        <p className="lp-section-desc lp-reveal" style={{ marginBottom: '32px' }}>
                            Score below 60% on a quiz? AUREM doesn't just move on. It identifies exactly what you missed, generates targeted notes and flashcards for those weak points, then quizzes you again. And again. Until it's done.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '32px' }} className="lp-reveal">
                            <div className="lp-mastery-step">
                                <div className="lp-mastery-step-num" style={{ background: 'rgba(108,99,255,0.2)' }}>1</div>
                                <div>
                                    <div className="lp-mastery-step-title">Take the quiz</div>
                                    <div className="lp-mastery-step-desc">10 AI-generated questions covering the video content</div>
                                </div>
                            </div>
                            <div className="lp-mastery-step">
                                <div className="lp-mastery-step-num" style={{ background: 'rgba(251,191,36,0.2)', color: 'var(--lp-yellow)' }}>2</div>
                                <div>
                                    <div className="lp-mastery-step-title">Gaps are identified</div>
                                    <div className="lp-mastery-step-desc">AI pinpoints exactly which concepts you missed</div>
                                </div>
                            </div>
                            <div className="lp-mastery-step">
                                <div className="lp-mastery-step-num" style={{ background: 'rgba(244,114,182,0.2)', color: 'var(--lp-pink)' }}>3</div>
                                <div>
                                    <div className="lp-mastery-step-title">Targeted remediation</div>
                                    <div className="lp-mastery-step-desc">Fresh notes, flashcards, and mind map for weak areas only</div>
                                </div>
                            </div>
                            <div className="lp-mastery-step">
                                <div className="lp-mastery-step-num" style={{ background: 'rgba(52,211,153,0.2)', color: 'var(--lp-green)' }}>✓</div>
                                <div>
                                    <div className="lp-mastery-step-title" style={{ color: 'var(--lp-green)' }}>Topic mastered</div>
                                    <div className="lp-mastery-step-desc">Score 60%+ to unlock the next topic. No shortcuts.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="lp-mastery-loop-viz lp-3d-ring-container">
                        <div className="lp-3d-ring"></div>
                        <div className="lp-loop-center glass-3d depth-glow translate-z-50">
                            <div style={{ fontSize: '28px' }} className="translate-z-20">🧠</div>
                            <div className="lp-loop-center-text translate-z-20">MASTERY</div>
                        </div>
                        <div className="lp-loop-node lp-node-quiz glass-3d translate-z-20"><span>🧪</span><span>Quiz</span></div>
                        <div className="lp-loop-node lp-node-score glass-3d translate-z-20"><span>📊</span><span>Score</span></div>
                        <div className="lp-loop-node lp-node-remed glass-3d translate-z-20"><span>🔁</span><span>Remediate</span></div>
                        <div className="lp-loop-node lp-node-flash glass-3d translate-z-20"><span>🃏</span><span>Flashcards</span></div>
                    </div>
                </div>
            </section>

            {/* EXAM HUB SHOWCASE */}
            <section className="lp-section" id="exams">
                <span className="lp-section-tag lp-reveal">Competitive Exam Hub</span>
                <h2 className="lp-section-title lp-reveal">Your exam. Your dashboard.<br />Your plan.</h2>
                <p className="lp-section-desc lp-reveal">Select your target exam and get a personalized syllabus, daily study queue, video lessons, AI podcasts, and mock tests — all in one place.</p>

                <div className="lp-exam-scroll lp-reveal">
                    {exams.map(exam => (
                        <div
                            key={exam.id}
                            className={`lp-exam-pill ${activeExam === exam.id ? 'lp-active' : ''}`}
                            onClick={() => setActiveExam(exam.id)}
                        >
                            <span className="lp-exam-emoji">{exam.emoji}</span> {exam.name}
                        </div>
                    ))}
                </div>

                <div className="lp-exam-dashboard lp-reveal">
                    <div className="lp-dash-header">
                        <div className="lp-dash-title">
                            🇮🇳 JEE Main Dashboard
                            <div className="lp-dash-badge">Active</div>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--lp-text3)' }}>Exam in 87 days · 4h/day</div>
                    </div>
                    <div className="lp-dash-body">
                        <div className="lp-dash-panel">
                            <div className="lp-dash-panel-label">📚 Syllabus Progress</div>
                            <div className="lp-topic-row"><span>Mechanics</span><div className="lp-topic-status lp-s-green"></div></div>
                            <div style={{ marginTop: '4px', marginBottom: '12px' }}>
                                <div className="lp-progress-bar"><div className="lp-progress-fill" style={{ width: '85%' }}></div></div>
                            </div>
                            <div className="lp-topic-row"><span>Thermodynamics</span><div className="lp-topic-status lp-s-yellow"></div></div>
                            <div style={{ marginTop: '4px', marginBottom: '12px' }}>
                                <div className="lp-progress-bar"><div className="lp-progress-fill" style={{ width: '42%' }}></div></div>
                            </div>
                            <div className="lp-topic-row"><span>Electrostatics</span><div className="lp-topic-status lp-s-grey"></div></div>
                            <div style={{ marginTop: '4px' }}>
                                <div className="lp-progress-bar"><div className="lp-progress-fill" style={{ width: '8%' }}></div></div>
                            </div>
                        </div>
                        <div className="lp-dash-panel">
                            <div className="lp-dash-panel-label">🗓️ Today's Queue</div>
                            <div className="lp-topic-row" style={{ padding: '10px 0' }}>
                                <span style={{ color: 'var(--lp-text)' }}>Work-Energy Theorem</span>
                                <span style={{ fontSize: '11px', background: 'rgba(52,211,153,0.15)', color: 'var(--lp-green)', padding: '3px 8px', borderRadius: '999px' }}>Video ready</span>
                            </div>
                            <div className="lp-topic-row" style={{ padding: '10px 0' }}>
                                <span>Calorimetry</span>
                                <span style={{ fontSize: '11px', background: 'rgba(251,191,36,0.15)', color: 'var(--lp-yellow)', padding: '3px 8px', borderRadius: '999px' }}>Podcast</span>
                            </div>
                            <div className="lp-topic-row" style={{ padding: '10px 0' }}>
                                <span>Coulomb's Law</span>
                                <span style={{ fontSize: '11px', background: 'rgba(108,99,255,0.15)', color: 'var(--lp-accent2)', padding: '3px 8px', borderRadius: '999px' }}>New topic</span>
                            </div>
                        </div>
                        <div className="lp-dash-panel">
                            <div className="lp-dash-panel-label">📈 Mock Test History</div>
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--lp-text2)', marginBottom: '6px' }}><span>Test #4</span><span style={{ color: 'var(--lp-green)' }}>148/300</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--lp-text2)', marginBottom: '6px' }}><span>Test #3</span><span style={{ color: 'var(--lp-yellow)' }}>132/300</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--lp-text2)', marginBottom: '6px' }}><span>Test #2</span><span style={{ color: 'var(--lp-text3)' }}>118/300</span></div>
                                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(108,99,255,0.08)', borderRadius: '10px', border: '1px solid rgba(108,99,255,0.2)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--lp-text3)', marginBottom: '4px' }}>AI insight</div>
                                    <div style={{ fontSize: '12px', color: 'var(--lp-text2)' }}>Thermodynamics is your biggest gap — 3 more loop sessions recommended.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="lp-how-section" id="how">
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <span className="lp-section-tag" style={{ display: 'block', textAlign: 'center' }}>How it works</span>
                    <h2 className="lp-section-title lp-reveal" style={{ textAlign: 'center' }}>From video to mastery<br />in four steps.</h2>

                    <div className="lp-steps-grid lp-reveal">
                        <div className="lp-step-card">
                            <div className="lp-step-num">01 —</div>
                            <span className="lp-step-icon-large">🔗</span>
                            <div className="lp-step-title">Paste a YouTube URL</div>
                            <div className="lp-step-desc">Drop any educational video link. AUREM extracts the full transcript instantly.</div>
                            <div className="lp-step-arrow">→</div>
                        </div>
                        <div className="lp-step-card">
                            <div className="lp-step-num">02 —</div>
                            <span className="lp-step-icon-large">⚡</span>
                            <div className="lp-step-title">AI generates everything</div>
                            <div className="lp-step-desc">Notes, summary, flashcards, mind map, and a quiz — all in parallel, in seconds.</div>
                            <div className="lp-step-arrow">→</div>
                        </div>
                        <div className="lp-step-card">
                            <div className="lp-step-num">03 —</div>
                            <span className="lp-step-icon-large">🧪</span>
                            <div className="lp-step-title">Test your knowledge</div>
                            <div className="lp-step-desc">Take the quiz. AUREM identifies exactly which concepts need more work.</div>
                            <div className="lp-step-arrow">→</div>
                        </div>
                        <div className="lp-step-card">
                            <div className="lp-step-num">04 —</div>
                            <span className="lp-step-icon-large">✅</span>
                            <div className="lp-step-title">Loop until mastered</div>
                            <div className="lp-step-desc">Targeted remediation. New quiz. Repeat until you hit 60% — then the topic is yours.</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* EXAMS STRIP */}
            <div className="lp-exams-strip">
                <div className="lp-strip-title">Preparing students for every major exam worldwide</div>
                <div className="lp-exams-marquee-wrap">
                    <div className="lp-exams-marquee">
                        {[...marqueeExams, ...marqueeExams].map((exam, i) => (
                            <div key={i} className="lp-exam-tag">{exam.emoji} {exam.name}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* TESTIMONIALS */}
            <section className="lp-testimonials">
                <span className="lp-section-tag lp-reveal" style={{ textAlign: 'center', display: 'block' }}>Student Stories</span>
                <h2 className="lp-section-title lp-reveal" style={{ textAlign: 'center' }}>What students are saying.</h2>

                <div className="lp-testimonials-grid lp-reveal">
                    {[
                        { text: "The mastery loop changed everything for me. I used to skip topics I didn't understand. Now AUREM just doesn't let me — and my JEE mock scores went from 118 to 196 in 6 weeks.", name: "Rohan Mehta", role: "JEE Aspirant · Delhi", av: "lp-av-1", init: "R" },
                        { text: "I love that I can paste any physics lecture and get flashcards instantly. The podcast feature is insane — I study during my 45-minute bus ride every day now.", name: "Priya Sharma", role: "NEET Aspirant · Pune", av: "lp-av-2", init: "P" },
                        { text: "Finally an AI that doesn't just give me answers and move on. The concept-gated homework feature means I actually have to understand something before I can submit. Annoying at first, brilliant after.", name: "Arjun Nair", role: "Grade 11 · Chennai", av: "lp-av-3", init: "A" },
                        { text: "As a teacher, the school network gives me real insight into where my students are struggling — before the exam. I can intervene weeks earlier than before.", name: "Sunita Verma", role: "Physics Teacher · Jaipur", av: "lp-av-4", init: "S" },
                        { text: "The SAT dashboard is so well designed. It showed me I was losing points specifically in Reading Comprehension inference questions. I didn't even know that was a category.", name: "Meera Iyer", role: "SAT Aspirant · Bangalore", av: "lp-av-5", init: "M" },
                        { text: "I'm in a small town with limited access to coaching. AUREM is literally the only high-quality resource I have for UPSC prep. The AI answers never hallucinate — they're always sourced.", name: "Kiran Patel", role: "UPSC Aspirant · Rajkot", av: "lp-av-6", init: "K" },
                    ].map((t, i) => (
                        <div key={i} className="lp-testimonial-card">
                            <div className="lp-stars">★★★★★</div>
                            <div className="lp-test-text">{t.text}</div>
                            <div className="lp-test-author">
                                <div className={`lp-test-avatar ${t.av}`}>{t.init}</div>
                                <div>
                                    <div className="lp-test-name">{t.name}</div>
                                    <div className="lp-test-role">{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <div className="lp-full-divider"></div>
            <section className="lp-cta-section">
                <h2 className="lp-cta-title lp-reveal">
                    Ready to actually<br />
                    <span style={{ background: 'linear-gradient(135deg, #a78bfa, #6c63ff, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        master your syllabus?
                    </span>
                </h2>
                <p className="lp-cta-sub lp-reveal">Join thousands of students who've stopped guessing and started mastering. Free to start. No credit card.</p>
                <div className="lp-cta-input-wrap lp-reveal">
                    <button className="lp-btn-hero lp-btn-hero-primary" onClick={handleGetStarted} style={{ fontSize: '15px' }}>
                        Get Started — It's Free →
                    </button>
                </div>
                <div className="lp-cta-note lp-reveal">AUREM is free for all students. No credit card required.</div>
            </section>

            {/* FOOTER */}
            <footer className="lp-footer">
                <div>
                    <div className="lp-footer-logo">AUREM</div>
                    <div className="lp-footer-desc">A retrieval-augmented AI ecosystem for secondary education. Built to close the gap between students who have access and those who don't.</div>
                    <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--lp-text3)' }}>By Praneet Priyansh · February 2026</div>
                </div>
                <div>
                    <div className="lp-footer-col-title">Platform</div>
                    <ul className="lp-footer-links">
                        <li><a href="#lens">AUREM Lens</a></li>
                        <li><a href="#exams">Exam Hub</a></li>
                        <li><a href="#features">Academic Chat</a></li>
                        <li><a href="#features">School Network</a></li>
                        <li><a href="#features">Podcasts</a></li>
                    </ul>
                </div>
                <div>
                    <div className="lp-footer-col-title">Exams</div>
                    <ul className="lp-footer-links">
                        <li><a href="#exams">JEE / NEET</a></li>
                        <li><a href="#exams">SAT / ACT</a></li>
                        <li><a href="#exams">IELTS / TOEFL</a></li>
                        <li><a href="#exams">UPSC</a></li>
                        <li><a href="#exams">All exams →</a></li>
                    </ul>
                </div>
                <div>
                    <div className="lp-footer-col-title">Company</div>
                    <ul className="lp-footer-links">
                        <li><a href="#">About</a></li>
                        <li><a href="#">Research paper</a></li>
                        <li><a href="#">Contact</a></li>
                        <li><a href="#">Privacy</a></li>
                    </ul>
                </div>
            </footer>

            <div className="lp-footer-bottom">
                <div>© 2026 AUREM. All rights reserved.</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--lp-green)', boxShadow: '0 0 6px var(--lp-green)' }}></div>
                    All systems operational
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
