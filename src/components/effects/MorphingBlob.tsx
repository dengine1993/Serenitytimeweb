import { motion } from 'framer-motion';

interface MorphingBlobProps {
  color?: string;
  size?: string;
  position?: string;
  delay?: number;
}

export const MorphingBlob = ({ 
  color = 'hsl(211, 100%, 55%)',
  size = '600px',
  position = 'top-0 left-0',
  delay = 0
}: MorphingBlobProps) => {
  return (
    <motion.div
      className={`absolute ${position} rounded-full blur-[120px] pointer-events-none`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
      animate={{
        scale: [1, 1.3, 1.1, 1],
        x: [0, 100, -50, 0],
        y: [0, -80, 60, 0],
        opacity: [0.3, 0.5, 0.4, 0.3],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
};
