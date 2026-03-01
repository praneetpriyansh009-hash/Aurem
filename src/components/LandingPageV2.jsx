import React, { useEffect, useRef } from 'react';
import './LandingPageV2.css';
import StarryBackground from './StarryBackground';

const features = [
    {
        icon: '🧠',
        name: 'Neural Query',
        tag: 'AI Doubt Solver',
        desc: 'Ask anything — get deep, Socratic answers with step-by-step reasoning. Upload images of problems. Supports vision AI for diagrams and equations.',
        color: 'feature-gold',
    },
    {
        icon: '🔭',
        name: 'Aurem Lens',
        tag: 'Visual AI',
        desc: 'Point your camera at any object, diagram, or text. Aurem Lens instantly identifies and teaches — turning the real world into your classroom.',
        color: 'feature-teal',
    },
    {
        icon: '📋',
        name: 'Quiz & Assessment',
        tag: 'Smart Testing',
        desc: 'Auto-generate quizzes on any topic with adjustable difficulty. Get instant feedback, explanations, and a detailed performance report after every session.',
        color: 'feature-rose',
    },
    {
        icon: '📄',
        name: 'Document Study',
        tag: 'AI Reading',
        desc: 'Upload PDFs or paste text. Aurem reads it, creates flashcards, summaries, and lets you ask questions about your own documents.',
        color: 'feature-indigo',
    },
    {
        icon: '🎙️',
        name: 'Audio Studio',
        tag: 'Voice AI',
        desc: 'Convert any topic into a professional AI-narrated audio lesson. Study hands-free — while commuting, exercising, or resting.',
        color: 'feature-amber',
    },
    {
        icon: '⚔️',
        name: 'Cognitive Colosseum',
        tag: 'Competitive Arena',
        desc: 'Challenge yourself in timed, high-intensity knowledge battles. Competitive quiz arena with live scoring to sharpen speed and recall.',
        color: 'feature-purple',
    },
    {
        icon: '🎯',
        name: 'Competitive Prep',
        tag: 'Exam Prep',
        desc: 'Targeted preparation for JEE, NEET, UPSC, IELTS, CAT, and more. Curated mock tests, strategies, and performance analytics.',
        color: 'feature-green',
    },
    {
        icon: '🏛️',
        name: 'Admissions Pilot',
        tag: 'College Compass',
        desc: 'Navigate college admissions with AI. Get personalized recommendations, essay feedback, timeline planning, and interview preparation.',
        color: 'feature-sky',
    },
];

const stats = [
    { num: '10+', label: 'AI Features' },
    { num: '∞', label: 'Subjects Covered' },
    { num: '100%', label: 'Personalized' },
    { num: '24/7', label: 'Available' },
];

const testimonials = [
    {
        quote: "Neural Query feels like having a private tutor at 2 AM. It walks me through problems without just giving me the answer.",
        name: "Aarav S.",
        role: "JEE Aspirant",
        init: "A",
    },
    {
        quote: "I uploaded my entire textbook PDF and Aurem turned it into flashcards and a quiz in minutes. Genuinely magical.",
        name: "Priya K.",
        role: "MBBS Student",
        init: "P",
    },
    {
        quote: "The Audio Studio changed everything for me. I commute 2 hours daily — now it's all study time.",
        name: "James O.",
        role: "Working Professional",
        init: "J",
    },
];

const LandingPageV2 = ({ onGetStarted }) => {
    const rootRef = useRef(null);

    useEffect(() => {
        // Scroll reveal
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.opacity = 1;
                    e.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        const revealEls = document.querySelectorAll('.lp-reveal');
        revealEls.forEach(el => {
            el.style.opacity = 0;
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            io.observe(el);
        });

        return () => io.disconnect();
    }, []);

    return (
        <div ref={rootRef} className="lp-root" style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            <StarryBackground density={80} speed={0.4} connectDistance={120} />

            {/* ── NAV ── */}
            <nav className="lp-nav">
                <div className="lp-logo"><span>✦</span> Aurem</div>
                <ul className="lp-nav-links">
                    <li><a href="#features">Features</a></li>
                    <li><a href="#how">How It Works</a></li>
                    <li><a href="#testimonials">Stories</a></li>
                </ul>
                <button className="lp-nav-pill" onClick={onGetStarted}>Get Started Free</button>
            </nav>

            {/* ── HERO ── */}
            <section className="lp-hero">
                <div className="lp-hero-orb orb1" />
                <div className="lp-hero-orb orb2" />
                <div className="lp-hero-orb orb3" />

                <div className="lp-hero-left">
                    <p className="lp-eyebrow">Your AI-Powered Study Companion</p>
                    <h1>Study smarter.<br />Learn <em>deeper.</em><br />Achieve more.</h1>
                    <p className="lp-hero-sub">
                        Aurem is an all-in-one AI learning platform with 10+ intelligent tools — from instant doubt solving to vision AI, audio lessons, competitive prep, and personalized assessments.
                    </p>
                    <div className="lp-hero-actions">
                        <button className="lp-btn-dark" onClick={onGetStarted}>Start Learning Free</button>
                        <a href="#features" className="lp-btn-text-link">Explore Features</a>
                    </div>
                    <div className="lp-trust-strip">
                        {stats.map((s, i) => (
                            <React.Fragment key={i}>
                                <div className="lp-trust-item">
                                    <div className="lp-trust-num">{s.num}</div>
                                    <div className="lp-trust-label">{s.label}</div>
                                </div>
                                {i < stats.length - 1 && <div className="lp-trust-divider" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="lp-hero-right">
                    <div className="lp-hero-ui-preview">
                        <div className="lp-ui-card">
                            <div className="lp-ui-card-header">
                                <div className="lp-ui-status-dot" />
                                <span>Neural Query · Active</span>
                            </div>
                            <div className="lp-ui-chat-bubble lp-bubble-ai">
                                <span className="lp-bubble-icon">✦</span>
                                <p>Explain Newton's third law with an example from daily life.</p>
                            </div>
                            <div className="lp-ui-chat-bubble lp-bubble-user">
                                <p>For every action, there is an equal and opposite reaction...</p>
                            </div>
                            <div className="lp-ui-chat-bubble lp-bubble-ai">
                                <span className="lp-bubble-icon">✦</span>
                                <p>Exactly! When you push against a wall, the wall pushes back with the same force. This is why rockets work — exhaust gas pushed out creates thrust upward.</p>
                            </div>
                            <div className="lp-ui-input-row">
                                <div className="lp-ui-input-pill">Ask anything...</div>
                                <div className="lp-ui-send-btn">→</div>
                            </div>
                        </div>
                        <div className="lp-floating-badge">🔭 Aurem Lens <strong>Active</strong></div>
                        <div className="lp-floating-badge2">📋 Quiz Ready <strong>8 Qs</strong></div>
                    </div>
                </div>
            </section>

            {/* ── MARQUEE ── */}
            <div className="lp-marquee-strip">
                <div className="lp-marquee-track">
                    {['Neural Query', 'Aurem Lens', 'Quiz & Assessment', 'Document Study', 'Audio Studio', 'Cognitive Colosseum', 'Competitive Prep', 'Admissions Pilot', 'Adaptive Testing', 'Visual Studio',
                        'Neural Query', 'Aurem Lens', 'Quiz & Assessment', 'Document Study', 'Audio Studio', 'Cognitive Colosseum', 'Competitive Prep', 'Admissions Pilot', 'Adaptive Testing', 'Visual Studio'
                    ].map((item, i) => (
                        <React.Fragment key={i}>
                            <span>{item}</span>
                            <span className="lp-marquee-dot">✦</span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ── FEATURES ── */}
            <section id="features" className="lp-features-section">
                <div className="lp-section-header lp-reveal">
                    <p className="lp-kicker-center">Everything You Need</p>
                    <h2>10+ AI Tools. <em>One Platform.</em></h2>
                    <p className="lp-section-sub">Every tool is built to think, adapt, and teach — not just answer.</p>
                </div>
                <div className="lp-features-grid">
                    {features.map((f, i) => (
                        <div key={f.name} className={`lp-feature-card lp-reveal ${f.color}`} style={{ transitionDelay: `${i * 60}ms` }}>
                            <div className="lp-feature-icon-wrap">
                                <span className="lp-feature-icon">{f.icon}</span>
                            </div>
                            <div className="lp-feature-tag">{f.tag}</div>
                            <h3 className="lp-feature-name">{f.name}</h3>
                            <p className="lp-feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Extra features row */}
                <div className="lp-extra-features lp-reveal">
                    <div className="lp-extra-item">
                        <span>🧩</span>
                        <div>
                            <strong>Adaptive Testing</strong>
                            <p>Tests that adjust difficulty in real-time based on your performance.</p>
                        </div>
                    </div>
                    <div className="lp-extra-item">
                        <span>🎨</span>
                        <div>
                            <strong>Visual Studio</strong>
                            <p>Generate educational diagrams, mind maps, and visual summaries with AI.</p>
                        </div>
                    </div>
                    <div className="lp-extra-item">
                        <span>🔁</span>
                        <div>
                            <strong>Learn Loop</strong>
                            <p>Spaced repetition engine that schedules reviews at the optimal moment for retention.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how" className="lp-how-section">
                <div className="lp-section-header lp-reveal">
                    <p className="lp-kicker-center">How It Works</p>
                    <h2>Three steps to <em>mastery.</em></h2>
                </div>
                <div className="lp-steps-row">
                    <div className="lp-step lp-reveal">
                        <div className="lp-step-num">01</div>
                        <h4>Sign in with Google</h4>
                        <p>One click and you're inside. No setup, no credit card, no friction.</p>
                    </div>
                    <div className="lp-step-arrow">→</div>
                    <div className="lp-step lp-reveal" style={{ transitionDelay: '100ms' }}>
                        <div className="lp-step-num">02</div>
                        <h4>Choose your tool</h4>
                        <p>Pick from 10+ AI features — ask a doubt, take a quiz, upload a PDF, or start an audio lesson.</p>
                    </div>
                    <div className="lp-step-arrow">→</div>
                    <div className="lp-step lp-reveal" style={{ transitionDelay: '200ms' }}>
                        <div className="lp-step-num">03</div>
                        <h4>Learn deeply</h4>
                        <p>Aurem adapts to your pace, tracks your progress, and helps you build lasting understanding.</p>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section id="testimonials" className="lp-testimonial">
                <div className="lp-testimonial-header lp-reveal">
                    <h2>What learners say</h2>
                </div>
                <div className="lp-testimonial-grid">
                    {testimonials.map((t, i) => (
                        <div key={i} className="lp-t-card lp-reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                            <span className="lp-t-quote-mark">"</span>
                            <p className="lp-t-quote">{t.quote}</p>
                            <div className="lp-t-author">
                                <div className="lp-t-author-pic">{t.init}</div>
                                <div>
                                    <div className="lp-t-author-name">{t.name}</div>
                                    <div className="lp-t-author-role">{t.role}</div>
                                </div>
                            </div>
                            <div className="lp-t-rating">★★★★★</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="lp-cta-section">
                <div className="lp-cta-left">
                    <h2>Your smartest study session<br />starts <em>right now.</em></h2>
                    <p>Free to use. No credit card. Powered by cutting-edge AI, designed for serious learners.</p>
                    <div className="lp-cta-btns">
                        <button className="lp-btn-dark" onClick={onGetStarted}>Begin for Free</button>
                    </div>
                </div>
                <div className="lp-cta-right">
                    <div className="lp-cta-feature lp-reveal">
                        <span className="lp-cta-feature-icon">✦</span>
                        <div className="lp-cta-feature-text"><strong>Neural Query</strong>Instant AI doubt solving with vision support</div>
                    </div>
                    <div className="lp-cta-feature lp-reveal" style={{ transitionDelay: '60ms' }}>
                        <span className="lp-cta-feature-icon">📋</span>
                        <div className="lp-cta-feature-text"><strong>Auto Quiz Generation</strong>Any topic, any difficulty, instant feedback</div>
                    </div>
                    <div className="lp-cta-feature lp-reveal" style={{ transitionDelay: '120ms' }}>
                        <span className="lp-cta-feature-icon">🎙️</span>
                        <div className="lp-cta-feature-text"><strong>Audio Lessons</strong>Convert any topic into podcast-style audio</div>
                    </div>
                    <div className="lp-cta-feature lp-reveal" style={{ transitionDelay: '180ms' }}>
                        <span className="lp-cta-feature-icon">🔒</span>
                        <div className="lp-cta-feature-text"><strong>Ad-Free & Private</strong>Pure focus, zero distractions</div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="lp-footer">
                <div className="lp-footer-logo">✦ Aurem</div>
                <p>© 2026 Aurem — The AI Study Companion. Crafted with care.</p>
                <p>Privacy · Terms · Support</p>
            </footer>

        </div>
    );
};

export default LandingPageV2;
