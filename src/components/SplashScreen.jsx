import React, { useEffect, useState, useRef } from 'react';
import StarryBackground from './StarryBackground';

const AuremLogo = ({ className = '' }) => (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer glow ring */}
        <circle cx="60" cy="60" r="56" stroke="url(#logoGrad1)" strokeWidth="1.5" opacity="0.3" />
        <circle cx="60" cy="60" r="48" stroke="url(#logoGrad2)" strokeWidth="0.8" opacity="0.2" />

        {/* Accent nodes */}
        <circle cx="60" cy="25" r="3" fill="url(#logoGrad1)" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="95" cy="60" r="2.5" fill="var(--theme-primary-hex, #c9a55a)" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="25" cy="60" r="2.5" fill="var(--theme-secondary-hex, #e0c07a)" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="95" r="3" fill="url(#logoGrad2)" opacity="0.7">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Connections to center */}
        <line x1="60" y1="28" x2="60" y2="42" stroke="url(#logoGrad1)" strokeWidth="1" opacity="0.4" />
        <line x1="92" y1="60" x2="78" y2="60" stroke="var(--theme-primary-hex, #c9a55a)" strokeWidth="1" opacity="0.3" />
        <line x1="28" y1="60" x2="42" y2="60" stroke="var(--theme-secondary-hex, #e0c07a)" strokeWidth="1" opacity="0.3" />
        <line x1="60" y1="92" x2="60" y2="78" stroke="url(#logoGrad2)" strokeWidth="1" opacity="0.4" />

        {/* Central "A" letterform */}
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
                <stop offset="0%" stopColor="rgba(var(--theme-secondary, 224,192,122),1)" />
                <stop offset="100%" stopColor="rgba(var(--theme-primary, 201,165,90),1)" />
            </linearGradient>
            <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(var(--theme-primary, 201,165,90),1)" />
                <stop offset="100%" stopColor="rgba(var(--theme-muted, 168,152,128),1)" />
            </linearGradient>
            <linearGradient id="logoGrad3" x1="40%" y1="0%" x2="60%" y2="100%">
                <stop offset="0%" stopColor="rgba(var(--theme-text, 240,232,216),1)" />
                <stop offset="50%" stopColor="rgba(var(--theme-secondary, 224,192,122),1)" />
                <stop offset="100%" stopColor="rgba(var(--theme-primary, 201,165,90),1)" />
            </linearGradient>
        </defs>
    </svg>
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

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center transition-all duration-700 bg-theme-bg
                ${phase >= 3 ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}
            `}
        >
            <StarryBackground density={60} speed={0.5} connectDistance={100} />
            {/* Ambient background orbs using theme colors */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute top-[20%] left-[15%] w-[50vw] h-[50vw] rounded-full blur-[150px]"
                    style={{ background: 'rgba(var(--theme-primary), 0.06)', animation: 'splash-float 8s ease-in-out infinite' }}
                />
                <div
                    className="absolute bottom-[15%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-[130px]"
                    style={{ background: 'rgba(var(--theme-primary), 0.04)', animation: 'splash-float 10s ease-in-out infinite', animationDelay: '-3s' }}
                />
                <div
                    className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] rounded-full blur-[100px]"
                    style={{ background: 'rgba(var(--theme-secondary), 0.03)' }}
                />
            </div>

            {/* Subtle grid overlay using theme primary */}
            <div className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(var(--theme-primary), 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--theme-primary), 0.5) 1px, transparent 1px)',
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
                        <div className="absolute -inset-6 rounded-full blur-2xl -z-10"
                            style={{ background: 'rgba(var(--theme-primary), 0.15)', animation: 'pulse 3s ease-in-out infinite' }} />
                    </div>
                </div>

                {/* Text */}
                <div className={`mt-8 text-center transition-all duration-800 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
                `}>
                    <h1 className="text-5xl font-serif italic tracking-wide text-theme-text">
                        Aurem
                    </h1>
                    <p className="text-xs mt-3 tracking-[0.35em] uppercase font-medium text-theme-primary" style={{ opacity: 0.5 }}>
                        Your AI Study Companion
                    </p>
                </div>

                {/* Loading bar */}
                <div className={`mt-10 w-32 h-[2px] rounded-full overflow-hidden transition-all duration-500 delay-500
                    ${phase >= 2 ? 'opacity-100' : 'opacity-0'}
                `}
                    style={{ background: 'rgba(var(--theme-primary), 0.1)' }}
                >
                    <div className="h-full rounded-full"
                        style={{
                            background: 'linear-gradient(90deg, rgba(var(--theme-muted),1), rgba(var(--theme-primary),1), rgba(var(--theme-secondary),1))',
                            animation: 'splashLoadingBar 2s ease-in-out forwards',
                            width: '0%',
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes splashLoadingBar {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                @keyframes splash-float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(20px, -30px); }
                }
            `}</style>
        </div>
    );
};

export { AuremLogo };
export default SplashScreen;
