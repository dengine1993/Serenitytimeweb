import { Compass, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";

interface NavigatorCardProps {
  onClick: () => void;
}

export function NavigatorCard({ onClick }: NavigatorCardProps) {
  const { t } = useI18n();
  
  return (
    <motion.button
      onClick={onClick}
      className="relative overflow-hidden w-full h-full min-h-[180px] rounded-3xl p-6 text-left transition-all hover:scale-[1.02] group cursor-pointer"
      style={{
        background: 'rgba(18, 22, 36, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      aria-label={t("home.navigator.ariaLabel")}
    >
      {/* Blue glow effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3), transparent 60%)'
        }}
      />
      
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/20 mb-4 relative z-10">
        <Compass className="w-6 h-6 text-blue-400" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
            {t("home.navigator.title")}
          </h3>
          <ArrowRight className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
        </div>
        
        <p className="text-sm text-white/60 max-w-md line-clamp-2">
          {t("home.navigator.description")}
        </p>
      </div>
    </motion.button>
  );
}
