import { SparklesIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface CEOBadgeProps {
  className?: string;
}

/**
 * Бейдж «CEO» рядом с именем основателя.
 */
export function CEOBadge({ className }: CEOBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0',
        'bg-gradient-to-r from-amber-500/15 to-amber-600/15 text-amber-500 border border-amber-500/30',
        className
      )}
    >
      <SparklesIcon className="h-2 w-2" />
      CEO
    </span>
  );
}
