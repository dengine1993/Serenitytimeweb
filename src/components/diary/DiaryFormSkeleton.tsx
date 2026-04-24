import { Skeleton } from "@/components/ui/skeleton";

interface DiaryFormSkeletonProps {
  isLight: boolean;
}

export function DiaryFormSkeleton({ isLight }: DiaryFormSkeletonProps) {
  return (
    <div className={`p-4 sm:p-5 rounded-xl ${
      isLight 
        ? "bg-white border border-gray-200" 
        : "bg-white/5 border border-white/10"
    }`}>
      {/* Date header */}
      <Skeleton className={`h-6 w-40 mb-4 ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
      
      {/* Label */}
      <Skeleton className={`h-4 w-32 mb-3 ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
      
      {/* Mood buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {[...Array(7)].map((_, i) => (
          <Skeleton 
            key={i} 
            className={`min-w-[76px] h-[88px] rounded-2xl ${isLight ? "bg-gray-200" : "bg-white/10"}`} 
          />
        ))}
      </div>
      
      {/* Note label */}
      <Skeleton className={`h-4 w-24 mb-2 ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
      
      {/* Textarea */}
      <Skeleton className={`h-[100px] w-full rounded-lg mb-5 ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
      
      {/* Save button */}
      <Skeleton className={`h-12 w-full rounded-lg ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
    </div>
  );
}

export function DiaryStatsSkeleton({ isLight }: DiaryFormSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i}
          className={`p-3 rounded-xl ${
            isLight 
              ? "bg-white border border-gray-100" 
              : "bg-white/5 border border-white/10"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className={`w-8 h-8 rounded-lg ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
            <Skeleton className={`h-3 w-16 ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
          </div>
          <Skeleton className={`h-6 w-12 ${isLight ? "bg-gray-200" : "bg-white/10"}`} />
        </div>
      ))}
    </div>
  );
}
