import React from 'react';
import { cn } from '@/lib/utils';
import { ReactionType, REACTION_EMOJIS } from '@/hooks/useStoryReactions';
import { useI18n } from '@/hooks/useI18n';

interface ReactionButtonsProps {
  counts: Record<ReactionType, number>;
  userReactions: Record<ReactionType, boolean>;
  onToggle: (type: ReactionType) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  hideEmptyHint?: boolean;
}

const REACTION_TYPES: ReactionType[] = ['heart', 'hug', 'strength'];

export function ReactionButtons({ 
  counts, 
  userReactions, 
  onToggle, 
  size = 'md',
  disabled = false,
  hideEmptyHint = false,
}: ReactionButtonsProps) {
  const { t } = useI18n();
  const totalCount = counts.heart + counts.hug + counts.strength;
  const titles: Record<ReactionType, string> = {
    heart: t('stories.reactions.heart'),
    hug: t('stories.reactions.hug'),
    strength: t('stories.reactions.strength'),
  };

  return (
    <div className="flex items-center gap-1">
      {REACTION_TYPES.map((type) => {
        const isActive = userReactions[type];
        const count = counts[type];
        
        return (
          <button
            key={type}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(type);
            }}
            disabled={disabled}
            className={cn(
              "flex items-center gap-0.5 rounded-full transition-all",
              "hover:scale-110 active:scale-95",
              size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
              isActive 
                ? 'bg-primary/20 ring-1 ring-primary/30' 
                : 'hover:bg-muted',
              disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
            )}
            title={titles[type]}
          >
            <span>{REACTION_EMOJIS[type]}</span>
            {count > 0 && (
              <span className={cn(
                "font-medium",
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
      
      {/* Show total if no reactions */}
      {totalCount === 0 && !hideEmptyHint && (
        <span className="text-xs text-muted-foreground ml-1">
          {t('stories.reactions.support')}
        </span>
      )}
    </div>
  );
}
