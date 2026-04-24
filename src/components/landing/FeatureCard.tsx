import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LucideIcon, Crown } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  delay?: number;
  comingSoon?: boolean;
  premium?: boolean;
}

export const FeatureCard = ({ icon: Icon, title, description, link, delay = 0, comingSoon = false, premium = false }: FeatureCardProps) => {
  const cardContent = (
    <motion.div
      className={`group relative h-full p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-300 ${
        comingSoon 
          ? 'cursor-default opacity-60' 
          : premium 
            ? 'hover:border-primary/40 hover:shadow-[0_20px_50px_rgba(120,146,255,0.2)]'
            : 'hover:border-secondary/30 hover:shadow-[0_20px_50px_rgba(74,209,214,0.15)]'
      }`}
      whileHover={comingSoon ? {} : { y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect on hover */}
      {!comingSoon && (
        <div className={`absolute inset-0 transition-all duration-300 ${
          premium 
            ? 'bg-gradient-to-br from-primary/0 to-secondary/0 group-hover:from-primary/10 group-hover:to-secondary/5'
            : 'bg-gradient-to-br from-secondary/0 to-accent/0 group-hover:from-secondary/5 group-hover:to-accent/5'
        }`} />
      )}
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Icon */}
        <div className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
          premium 
            ? 'bg-gradient-to-br from-primary/20 to-secondary/10 group-hover:from-primary/30 group-hover:to-secondary/20'
            : 'bg-gradient-to-br from-secondary/20 to-accent/10 group-hover:from-secondary/30 group-hover:to-accent/20'
        }`}>
          <Icon className={`w-6 h-6 ${premium ? 'text-primary' : 'text-secondary'}`} />
        </div>

        {/* Title */}
        <h3 className={`text-lg font-semibold text-white mb-2 transition-colors duration-300 flex items-center gap-2 ${
          !comingSoon && (premium ? 'group-hover:text-primary' : 'group-hover:text-secondary')
        }`}>
          {title}
          {comingSoon && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30">
              Скоро
            </span>
          )}
          {premium && !comingSoon && (
            <Crown className="w-4 h-4 text-amber-400" />
          )}
        </h3>

        {/* Description */}
        <p className="text-sm text-white/60 leading-relaxed flex-grow">
          {description}
        </p>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay, duration: 0.5 }}
    >
      {comingSoon ? cardContent : <Link to={link}>{cardContent}</Link>}
    </motion.div>
  );
};
