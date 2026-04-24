import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStoryComments } from '@/hooks/useStoryComments';
import { useStoryReactions } from '@/hooks/useStoryReactions';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { UserStory } from '@/hooks/useStories';
import { StoryComment } from './StoryComment';
import { ReactionButtons } from './ReactionButtons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Crown, 
  User, 
  Send,
  Loader2,
  MoreVertical,
  EyeOff,
  Trash2,
  MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface StoryScreenProps {
  storyId: string;
  initialStory?: UserStory;
  onBack: () => void;
}

export function StoryScreen({ storyId, initialStory, onBack }: StoryScreenProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const locale = language === 'ru' ? ru : enUS;
  
  const [story, setStory] = useState<UserStory | null>(initialStory || null);
  const [isLoadingStory, setIsLoadingStory] = useState(!initialStory);
  const [isStoryExpanded, setIsStoryExpanded] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  const { comments, isLoading: isLoadingComments, sendComment, deleteComment } = useStoryComments(storyId);
  const { counts, userReactions, toggleReaction, isLoading: isReactionLoading } = useStoryReactions(storyId);

  // Load story details (skip if initialStory was provided)
  useEffect(() => {
    // If we already have story data for this storyId, skip the fetch
    if (story && story.id === storyId) return;

    let cancelled = false;
    const loadStory = async () => {
      setIsLoadingStory(true);
      
      const { data, error } = await supabase
        .from('user_stories')
        .select('*')
        .eq('id', storyId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        toast.error(t('stories.storyNotFound'));
        onBack();
        return;
      }

      let author = undefined;
      let is_premium = false;

      if (!data.is_anonymous) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', data.user_id)
          .maybeSingle();

        const { data: premiumIds } = await supabase
          .rpc('get_premium_user_ids', { user_ids: [data.user_id] });

        if (cancelled) return;

        author = profile || undefined;
        is_premium = premiumIds?.includes(data.user_id) || false;
      }

      setStory({ ...data, author, is_premium });
      setIsLoadingStory(false);
    };

    loadStory();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  const handleSendComment = async () => {
    if (!commentText.trim() || isSending) return;

    setIsSending(true);
    const result = await sendComment(commentText, isAnonymous);
    setIsSending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      setCommentText('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteComment(commentId);
    if (result.error) {
      toast.error(result.error);
    }
  };

  const handleHideStory = async () => {
    if (!story || !user) return;

    const { error } = await supabase
      .from('user_stories')
      .update({ is_hidden: true })
      .eq('id', story.id)
      .eq('user_id', user.id);

    if (error) {
      toast.error(t('common.error'));
    } else {
      toast.success(t('stories.storyHidden'));
      onBack();
    }
  };

  const handleDeleteStory = async () => {
    if (!story) return;

    const { error } = await supabase
      .from('user_stories')
      .delete()
      .eq('id', story.id);

    if (error) {
      toast.error(t('common.error'));
    } else {
      toast.success(t('stories.storyDeleted'));
      onBack();
    }
  };

  if (isLoadingStory || !story) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const isOwner = user?.id === story.user_id;
  const canModerate = isAdmin;
  
  const displayName = story.is_anonymous 
    ? t('stories.anonymous')
    : (story.author?.display_name || t('stories.anonymous'));
  
  const avatarUrl = story.is_anonymous ? null : story.author?.avatar_url;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-3 border-b border-border/30 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-8 w-8">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {story.is_anonymous ? <User className="h-4 w-4" /> : displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">{displayName}</span>
            {story.is_premium && !story.is_anonymous && (
              <Crown className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(story.created_at), 'd MMM yyyy', { locale })}
          </p>
        </div>

        {(isOwner || canModerate) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <DropdownMenuItem onClick={handleHideStory} className="text-amber-600">
                  <EyeOff className="h-4 w-4 mr-2" />
                  {t('stories.hideStory')}
                </DropdownMenuItem>
              )}
              {(isOwner || canModerate) && (
                <DropdownMenuItem onClick={handleDeleteStory} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('stories.deleteStory')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div>
          {/* Pinned story (collapsible) */}
          <Collapsible open={isStoryExpanded} onOpenChange={setIsStoryExpanded}>
            <div className="p-4 bg-primary/5 border-b border-border/30">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">
                    📖 {t('stories.pinnedStory')}
                  </span>
                  {isStoryExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-3 space-y-2">
                  {story.title && (
                    <h2 className="font-semibold text-lg break-words [overflow-wrap:anywhere]">{story.title}</h2>
                  )}
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                    {story.content}
                  </p>
                  
                  {/* Story Reactions */}
                  <div className="mt-4 pt-3 border-t border-border/30">
                    <ReactionButtons
                      counts={counts}
                      userReactions={userReactions}
                      onToggle={toggleReaction}
                      size="md"
                      disabled={!user || isReactionLoading}
                    />
                  </div>
                </div>
              </CollapsibleContent>
              
              {!isStoryExpanded && (
                <p className="text-muted-foreground text-sm mt-2 line-clamp-2 break-words [overflow-wrap:anywhere]">
                  {story.content.slice(0, 100)}...
                </p>
              )}
            </div>
          </Collapsible>

          {/* Comments section */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {t('stories.commentsCount', { count: story.comment_count })}
              </span>
            </div>

            {isLoadingComments ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('stories.noComments')}</p>
                <p className="text-xs mt-1">{t('stories.beFirst')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id}>
                      <StoryComment
                        comment={comment}
                        isOwn={comment.user_id === user?.id}
                        isStoryAuthor={comment.user_id === story.user_id}
                        canDelete={comment.user_id === user?.id || canModerate}
                        onDelete={() => handleDeleteComment(comment.id)}
                      />
                    </div>
                  ))}
                </div>
            )}
            
            <div ref={commentsEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Comment input */}
      {user && (
        <div className="shrink-0 p-3 bg-background/95 backdrop-blur-sm border-t border-border/30 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder={t('stories.commentPlaceholder')}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[60px] resize-none"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                  />
                  {t('stories.anonymousLabel')}
                </label>
                <span className="text-xs text-muted-foreground">
                  {commentText.length}/1000
                </span>
              </div>
            </div>
            <Button
              onClick={handleSendComment}
              disabled={!commentText.trim() || isSending}
              size="icon"
              className="h-[60px] w-12 shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
