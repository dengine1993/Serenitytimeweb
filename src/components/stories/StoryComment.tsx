import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { StoryComment as StoryCommentType } from '@/hooks/useStoryComments';
import { useCommentReactions } from '@/hooks/useStoryReactions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { Crown, User, Trash2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactionButtons } from './ReactionButtons';

interface StoryCommentProps {
  comment: StoryCommentType;
  isOwn: boolean;
  isStoryAuthor: boolean;
  canDelete: boolean;
  onDelete: () => void;
}

export function StoryComment({ 
  comment, 
  isOwn, 
  isStoryAuthor, 
  canDelete, 
  onDelete 
}: StoryCommentProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const locale = language === 'ru' ? ru : enUS;
  
  const { counts, userReactions, toggleReaction, isLoading } = useCommentReactions(comment.id);
  
  const displayName = comment.is_anonymous 
    ? t('stories.anonymous')
    : (comment.author?.display_name || t('stories.anonymous'));
  
  const avatarUrl = comment.is_anonymous ? null : comment.author?.avatar_url;
  
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { 
    addSuffix: true, 
    locale 
  });

  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-xl transition-colors",
      isOwn ? "bg-primary/5" : "hover:bg-muted/30"
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {comment.is_anonymous ? (
            <User className="h-4 w-4" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{displayName}</span>
          
          {comment.is_premium && !comment.is_anonymous && (
            <Crown className="h-3 w-3 text-amber-500" />
          )}
          
          {isStoryAuthor && !comment.is_anonymous && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
              <BookOpen className="h-3 w-3" />
              {t('stories.author')}
            </Badge>
          )}
          
          {comment.is_anonymous && (
            <Badge variant="secondary" className="text-xs py-0 px-1.5">
              {t('stories.anonymousBadge')}
            </Badge>
          )}
          
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        
        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
          {comment.content}
        </p>
        
        {/* Reactions */}
        <div className="mt-2">
          <ReactionButtons
            counts={counts}
            userReactions={userReactions}
            onToggle={toggleReaction}
            size="sm"
            disabled={!user || isLoading}
          />
        </div>
      </div>
      
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
