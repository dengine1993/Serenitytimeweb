import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-7 w-32" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex justify-between gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 py-2.5">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>

      {/* Profile card skeleton */}
      <div className="flex items-center gap-5 p-4 rounded-2xl bg-muted/30 border border-border">
        <Skeleton className="w-20 h-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Bio skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      {/* Button skeleton */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Divider */}
      <div className="py-2">
        <Skeleton className="h-px w-full" />
      </div>

      {/* Security section skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function TabContentSkeleton({ variant = "profile" }: { variant?: "profile" | "simple" | "cards" }) {
  if (variant === "simple") {
    return (
      <div className="space-y-6 animate-fade-in">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="w-12 h-6 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="p-6 rounded-2xl bg-muted/30 border border-border">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-36 rounded-lg mt-2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default profile skeleton
  return <SettingsSkeleton />;
}
