import { motion } from "framer-motion";
import logoImage from "@/assets/logo-bezm.png";

interface LoadingScreenProps {
  message?: string;
  fullscreen?: boolean;
}

export function LoadingScreen({ message = "Загрузка...", fullscreen = true }: LoadingScreenProps) {
  if (!fullscreen) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="relative w-16 h-16">
          {/* Logo image */}
          <motion.img
            src={logoImage}
            alt="Загрузка"
            className="w-full h-full object-contain"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl -z-10"
            style={{ background: "radial-gradient(circle, rgba(255, 200, 100, 0.6) 0%, transparent 70%)" }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--gradient-ambient)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        {/* Logo image with glow */}
        <div className="relative w-24 h-24 md:w-32 md:h-32">
          {/* Glow background */}
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl -z-10"
            style={{ background: "radial-gradient(circle, rgba(255, 200, 100, 0.7) 0%, rgba(255, 150, 50, 0.3) 50%, transparent 70%)" }}
            animate={{
              opacity: [0.6, 1, 0.6],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Logo image */}
          <motion.img
            src={logoImage}
            alt="Загрузка"
            className="w-full h-full object-contain relative z-10"
            animate={{
              scale: [1, 1.08, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          
          {/* Orbiting sparkles */}
          {[0, 90, 180, 270].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 -ml-1 -mt-1"
              style={{ originX: 0.5, originY: 0.5 }}
              animate={{
                rotate: [angle, angle + 360],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.2,
              }}
            >
              <motion.div 
                className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(255,200,100,0.8)]"
                style={{ 
                  transform: `translateX(${50}px)`,
                }}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.15,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Text with subtle glow */}
        <motion.div
          className="text-center"
          animate={{
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <h2
            className="text-xl md:text-2xl font-semibold text-white/90"
            style={{
              textShadow: "0 2px 20px rgba(255, 255, 255, 0.4), 0 0 40px hsl(var(--primary) / 0.3)",
            }}
          >
            {message}
          </h2>
        </motion.div>
      </motion.div>
    </div>
  );
}
