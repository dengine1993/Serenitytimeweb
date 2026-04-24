import { memo } from "react";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export const PostSkeleton = memo(function PostSkeleton() {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 overflow-hidden relative">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      <div className="flex items-start gap-4 mb-4 relative">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      
      <div className="space-y-2.5 mb-4 relative">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[70%]" />
      </div>
      
      <div className="flex items-center gap-3 relative">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </Card>
  );
});

export const ConversationSkeleton = memo(function ConversationSkeleton() {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 overflow-hidden relative">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      
      <div className="flex items-center gap-4 relative">
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-full max-w-[280px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-8 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
});
