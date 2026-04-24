import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

interface CrisisThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export const CrisisThemeToggle = ({ isDark, onToggle }: CrisisThemeToggleProps) => {
  return (
    <motion.button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border transition-colors shadow-sm ${
        isDark 
          ? 'bg-white/10 border-white/20 text-white/90 hover:bg-white/20' 
          : 'bg-white/90 border-gray-300 text-gray-700 hover:bg-white shadow-md'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-purple-300" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </motion.div>
      <span className="text-sm font-medium">{isDark ? "Ночь" : "День"}</span>
    </motion.button>
  );
};
