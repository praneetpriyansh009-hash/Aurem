import React, { useEffect, useState, useRef } from 'react';

const AuremLogo = ({ className = '' }) => (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer glow ring */}
        <circle cx="60" cy="60" r="56" stroke="url(#logoGrad1)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="60" cy="60" r="48" stroke="url(#logoGrad2)" strokeWidth="0.8" opacity="0.2" />

        {/* Neural network nodes */}
        <circle cx="60" cy="25" r="3" fill="url(#logoGrad1)" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="95" cy="60" r="2.5" fill="#818cf8" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="25" cy="60" r="2.5" fill="#a78bfa" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="95" r="3" fill="url(#logoGrad2)" opacity="0.7">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Neural connections to center */}
        <line x1="60" y1="28" x2="60" y2="42" stroke="url(#logoGrad1)" strokeWidth="1" opacity="0.4" />
        <line x1="92" y1="60" x2="78" y2="60" stroke="#818cf8" strokeWidth="1" opacity="0.3" />
        <line x1="28" y1="60" x2="42" y2="60" stroke="#a78bfa" strokeWidth="1" opacity="0.3" />
        <line x1="60" y1="92" x2="60" y2="78" stroke="url(#logoGrad2)" strokeWidth="1" opacity="0.4" />

        {/* Diagonal connections */}
        <line x1="38" y1="38" x2="48" y2="48" stroke="#c084fc" strokeWidth="0.8" opacity="0.25" />
        <line x1="82" y1="38" x2="72" y2="48" stroke="#818cf8" strokeWidth="0.8" opacity="0.25" />
        <line x1="38" y1="82" x2="48" y2="72" stroke="#a78bfa" strokeWidth="0.8" opacity="0.25" />
        <line x1="82" y1="82" x2="72" y2="72" stroke="#6366f1" strokeWidth="0.8" opacity="0.25" />

        {/* Central "A" letterform — abstract, geometric */}
        <path
            d="M60 38 L44 82 L50 82 L54 70 L66 70 L70 82 L76 82 L60 38Z M57 64 L60 54 L63 64 L57 64Z"
            fill="url(#logoGrad3)"
        />

        {/* Accent dot above A */}
        <circle cx="60" cy="33" r="2" fill="url(#logoGrad1)">
            <animate attributeName="r" values="1.5;2.5;1.5" dur="3s" repeatCount="indefinite" />
        </circle>

        <defs>
            <linearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="logoGrad3" x1="40%" y1="0%" x2="60%" y2="100%">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
        </defs>
    </svg>
);

// Shooting star particle
const ShootingStar = ({ delay, duration, top, left, angle }) => (
    <div
        className="absolute rounded-full"
        style={{
            top: `${top}%`,
            left: `${left}%`,
            width: '2px',
            height: '2px',
            background: '#818cf8',
            boxShadow: '0 0 6px 2px rgba(129,140,248,0.6), -30px 0 20px 1px rgba(129,140,248,0.3), -60px 0 30px 0px rgba(129,140,248,0.1)',
            transform: `rotate(${angle}deg)`,
            animation: `shootingStar ${duration}s ${delay}s ease-in infinite`,
            opacity: 0,
        }}
    />
);

const SplashScreen = ({ onComplete }) => {
    const [phase, setPhase] = useState(0); // 0=enter, 1=logo, 2=text, 3=exit

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 300);
        const t2 = setTimeout(() => setPhase(2), 800);
        const t3 = setTimeout(() => setPhase(3), 2400);
        const t4 = setTimeout(() => onComplete?.(), 3000);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, [onComplete]);

    const stars = [
        { delay: 0.2, duration: 1.5, top: 15, left: 10, angle: 35 },
        { delay: 0.8, duration: 1.2, top: 25, left: 70, angle: 40 },
        { delay: 1.4, duration: 1.8, top: 60, left: 5, angle: 30 },
        { delay: 0.5, duration: 1.3, top: 80, left: 60, angle: 45 },
        { delay: 1.0, duration: 1.6, top: 40, left: 85, angle: 35 },
        { delay: 1.8, duration: 1.4, top: 70, left: 30, angle: 40 },
        { delay: 0.3, duration: 1.7, top: 10, left: 50, angle: 25 },
        { delay: 1.2, duration: 1.1, top: 50, left: 15, angle: 38 },
        { delay: 0.7, duration: 1.5, top: 35, left: 45, angle: 42 },
        { delay: 1.6, duration: 1.3, top: 85, left: 80, angle: 30 },
    ];

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center transition-all duration-700
            ${phase >= 3 ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}
        `}
            style={{ background: 'linear-gradient(145deg, #050510 0%, #0d0d2b 30%, #0a0a1a 60%, #050510 100%)' }}
        >
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[20%] left-[15%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[150px]"
                    style={{ animation: 'float 8s ease-in-out infinite' }} />
                <div className="absolute bottom-[15%] right-[10%] w-[40vw] h-[40vw] bg-violet-600/8 rounded-full blur-[130px]"
                    style={{ animation: 'float 10s ease-in-out infinite', animationDelay: '-3s' }} />
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] bg-purple-600/5 rounded-full blur-[100px]" />
            </div>

            {/* Shooting stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {stars.map((s, i) => <ShootingStar key={i} {...s} />)}
            </div>

            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(129,140,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.5) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative flex flex-col items-center">
                {/* Logo */}
                <div className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
                `}>
                    <div className="relative">
                        <AuremLogo className="w-24 h-24" />
                        {/* Glow behind logo */}
                        <div className="absolute -inset-6 bg-indigo-500/20 rounded-full blur-2xl -z-10"
                            style={{ animation: 'pulse 3s ease-in-out infinite' }} />
                    </div>
                </div>

                {/* Text */}
                <div className={`mt-8 text-center transition-all duration-800 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
                `}>
                    <h1 className="text-5xl font-display font-black tracking-tight">
                        <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">
                            Aurem
                        </span>
                    </h1>
                    <p className="text-white/30 text-xs mt-3 tracking-[0.35em] uppercase font-semibold">
                        Your AI Study Companion
                    </p>
                </div>

                {/* Loading bar */}
                <div className={`mt-10 w-32 h-[2px] rounded-full overflow-hidden transition-all duration-500 delay-500
                    ${phase >= 2 ? 'opacity-100' : 'opacity-0'}
                `}
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"
                        style={{
                            animation: 'loadingBar 2s ease-in-out forwards',
                            width: '0%',
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes shootingStar {
                    0% { transform: rotate(var(--angle, 35deg)) translateX(0); opacity: 0; }
                    5% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { transform: rotate(var(--angle, 35deg)) translateX(300px); opacity: 0; }
                }
                @keyframes loadingBar {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(20px, -30px); }
                }
            `}</style>
        </div>
    );
};

export { AuremLogo };
export default SplashScreen;
