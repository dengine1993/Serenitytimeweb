import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { UserStory } from '@/hooks/useStories';
import { useStoryReactions } from '@/hooks/useStoryReactions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, Crown, User } from 'lucide-react';
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
  
  const displayName = story.is_anonymous 
    ? t('stories.anonymous')
    : (story.author?.display_name || t('stories.anonymous'));
  
  const avatarUrl = story.is_anonymous ? null : story.author?.avatar_url;
  
  const timeAgo = formatDistanceToNow(
    new Date(story.last_comment_at || story.created_at),
    { addSuffix: true, locale }
  );

  // Get first 150 chars of content for preview
  const contentPreview = story.content.length > 150 
    ? story.content.slice(0, 150) + '...'
    : story.content;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]",
        "bg-card/80 backdrop-blur-sm border-border/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary">
            {story.is_anonymous ? (
              <User className="h-5 w-5" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          {/* Author name and badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {displayName}
            </span>
            {story.is_premium && !story.is_anonymous && (
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            {story.is_anonymous && (
              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                {t('stories.anonymousBadge')}
              </Badge>
            )}
          </div>
          
          {/* Title if exists */}
          {story.title && (
            <h3 className="font-semibold text-foreground mt-1 line-clamp-1 break-words [overflow-wrap:anywhere]">
              {story.title}
            </h3>
          )}
          
          {/* Content preview */}
          <p className="text-muted-foreground text-sm mt-1 line-clamp-3 break-words [overflow-wrap:anywhere]">
            {contentPreview}
          </p>
          
          {/* Stats and Reactions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {story.comment_count}
              </span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
            
            {/* Reactions */}
            <div onClick={(e) => e.stopPropagation()}>
              <ReactionButtons
                counts={counts}
                userReactions={userReactions}
                onToggle={toggleReaction}
                size="sm"
                disabled={!user || isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
