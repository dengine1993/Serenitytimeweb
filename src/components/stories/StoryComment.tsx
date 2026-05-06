import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { StoryComment as StoryCommentType } from '@/hooks/useStoryComments';
import { useCommentReactions } from '@/hooks/useStoryReactions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { Crown, Trash2, Pencil, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactionButtons } from './ReactionButtons';
import { InlineCommentEditor } from '@/components/comments/InlineCommentEditor';
import { useState } from 'react';

interface StoryCommentProps {
  comment: StoryCommentType;
  isOwn: boolean;
  isStoryAuthor: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onEdit?: (newContent: string) => Promise<void> | void;
}

export function StoryComment({
  comment,
  isOwn,
  isStoryAuthor,
  canDelete,
  onDelete,
  onEdit,
}: StoryCommentProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const locale = language === 'ru' ? ru : enUS;
  const [isEditing, setIsEditing] = useState(false);

  const { counts, userReactions, toggleReaction, isLoading } = useCommentReactions(comment.id);

  const rawName = comment.author?.display_name;
  const displayName = rawName && rawName.length >= 2 ? rawName : t('stories.fallbackName');
  const avatarUrl = comment.author?.avatar_url || undefined;

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale,
  });

  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-xl transition-colors group",
      isOwn ? "bg-primary/5" : "hover:bg-muted/30"
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="text-xs">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{displayName}</span>

          {comment.is_premium && (
            <Crown className="h-3 w-3 text-amber-500" />
          )}

          {isStoryAuthor && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1">
              <BookOpen className="h-3 w-3" />
              {t('stories.author')}
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">
            {timeAgo}{comment.edited_at ? ` · ${t('common.edited')}` : ''}
          </span>
        </div>

        {isEditing && onEdit ? (
          <div className="mt-2">
            <InlineCommentEditor
              initialValue={comment.content}
              maxLength={1000}
              onSave={async (text) => { await onEdit(text); setIsEditing(false); }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {comment.content}
          </p>
        )}

        {!isEditing && (
          <div className="mt-2">
            <ReactionButtons
              counts={counts}
              userReactions={userReactions}
              onToggle={toggleReaction}
              size="sm"
              disabled={!user || isLoading}
            />
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-start gap-1 shrink-0">
          {isOwn && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 text-muted-foreground hover:text-primary md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              aria-label={t('common.edit')}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
