import { motion } from 'framer-motion';

export function TransitionDivider() {
  return (
    <div className="relative my-8 px-6">
      {/* Main gradient line */}
      <div className="absolute inset-0 flex items-center">
        <motion.div 
          className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      
      {/* Blurred glow effect */}
      <div className="absolute inset-0 flex items-center blur-xl opacity-50">
        <motion.div 
          className="w-full h-4 bg-gradient-to-r from-transparent via-amber-500/30 via-blue-500/20 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
        />
      </div>
      
      {/* Shimmer animation */}
      <div className="absolute inset-0 flex items-center overflow-hidden">
        <motion.div
          className="w-32 h-8 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-sm"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
}
