import { cn } from '@/lib/utils';

interface CEOAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Реальный аватар CEO (Lekha) из профиля. Если не задан — фолбэк на лого приложения. */
  avatarUrl?: string;
}

const sizeMap = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

/**
 * Аватар основателя/CEO (Lekha) в фирменном градиентном кольце.
 * Внутри показывает реальную аватарку из профиля, а если её нет — лого приложения.
 */
export function CEOAvatar({ size = 'md', className, avatarUrl }: CEOAvatarProps) {
  const src = avatarUrl && avatarUrl.trim().length > 0 ? avatarUrl : '/icon-192.png';
  return (
    <div
      className={cn(
        'relative flex-shrink-0 rounded-full p-[2px] bg-gradient-to-br from-primary via-primary/70 to-secondary',
        sizeMap[size],
        className
      )}
    >
      <img
        src={src}
        alt="Lekha"
        loading="lazy"
        className="w-full h-full rounded-full object-cover bg-background"
      />
    </div>
  );
}
