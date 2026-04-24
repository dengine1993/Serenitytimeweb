import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionDividerProps {
  className?: string;
  animated?: boolean;
}

export function SectionDivider({ className, animated = true }: SectionDividerProps) {
  if (!animated) {
    return (
      <div className={cn("h-px bg-gradient-to-r from-transparent via-border/50 to-transparent shadow-sm shadow-primary/10", className)} />
    );
  }

  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={cn("h-px bg-gradient-to-r from-transparent via-border/50 to-transparent shadow-sm shadow-primary/10 origin-center", className)}
    />
  );
}
