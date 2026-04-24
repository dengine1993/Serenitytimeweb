import { motion } from 'framer-motion';
import { shouldUseSimpleEffects } from '@/utils/performance';

interface AuroraBackgroundProps {
  mode?: 'calm' | 'focus' | 'idle';
  intensity?: 'full' | 'soft';
}

export const AuroraBackground = ({ mode = 'calm', intensity = 'full' }: AuroraBackgroundProps) => {
  const speedFactor = mode === 'focus' ? 0.6 : mode === 'idle' ? 1.1 : 0.8;
  const opacityFactor = intensity === 'soft' ? 0.6 : 1;
  const simplify = shouldUseSimpleEffects();

  if (simplify) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_top,_hsl(215,_95%,_60%_/_0.2)_0%,_transparent_60%)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, hsl(211, 100%, 55%) 0%, hsl(280, 90%, 60%) 50%, transparent 100%)',
          top: '-10%',
          left: '-10%',
        }}
        animate={{
          x: [0, 150 * speedFactor, -50 * speedFactor, 0],
          y: [0, -100 * speedFactor, 50 * speedFactor, 0],
          scale: [1, 1 + 0.3 * speedFactor, 0.9 + 0.05 * speedFactor, 1],
        }}
        transition={{
          duration: 30 / speedFactor,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full opacity-15 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, hsl(280, 90%, 60%) 0%, hsl(190, 100%, 50%) 50%, transparent 100%)',
          top: '30%',
          right: '-15%',
        }}
        animate={{
          x: [0, -120 * speedFactor, 80 * speedFactor, 0],
          y: [0, 100 * speedFactor, -80 * speedFactor, 0],
          scale: [1, 1 + 0.2 * speedFactor, 1.1 + 0.05 * speedFactor, 1],
        }}
        transition={{
          duration: 35 / speedFactor,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, hsl(190, 100%, 50%) 0%, hsl(211, 100%, 55%) 50%, transparent 100%)',
          bottom: '-15%',
          left: '20%',
        }}
        animate={{
          x: [0, 80 * speedFactor, -100 * speedFactor, 0],
          y: [0, -80 * speedFactor, 60 * speedFactor, 0],
          scale: [1, 1 + 0.15 * speedFactor, 0.95 + 0.05 * speedFactor, 1],
        }}
        transition={{
          duration: 28 / speedFactor,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-full h-full"
        style={{
          background: 'radial-gradient(circle at 80% 20%, hsl(211, 100%, 55%, 0.1) 0%, transparent 50%)',
        }}
        animate={{
          opacity: [0.3 * opacityFactor, 0.5 * opacityFactor, 0.3 * opacityFactor],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute w-full h-full"
        style={{
          background: 'radial-gradient(circle at 20% 80%, hsl(280, 90%, 60%, 0.1) 0%, transparent 50%)',
        }}
        animate={{
          opacity: [0.2 * opacityFactor, 0.4 * opacityFactor, 0.2 * opacityFactor],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
    </div>
  );
};
