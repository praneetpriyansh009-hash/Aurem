import React, { useState } from 'react';
import { Video, Play, Clock, Download, Crown, Lock, Sparkles, Film, Zap, Check, ChevronRight, Monitor, Smartphone } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const DURATIONS = [
    { id: '30s', label: '30 seconds', desc: 'Quick explainer' },
    { id: '1m', label: '1 minute', desc: 'Short overview' },
    { id: '2m', label: '2 minutes', desc: 'Detailed breakdown' },
    { id: '5m', label: '5 minutes', desc: 'Deep dive' },
];

const TIERS = {
    free: { name: 'Free', videosPerWeek: 3, resolution: 'SD (480p)', downloadable: false, color: 'from-theme-muted to-theme-muted/80' },
    go: { name: 'Go', videosPerWeek: 5, resolution: 'HD (1080p)', downloadable: false, color: 'from-theme-secondary to-theme-primary' },
    pro: { name: 'Pro', videosPerWeek: 'Unlimited', resolution: 'HD (1080p)', downloadable: true, color: 'from-theme-primary to-theme-secondary' },
};

const VideoGenerator = () => {
    const { isDark } = useTheme();
    const { isPro, canUseFeature, triggerUpgradeModal } = useSubscription();
    const [selectedDuration, setSelectedDuration] = useState('1m');
    const [topic, setTopic] = useState('');

    const userTier = isPro ? 'pro' : 'free'; // Simplified — expand when Go tier exists
    const currentTier = TIERS[userTier];

    return (
        <div className={`h-full overflow-y-auto custom-scrollbar p-6 bg-theme-bg text-theme-text`}>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center pt-6">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 ${isDark ? 'bg-theme-primary/10 text-theme-primary border border-theme-primary/20' : 'bg-theme-primary/5 text-theme-primary border border-theme-primary/10'}`}>
                        <Film className="w-4 h-4" /> Visual Studio
                    </div>
                    <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-theme-primary via-theme-secondary to-theme-primary bg-clip-text text-transparent">
                        Visual Synthesis
                    </h1>
                    <p className="text-theme-muted text-lg max-w-xl mx-auto">
                        Transform your notes, topics, and concepts into beautiful AI-generated educational videos.
                    </p>
                </div>

                {/* Coming Soon Banner */}
                <div className={`relative rounded-3xl border overflow-hidden bg-theme-surface border-theme-border/20`}>
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-theme-primary/5 via-theme-secondary/5 to-theme-primary/5"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative p-10 text-center">
                        {/* Animated icon */}
                        <div className="relative inline-block mb-6">
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br from-theme-primary to-theme-secondary shadow-xl shadow-theme-primary/25`}>
                                <Video className="w-12 h-12 text-theme-bg" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-theme-primary rounded-full flex items-center justify-center animate-pulse">
                                <Zap className="w-3 h-3 text-theme-bg" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black mb-3 text-theme-primary">Coming Soon</h2>
                        <p className="text-theme-muted max-w-md mx-auto mb-8">
                            Powered by next-gen AI video models, AUREM Video will create stunning educational videos from your study material. We're putting the finishing touches on something incredible.
                        </p>

                        {/* Topic Input (preview of the interface) */}
                        <div className={`max-w-lg mx-auto rounded-2xl border p-6 mb-8 bg-theme-bg border-theme-border/50`}>
                            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-3 block text-left">What do you want a video about?</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Newton's Third Law of Motion"
                                className={`w-full px-4 py-3 rounded-xl border text-sm mb-4 outline-none transition-all focus:ring-2 focus:ring-theme-primary/50 bg-theme-surface border-theme-border/30 text-theme-text placeholder-theme-muted/50`}
                            />

                            {/* Duration Selector */}
                            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-3 block text-left">Video Length</label>
                            <div className="grid grid-cols-4 gap-2 mb-5">
                                {DURATIONS.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => setSelectedDuration(d.id)}
                                        className={`py-2.5 px-3 rounded-xl text-center transition-all border text-xs font-semibold ${selectedDuration === d.id
                                            ? 'border-theme-primary bg-theme-primary/10 text-theme-primary ring-1 ring-theme-primary/30'
                                            : `border-theme-border/20 text-theme-muted hover:border-theme-primary/50`
                                            }`}
                                    >
                                        <div className="font-bold">{d.label}</div>
                                        <div className="text-[10px] opacity-60 mt-0.5">{d.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Generate Button (disabled) */}
                            <button
                                disabled
                                className="w-full py-3.5 bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg font-bold rounded-xl opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" /> Generate Video — Coming Soon
                            </button>
                        </div>

                        {/* ETA */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs bg-theme-primary/10 text-theme-primary border border-theme-primary/20`}>
                            <Clock className="w-3 h-3" /> Expected launch: Q3 2026
                        </div>
                    </div>
                </div>

                {/* Tier Comparison */}
                <div>
                    <h3 className="text-lg font-bold text-center mb-6">Plan Comparison</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {Object.entries(TIERS).map(([key, tier]) => (
                            <div
                                key={key}
                                className={`rounded-2xl border p-5 text-center transition-all ${key === userTier ? 'ring-2 ring-theme-primary scale-[1.02]' : ''
                                    } bg-theme-surface border-theme-border/30`}
                            >
                                <div className={`text-xs font-bold uppercase tracking-wider mb-3 bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
                                    {tier.name}
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-theme-muted">Videos/week</span>
                                        <span className="font-bold">{tier.videosPerWeek}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-theme-muted">Resolution</span>
                                        <span className="font-bold text-xs">{tier.resolution}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-theme-muted">Download</span>
                                        {tier.downloadable ? (
                                            <Check className="w-4 h-4 text-theme-primary" />
                                        ) : (
                                            <Lock className="w-4 h-4 text-theme-muted" />
                                        )}
                                    </div>
                                </div>
                                {key === userTier && (
                                    <div className="mt-3 text-[10px] font-bold text-theme-primary uppercase">Current Plan</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className={`rounded-3xl border p-8 bg-theme-surface border-theme-border/20`}>
                    <h3 className="text-lg font-black mb-6 text-center text-theme-primary uppercase tracking-widest">What to Expect</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: '🎨', title: 'Visual Explanations', desc: 'AI-animated diagrams and concepts' },
                            { icon: '🗣️', title: 'AI Narration', desc: 'Natural voice explaining topics' },
                            { icon: '📐', title: 'Subject Support', desc: 'Physics, Math, Chemistry & more' },
                            { icon: '⚡', title: 'Instant Generation', desc: 'Videos ready in minutes' },
                        ].map((feature, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl mb-3">{feature.icon}</div>
                                <h4 className="font-bold text-sm mb-1 text-theme-secondary">{feature.title}</h4>
                                <p className="text-[11px] text-theme-muted">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upgrade CTA for non-Pro users */}
                {!isPro && (
                    <div className={`rounded-3xl border p-6 text-center bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 border-theme-primary/20`}>
                        <Crown className="w-8 h-8 text-theme-primary mx-auto mb-3" />
                        <h3 className="font-black text-lg mb-2 text-theme-primary">Unlock HD Videos & Downloads</h3>
                        <p className="text-theme-muted text-sm mb-4">Upgrade to Pro for unlimited HD video generation with downloads.</p>
                        <button
                            onClick={() => triggerUpgradeModal('video-generator')}
                            className="px-6 py-3 bg-gradient-to-r from-theme-primary to-theme-secondary text-theme-bg font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
                        >
                            Upgrade to Pro →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoGenerator;
