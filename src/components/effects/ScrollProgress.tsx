import { motion, useScroll, useSpring } from 'framer-motion';

export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 z-50 origin-left"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, hsl(28, 96%, 60%), hsl(35, 92%, 58%), hsl(350, 89%, 65%))',
        boxShadow: '0 0 20px hsl(28, 96%, 55%, 0.55)',
      }}
    />
  );
};
