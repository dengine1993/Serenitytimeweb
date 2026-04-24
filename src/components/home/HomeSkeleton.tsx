import { Skeleton } from '@/components/ui/skeleton';

export function HomeSkeleton() {
  return (
    <div className="min-h-screen pb-24 md:pb-0" style={{ backgroundColor: '#080A10' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-6 pt-6 pb-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-56 bg-muted/20 shimmer" />
            <Skeleton className="h-4 w-32 bg-muted/10" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full bg-muted/20" />
        </div>

        {/* Bento Grid Skeleton */}
        <div className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            
            {/* Jiva Sanctuary Skeleton - Hero (2x2) */}
            <div className="md:col-span-2 md:row-span-2">
              <div className="glass-card rounded-3xl p-8">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <Skeleton className="w-40 h-40 rounded-full bg-muted/20 shimmer" />
                  <div className="space-y-3 w-full max-w-md">
                    <Skeleton className="h-4 w-32 mx-auto bg-muted/10" />
                    <Skeleton className="h-6 w-full bg-muted/15 shimmer" />
                    <Skeleton className="h-6 w-3/4 mx-auto bg-muted/15" />
                  </div>
                  <Skeleton className="h-12 w-48 rounded-full bg-muted/20 shimmer" />
                </div>
              </div>
            </div>

            {/* Top right widget */}
            <div className="hidden lg:block">
              <div className="glass-card rounded-2xl p-5 h-full">
                <Skeleton className="h-5 w-24 mb-3 bg-muted/20" />
                <Skeleton className="h-10 w-32 mb-2 bg-muted/15 shimmer" />
                <Skeleton className="h-3 w-full bg-muted/10" />
              </div>
            </div>

            {/* Glimmer Block Skeleton */}
            <div className="md:col-span-1">
              <div className="glass-card rounded-2xl p-6 h-full">
                <Skeleton className="h-6 w-48 mb-2 bg-muted/20" />
                <Skeleton className="h-4 w-32 mb-4 bg-muted/10" />
                <Skeleton className="h-20 w-full rounded-xl bg-muted/15 shimmer" />
              </div>
            </div>

            {/* Middle widget */}
            <div className="hidden lg:block">
              <div className="glass-card rounded-2xl p-5 h-full">
                <Skeleton className="h-5 w-24 mb-3 bg-muted/20" />
                <Skeleton className="h-10 w-32 mb-2 bg-muted/15 shimmer" />
                <Skeleton className="h-3 w-full bg-muted/10" />
              </div>
            </div>

            {/* Bottom widget */}
            <div className="hidden lg:block">
              <div className="glass-card rounded-2xl p-5 h-full">
                <Skeleton className="h-5 w-24 mb-3 bg-muted/20" />
                <Skeleton className="h-10 w-32 mb-2 bg-muted/15 shimmer" />
                <Skeleton className="h-3 w-full bg-muted/10" />
              </div>
            </div>

            {/* Quick Actions Grid Skeleton - Full width */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card rounded-2xl p-5 aspect-square md:aspect-auto md:min-h-[140px]">
                    <Skeleton className="h-8 w-8 rounded-lg mb-3 bg-muted/20 shimmer" />
                    <Skeleton className="h-5 w-24 mb-2 bg-muted/15" />
                    <Skeleton className="h-3 w-full bg-muted/10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
