import { motion } from 'framer-motion';
import { useEffect, useState, memo, useMemo } from 'react';
import { getOptimalParticleCount, shouldUseSimpleEffects } from '@/utils/performance';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface ParticleFieldProps {
  intensity?: 'default' | 'faint';
}

export const ParticleField = memo(({ intensity = 'default' }: ParticleFieldProps) => {
  const baseCount = intensity === 'faint' ? 20 : 30;
  const simplify = shouldUseSimpleEffects();
  const particleCount = useMemo(() => {
    if (simplify) return 0;
    return getOptimalParticleCount(baseCount);
  }, [baseCount, simplify]);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (particleCount === 0) {
      setParticles([]);
      return;
    }

    const generateParticles = () => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * (intensity === 'faint' ? 3 : 4) + 1,
          duration: Math.random() * 5 + (intensity === 'faint' ? 4 : 3),
          delay: Math.random() * 2,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, [particleCount, intensity]);

  if (simplify) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.12)_0%,_transparent_60%)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
            ...(intensity !== 'faint' && { filter: 'blur(1px)' }),
            willChange: 'transform',
          }}
          animate={{
            y: intensity === 'faint' ? [0, -10, 0] : [0, -30, 0],
            opacity: intensity === 'faint' ? [0.15, 0.4, 0.15] : [0.3, 0.8, 0.3],
            scale: intensity === 'faint' ? [1, 1.05, 1] : [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

ParticleField.displayName = 'ParticleField';
