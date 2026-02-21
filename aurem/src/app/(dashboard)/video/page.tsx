"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Video, Sparkles, Play, Clock, Loader2, Lock, Star } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";

interface VideoItem {
    id: string;
    topic: string;
    status: "generating" | "completed";
    duration: string;
    thumbnail: string;
}

export default function VideoPage() {
    const [topic, setTopic] = useState("");
    const [duration, setDuration] = useState<"15" | "30" | "60">("30");
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const { isPro, isGo, triggerUpgrade, canUseFeature, incrementUsage } = useSubscription();

    const generateVideo = async () => {
        if (!isPro && !isGo) {
            triggerUpgrade("Video Generation");
            return;
        }
        if (!canUseFeature("videoGenerations")) {
            triggerUpgrade("Video Generation");
            return;
        }
        if (!topic.trim()) return;

        setIsGenerating(true);
        incrementUsage("videoGenerations");

        // Simulate video generation
        const newVideo: VideoItem = {
            id: Date.now().toString(),
            topic,
            status: "generating",
            duration: `${duration}s`,
            thumbnail: "",
        };
        setVideos((prev) => [newVideo, ...prev]);

        setTimeout(() => {
            setVideos((prev) =>
                prev.map((v) => (v.id === newVideo.id ? { ...v, status: "completed" as const } : v))
            );
            setIsGenerating(false);
        }, 5000);

        setTopic("");
    };

    return (
        <div className="h-full overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-6 no-scrollbar">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                        <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold text-white">
                            Video Generation <span className="pro-badge ml-2">PRO</span>
                        </h1>
                        <p className="text-xs text-white/40">Generate short animated explainer videos for any topic</p>
                    </div>
                </div>

                {/* Pro Gate */}
                {!isPro && !isGo ? (
                    <div className="glass-panel p-8 text-center max-w-lg mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                            <Lock className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h2 className="text-xl font-display font-bold text-white mb-2">Pro Feature</h2>
                        <p className="text-white/40 text-sm mb-6">
                            Video generation is available on Go and Pro plans. Generate animated explainer videos for any academic topic.
                        </p>
                        <button onClick={() => triggerUpgrade("Video Generation")} className="btn-primary flex items-center gap-2 mx-auto">
                            <Star className="w-4 h-4" /> Upgrade to Pro
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Generate Form */}
                        <div className="glass-panel p-6 max-w-lg mx-auto space-y-4">
                            <div>
                                <label className="text-sm text-white/50 mb-2 block">Topic</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="glass-input w-full"
                                    placeholder="e.g., How does DNA replication work?"
                                    id="video-topic"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-white/50 mb-2 block">Duration</label>
                                <div className="flex gap-2">
                                    {(["15", "30", "60"] as const).map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setDuration(d)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${duration === d
                                                    ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                                                    : "bg-white/[0.03] border-white/[0.06] text-white/40"
                                                }`}
                                        >
                                            {d}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={generateVideo}
                                disabled={isGenerating || !topic.trim()}
                                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                id="generate-video"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-5 h-5" /> Generate Video</>
                                )}
                            </button>
                        </div>

                        {/* Generated Videos */}
                        {videos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                {videos.map((video) => (
                                    <motion.div
                                        key={video.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="glass-panel overflow-hidden group"
                                    >
                                        <div className="relative aspect-video bg-gradient-to-br from-midnight-900 to-midnight-950 flex items-center justify-center">
                                            {video.status === "generating" ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                                                    <span className="text-xs text-white/30">Generating...</span>
                                                </div>
                                            ) : (
                                                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                                    <Play className="w-6 h-6 text-white ml-0.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <p className="text-sm text-white font-medium truncate">{video.topic}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="w-3 h-3 text-white/30" />
                                                <span className="text-xs text-white/30">{video.duration}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${video.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                                                    {video.status}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
