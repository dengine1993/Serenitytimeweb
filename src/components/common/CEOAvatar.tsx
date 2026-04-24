import { cn } from '@/lib/utils';
import logoBezm from '@/assets/logo-bezm.png';

interface CEOAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

/**
 * Аватар основателя/CEO — логотип «Безмятежные»
 * с круглой обводкой градиентом primary→secondary.
 */
export function CEOAvatar({ size = 'md', className }: CEOAvatarProps) {
  return (
    <div
      className={cn(
        'relative flex-shrink-0 rounded-full p-[2px] bg-gradient-to-br from-primary via-primary/70 to-secondary',
        sizeMap[size],
        className
      )}
    >
      <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
        <img
          src={logoBezm}
          alt="Безмятежные"
          className="w-[80%] h-[80%] object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
