import { motion } from "framer-motion";
import { useMemo } from "react";

interface DiaryParticlesProps {
  isLight: boolean;
}

export function DiaryParticles({ isLight }: DiaryParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 15,
      type: Math.random() > 0.5 ? 'star' : 'circle'
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute"
          initial={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: 0,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {particle.type === 'star' ? (
            <svg 
              width={particle.size * 4} 
              height={particle.size * 4} 
              viewBox="0 0 24 24" 
              fill="none"
            >
              <path 
                d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
                fill={isLight ? "rgba(147, 197, 253, 0.5)" : "rgba(147, 197, 253, 0.3)"}
              />
            </svg>
          ) : (
            <div 
              className={`rounded-full ${
                isLight 
                  ? "bg-gradient-to-br from-blue-200/40 to-orange-200/40" 
                  : "bg-gradient-to-br from-primary/20 to-purple-500/20"
              }`}
              style={{
                width: particle.size * 3,
                height: particle.size * 3,
              }}
            />
          )}
        </motion.div>
      ))}
      
      {/* Gentle wave effect at bottom */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-40 ${
          isLight 
            ? "bg-gradient-to-t from-orange-100/30 via-transparent to-transparent" 
            : "bg-gradient-to-t from-primary/5 via-transparent to-transparent"
        }`}
      />
    </div>
  );
}
