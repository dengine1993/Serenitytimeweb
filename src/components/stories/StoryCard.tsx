import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { UserStory } from '@/hooks/useStories';
import { useStoryReactions } from '@/hooks/useStoryReactions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
// useI18n imported below in component too — единый источник `t`
import { MessageCircle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactionButtons } from './ReactionButtons';

interface StoryCardProps {
  story: UserStory;
  onClick: () => void;
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const locale = language === 'ru' ? ru : enUS;

  const { counts, userReactions, toggleReaction, isLoading } = useStoryReactions(story.id);

  const rawName = story.author?.display_name;
  const displayName = rawName && rawName.length >= 2 ? rawName : t('stories.fallbackName');
  const avatarUrl = story.author?.avatar_url || undefined;

  const timeAgo = formatDistanceToNow(
    new Date(story.last_comment_at || story.created_at),
    { addSuffix: true, locale }
  );

  const contentPreview = story.content.length > 150
    ? story.content.slice(0, 150) + '...'
    : story.content;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-shadow hover:shadow-md",
        "bg-card/80 backdrop-blur-sm border-border/50"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
          <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{displayName}</span>
            {story.is_premium && (
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
          </div>

          {story.title && (
            <h3 className="font-semibold text-foreground mt-1 line-clamp-1 break-words [overflow-wrap:anywhere]">
              {story.title}
            </h3>
          )}

          <p className="text-muted-foreground text-sm mt-1 line-clamp-3 break-words [overflow-wrap:anywhere]">
            {contentPreview}
          </p>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {story.comment_count}
              </span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <ReactionButtons
                counts={counts}
                userReactions={userReactions}
                onToggle={toggleReaction}
                size="sm"
                disabled={!user || isLoading}
                hideEmptyHint
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
