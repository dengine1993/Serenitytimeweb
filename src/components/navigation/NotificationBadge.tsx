import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export function NotificationBadge({ count, max = 99, className }: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1",
        "text-[10px] font-bold text-white bg-destructive rounded-full",
        "ring-2 ring-background",
        "animate-in fade-in zoom-in duration-200",
        className
      )}
    >
      {displayCount}
    </span>
  );
}
