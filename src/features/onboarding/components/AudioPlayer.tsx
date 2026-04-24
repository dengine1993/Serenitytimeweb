import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FloatingOrbs } from "@/components/effects/FloatingOrbs";

interface AudioPlayerProps {
    audioUrl: string;
    script: string | null;
    userName?: string;
}

export const AudioPlayer = ({ audioUrl, script }: AudioPlayerProps) => {
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const dataArrayRef = useRef<Uint8Array>(new Uint8Array(0));
    const animationFrameRef = useRef<number | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayed, setHasPlayed] = useState(false);
    const [audioIntensity, setAudioIntensity] = useState(0.3);

    // Setup Web Audio API for amplitude analysis
    useEffect(() => {
        if (audioUrl && audioRef.current) {
            try {
                // Create AudioContext
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;

                // Create source from audio element
                const source = audioContext.createMediaElementSource(audioRef.current);
                
                // Create analyser
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                analyserRef.current = analyser;

                // Create data array for frequency data
                const bufferLength = analyser.frequencyBinCount;
                dataArrayRef.current = new Uint8Array(bufferLength);

                // Connect: source -> analyser -> destination
                source.connect(analyser);
                analyser.connect(audioContext.destination);

            } catch (error) {
                console.log("Web Audio API setup failed:", error);
            }
        }

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [audioUrl]);

    useEffect(() => {
        if (audioUrl) {
            audioRef.current = new Audio(audioUrl);
            audioRef.current.crossOrigin = "anonymous";
            audioRef.current.onended = () => {
                setIsPlaying(false);
                setAudioIntensity(0.3);
            };

            // Auto-play attempt
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        setIsPlaying(true);
                        setHasPlayed(true);
                    })
                    .catch((error) => {
                        console.log("Auto-play prevented:", error);
                    });
            }
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [audioUrl]);

    // Analyze audio amplitude in real-time
    useEffect(() => {
        if (!isPlaying || !analyserRef.current || !dataArrayRef.current) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        const analyzeAudio = () => {
            if (!analyserRef.current || !dataArrayRef.current || dataArrayRef.current.length === 0) return;

            // Get frequency data
            // @ts-ignore - TypeScript ArrayBufferLike vs ArrayBuffer type mismatch
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);

            // Calculate average amplitude (0-255 range)
            const sum = dataArrayRef.current.reduce((acc, val) => acc + val, 0);
            const average = sum / dataArrayRef.current.length;

            // Normalize to 0.3-1.0 range for intensity
            // 0.3 is base intensity, spikes go up to 1.0
            const normalizedIntensity = 0.3 + (average / 255) * 0.7;
            
            setAudioIntensity(normalizedIntensity);

            // Continue animation loop
            animationFrameRef.current = requestAnimationFrame(analyzeAudio);
        };

        analyzeAudio();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
            setHasPlayed(true);
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-screen flex flex-col bg-gradient-to-b from-[#0a0f1a] via-[#0d1424] to-[#080c16]"
        >
            {/* Animated background - fullscreen */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                    delay: 0.3, 
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1]
                }}
                className="relative flex-1 w-full flex items-center justify-center"
            >
                {/* Ambient orbs animation */}
                <FloatingOrbs />
                
                {/* Central pulsing element */}
                <motion.div
                    animate={{
                        scale: [1, 1 + audioIntensity * 0.3, 1],
                        opacity: [0.6, 0.6 + audioIntensity * 0.3, 0.6],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-violet-500/20 blur-2xl"
                />
                <motion.div
                    animate={{
                        scale: [1, 1 + audioIntensity * 0.2, 1],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-primary/50 to-violet-500/30 blur-xl"
                />
                
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    {/* Play button */}
                    <Button
                        onClick={togglePlay}
                        variant="ghost"
                        size="icon"
                        className={`h-16 w-16 rounded-full 
                                 bg-white/10 backdrop-blur-md border border-white/20 
                                 hover:bg-white/20 transition-all
                                 shadow-[0_0_30px_rgba(139,92,246,0.4)]
                                 animate-fade-in
                                 ${!hasPlayed ? 'animate-pulse' : ''}`}
                        style={{ animationDelay: '0.8s' }}
                    >
                        {isPlaying ? (
                            <Pause className="w-7 h-7 text-white" />
                        ) : (
                            <Play className="w-7 h-7 text-white ml-0.5" />
                        )}
                    </Button>
                    
                    {/* Hint text */}
                    {!hasPlayed && !isPlaying && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: 1.2 }}
                            className="text-sm text-white/60 whitespace-nowrap"
                        >
                            Нажми, чтобы послушать
                        </motion.p>
                    )}
                </div>
            </motion.div>

            {/* Bottom Panel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4"
            >
                {script && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/70 italic text-sm leading-relaxed">
                        "{script}"
                    </div>
                )}
                
                <p className="text-sm text-muted-foreground/60 text-center">
                    Мы рядом — начнём вместе
                </p>

                <Button
                    onClick={() => navigate("/app")}
                    className="w-full h-14 text-lg rounded-xl 
                             bg-gradient-to-r from-violet-600 to-fuchsia-600 
                             hover:from-violet-500 hover:to-fuchsia-500 
                             text-white font-medium transition-all
                             shadow-[0_0_30px_rgba(139,92,246,0.4)]"
                >
                    Начать
                    <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
            </motion.div>
        </motion.div>
    );
};
