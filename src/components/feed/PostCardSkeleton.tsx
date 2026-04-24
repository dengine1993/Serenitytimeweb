import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PostCardSkeletonProps {
  delay?: number;
}

export function PostCardSkeleton({ delay = 0 }: PostCardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "relative overflow-hidden",
        "bg-gradient-to-b from-card/60 to-card/30",
        "backdrop-blur-xl",
        "border border-white/5",
        "rounded-3xl",
        "p-5"
      )}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-full bg-muted/30 shimmer-element" />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name skeleton */}
          <div className="h-4 w-24 bg-muted/30 rounded shimmer-element" />
          {/* Username skeleton */}
          <div className="h-3 w-16 bg-muted/20 rounded shimmer-element" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full bg-muted/30 rounded shimmer-element" />
        <div className="h-3 w-4/5 bg-muted/30 rounded shimmer-element" />
        <div className="h-3 w-3/4 bg-muted/30 rounded shimmer-element" />
      </div>

      {/* Reactions skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-8 w-16 bg-muted/20 rounded-full shimmer-element" />
        <div className="h-8 w-16 bg-muted/20 rounded-full shimmer-element" />
      </div>
    </motion.div>
  );
}
