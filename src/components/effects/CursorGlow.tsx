import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const CursorGlow = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  return (
    <>
      {/* Main cursor glow - enhanced */}
      <motion.div
        className="pointer-events-none fixed z-0 hidden md:block mix-blend-screen"
        style={{
          left: mousePosition.x - 400,
          top: mousePosition.y - 400,
        }}
        transition={{
          type: "spring",
          damping: 12,
          stiffness: 350,
          mass: 0.15,
        }}
      >
        <div className="w-[800px] h-[800px] rounded-full opacity-30 blur-3xl bg-gradient-to-r from-primary via-secondary to-accent" />
      </motion.div>

      {/* Secondary glow trail - more visible */}
      <motion.div
        className="pointer-events-none fixed z-0 hidden md:block mix-blend-screen"
        style={{
          left: mousePosition.x - 200,
          top: mousePosition.y - 200,
        }}
        transition={{
          type: "spring",
          damping: 18,
          stiffness: 280,
          mass: 0.25,
        }}
      >
        <div className="w-[400px] h-[400px] rounded-full opacity-20 blur-2xl bg-gradient-to-br from-secondary via-accent to-primary" />
      </motion.div>
      
      {/* Tight inner glow */}
      <motion.div
        className="pointer-events-none fixed z-0 hidden md:block mix-blend-screen"
        style={{
          left: mousePosition.x - 75,
          top: mousePosition.y - 75,
        }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 500,
          mass: 0.1,
        }}
      >
        <div className="w-[150px] h-[150px] rounded-full opacity-25 blur-xl bg-white" />
      </motion.div>
    </>
  );
};
