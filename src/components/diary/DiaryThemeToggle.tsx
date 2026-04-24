import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

interface DiaryThemeToggleProps {
  isLight: boolean;
  onToggle: () => void;
}

export function DiaryThemeToggle({ isLight, onToggle }: DiaryThemeToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`p-2 rounded-xl transition-all ${
        isLight 
          ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
          : "bg-white/10 text-white/80 hover:bg-white/20"
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isLight ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        {isLight ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
      </motion.div>
    </motion.button>
  );
}
