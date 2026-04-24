import { useState, memo, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, useMotionValue, useTransform, PanInfo, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Heart, FileText, Download, Pencil, Trash2, Check, X, Reply, Pin, Flag, CheckCheck, MessageCircle, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useCommunityReactions } from '@/hooks/useCommunityReactions';
import { ReportModal } from './ReportModal';
import { parseMentions } from '@/hooks/useMentions';
import { CEO_USER_ID } from '@/lib/constants';
import { CEOAvatar } from '@/components/common/CEOAvatar';
import { CEOBadge } from '@/components/common/CEOBadge';

interface ReplyMessage {
  id: string;
  content: string;
  author?: {
    display_name: string | null;
  };
}

interface CommunityMessageProps {
  message: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    media_url?: string | null;
    media_type?: string | null;
    reply_to_id?: string | null;
    is_premium?: boolean;
    author?: {
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  isOwn: boolean;
  isAdmin?: boolean;
  isPinned?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onEdit?: (id: string, newContent: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onReply?: () => void;
  onPin?: (messageId: string) => Promise<void>;
  onUnpin?: (messageId: string) => Promise<void>;
  replyToMessage?: ReplyMessage;
  readCount?: number;
  onVisible?: () => void;
  onUserClick?: (userId: string) => void;
  onStartChat?: (userId: string) => void;
}

const EMOJI_AVATARS = ['🌿', '🌸', '🌊', '🌻', '🍀', '🦋', '🌈', '✨', '🌙', '☀️'];
const SWIPE_THRESHOLD = 60;


// Heart like button with animation (Twitter/VK style)
const LikeButton = memo(({ 
  messageId, 
  isLiked, 
  likeCount, 
  onToggle 
}: { 
  messageId: string;
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!isLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    onToggle();
  };

  return (
    <motion.button
      onClick={handleClick}
      className="flex items-center gap-1.5 group/like"
      whileTap={{ scale: 0.9 }}
    >
      <div className="relative">
        <motion.div
          animate={isAnimating ? {
            scale: [1, 1.3, 1],
          } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart 
            className={cn(
              "h-4 w-4 transition-colors",
              isLiked 
                ? "fill-red-500 text-red-500" 
                : "text-muted-foreground group-hover/like:text-red-400"
            )} 
          />
        </motion.div>
        
        {/* Particle burst animation */}
        {isAnimating && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-red-500"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i * 60) * Math.PI / 180) * 16,
                  y: Math.sin((i * 60) * Math.PI / 180) * 16,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </div>
      
      {likeCount > 0 && (
        <span className={cn(
          "text-xs font-medium transition-colors",
          isLiked ? "text-red-500" : "text-muted-foreground"
        )}>
          {likeCount}
        </span>
      )}
    </motion.button>
  );
});

export function CommunityMessage({ 
  message, 
  isOwn, 
  isAdmin, 
  isPinned, 
  isFirstInGroup = true,
  isLastInGroup = true,
  onEdit, 
  onDelete, 
  onReply, 
  onPin, 
  onUnpin, 
  replyToMessage,
  readCount = 0,
  onVisible,
  onUserClick,
  onStartChat
}: CommunityMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection observer for marking messages as read
  useEffect(() => {
    if (!onVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onVisible();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [onVisible]);
  const [editContent, setEditContent] = useState(message.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toggleReaction, hasReacted, getReactionCount } = useCommunityReactions(message.id);
  
  // Swipe gesture - Telegram style (swipe RIGHT to reply)
  const x = useMotionValue(0);
  const controls = useAnimation();
  const replyIconOpacity = useTransform(x, [0, 20, SWIPE_THRESHOLD], [0, 0.5, 1]);
  const replyIconScale = useTransform(x, [0, 20, SWIPE_THRESHOLD], [0.5, 0.7, 1]);
  const replyIconX = useTransform(x, [0, SWIPE_THRESHOLD], [-40, 0]);
  
  // Generate consistent emoji avatar based on message id
  const emojiIndex = message.id.charCodeAt(0) % EMOJI_AVATARS.length;
  const emojiAvatar = EMOJI_AVATARS[emojiIndex];
  
  const displayName = message.author?.display_name || 'Аноним';
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { 
    addSuffix: false, 
    locale: ru 
  });

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim()) return;
    setIsSaving(true);
    await onEdit(message.id, editContent.trim());
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(message.id);
    setShowDeleteDialog(false);
    setIsDeleting(false);
  };

  const isLiked = hasReacted('like');
  const likeCount = getReactionCount('like');

  const handleToggleLike = () => {
    toggleReaction('like');
  };


  const renderMedia = () => {
    if (!message.media_url) return null;

    if (message.media_type === 'image') {
      return (
        <img 
          src={message.media_url} 
          alt="Вложение" 
          className="rounded-xl max-w-full max-h-64 object-cover mt-2 cursor-pointer"
          onClick={() => window.open(message.media_url!, '_blank')}
        />
      );
    }

    if (message.media_type === 'video') {
      return (
        <video 
          src={message.media_url} 
          controls 
          className="rounded-xl max-w-full max-h-64 mt-2"
        />
      );
    }

    // File type
    const fileName = message.media_url.split('/').pop() || 'Файл';
    return (
      <a 
        href={message.media_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 p-2 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
      >
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-foreground truncate flex-1">{fileName}</span>
        <Download className="h-4 w-4 text-muted-foreground" />
      </a>
    );
  };

  // Telegram-style swipe RIGHT to reply
  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD && onReply) {
      // Haptic feedback at threshold
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onReply();
    }
    // Smooth spring animation back to origin
    await controls.start({ 
      x: 0, 
      transition: { type: "spring", stiffness: 500, damping: 30 } 
    });
  };

  return (
    <>
      <div className="relative overflow-hidden" ref={containerRef} id={`message-${message.id}`}>
        {/* Swipe reply indicator - LEFT side (Telegram style) */}
        <motion.div 
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-primary/20"
          style={{ opacity: replyIconOpacity, scale: replyIconScale, x: replyIconX }}
        >
          <Reply className="h-5 w-5 text-primary" />
        </motion.div>

        <motion.div
          drag={isEditing ? false : "x"}
          dragConstraints={{ left: 0, right: 100 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ x }}
          animate={controls}
          className={cn(
            "flex gap-2.5 group",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Avatar - show only for first message in group */}
          {!isOwn && (
            <div className="w-12 pl-1 shrink-0 pt-1">
              {isFirstInGroup ? (
                <button
                  onClick={() => onUserClick?.(message.user_id)}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  className="relative flex justify-center group/avatar cursor-pointer"
                >
                  {message.user_id === CEO_USER_ID ? (
                    <CEOAvatar size="md" />
                  ) : (
                    <>
                      {/* Ring wrapper for premium - prevents clipping */}
                      <div className={cn(
                        "rounded-full transition-all",
                        message.is_premium && "ring-2 ring-amber-400 ring-offset-2 ring-offset-background",
                        "group-hover/avatar:ring-2 group-hover/avatar:ring-primary/50"
                      )}>
                        <Avatar className="h-9 w-9">
                          {message.author?.avatar_url ? (
                            <AvatarImage src={message.author.avatar_url} alt={displayName} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-pink-100 dark:from-blue-500/20 dark:to-pink-500/20 text-lg">
                              {emojiAvatar}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                      {/* Premium star badge */}
                      {message.is_premium && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-sm z-10">
                          <span className="text-[8px]">⭐</span>
                        </div>
                      )}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          )}
          
          {/* Message bubble - clickable for action sheet */}
          <div className="max-w-[75%] flex flex-col">
            <div
              onClick={() => !isEditing && setShowActionSheet(true)}
              className={cn(
                "rounded-2xl px-3.5 py-2.5 relative cursor-pointer active:opacity-80 transition-opacity",
                isOwn
                  ? "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20"
                  : "bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-500/10 dark:to-sky-500/10",
                // Bubble tail based on position in group
                isOwn 
                  ? isLastInGroup ? "rounded-br-md" : ""
                  : isLastInGroup ? "rounded-bl-md" : ""
              )}
            >
              {/* Telegram-style Reply preview */}
              {replyToMessage && (
                <div 
                  className={cn(
                    "flex gap-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity",
                    "border-l-[3px] pl-2 py-0.5",
                    isOwn 
                      ? "border-emerald-600 dark:border-white/50" 
                      : "border-emerald-500"
                  )}
                  onClick={() => {
                    const element = document.getElementById(`message-${replyToMessage.id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      element.classList.add('bg-primary/10');
                      setTimeout(() => element.classList.remove('bg-primary/10'), 2000);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-xs font-semibold truncate"
                      style={{ color: 'hsl(var(--reply-author-color))' }}
                    >
                      {replyToMessage.author?.display_name || 'Аноним'}
                    </p>
                    <p 
                      className="text-sm truncate"
                      style={{ color: 'hsl(var(--reply-content-color))' }}
                    >
                      {replyToMessage.content}
                    </p>
                  </div>
                </div>
              )}

              {/* Author name + Premium badge + time (inline) - only for first in group */}
              {!isOwn && isFirstInGroup && (
                <div className="flex items-center gap-2 mb-0.5">
                  <button
                    onClick={() => onUserClick?.(message.user_id)}
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className="text-xs font-semibold transition-colors text-primary hover:text-primary/80 cursor-pointer hover:underline"
                  >
                    {displayName}
                  </button>
                  {message.user_id === CEO_USER_ID && <CEOBadge />}
                  <span className="text-[10px] text-muted-foreground/60">
                    {timeAgo}
                  </span>
                </div>
              )}
              
              {/* Content or Edit mode */}
              {isEditing ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
                    className="min-h-[60px] text-sm bg-background/50 border-border/50"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="h-7 px-2"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Отмена
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSaving || !editContent.trim()}
                      className="h-7 px-2"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Сохранить
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {message.content && (
                    <p className="text-sm text-foreground leading-relaxed">
                      {parseMentions(message.content).map((part, idx) => 
                        part.type === 'mention' ? (
                          <span key={idx} className="text-primary font-medium bg-primary/10 rounded px-0.5">
                            {part.content}
                          </span>
                        ) : (
                          <span key={idx}>{part.content}</span>
                        )
                      )}
                    </p>
                  )}

                  {/* Media */}
                  {renderMedia()}
                </>
              )}
            </div>
            
            {/* Bottom row: like + time (for own) */}
            {!isEditing && (
              <div className={cn(
                "flex items-center gap-3 mt-1 px-1",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}>
                {/* Like button */}
                <LikeButton 
                  messageId={message.id}
                  isLiked={isLiked}
                  likeCount={likeCount}
                  onToggle={handleToggleLike}
                />
                
                {/* Time + read status for own messages */}
                {(isOwn || !isFirstInGroup) && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground/60">
                      {timeAgo}
                    </span>
                    {/* Read receipts - WhatsApp style */}
                    {isOwn && (
                      <div className="flex items-center">
                        {readCount > 0 ? (
                          // Blue double check = read by someone
                          <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          // Grey double check = delivered
                          <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action Sheet - Bottom Drawer */}
      <Drawer open={showActionSheet} onOpenChange={setShowActionSheet}>
        <DrawerContent className="px-4 pb-8 pt-2">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base font-medium text-center">Действия</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            {/* Reply */}
            {onReply && (
              <Button
                variant="ghost"
                className="justify-start h-12 text-base"
                onClick={() => {
                  setShowActionSheet(false);
                  onReply();
                }}
              >
                <Reply className="h-5 w-5 mr-3" />
                Ответить
              </Button>
            )}

            {/* Own message actions */}
            {isOwn && (
              <>
                <Button
                  variant="ghost"
                  className="justify-start h-12 text-base"
                  onClick={() => {
                    setShowActionSheet(false);
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-5 w-5 mr-3" />
                  Редактировать
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start h-12 text-base text-destructive hover:text-destructive"
                  onClick={() => {
                    setShowActionSheet(false);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-5 w-5 mr-3" />
                  Удалить
                </Button>
              </>
            )}

            {/* Actions for other users' messages */}
            {!isOwn && (
              <>
                {/* View Profile */}
                <Button
                  variant="ghost"
                  className="justify-start h-12 text-base"
                  onClick={() => {
                    setShowActionSheet(false);
                    onUserClick?.(message.user_id);
                  }}
                >
                  <User className="h-5 w-5 mr-3" />
                  Профиль
                </Button>

                {/* Start Private Chat */}
                {onStartChat && (
                  <Button
                    variant="ghost"
                    className="justify-start h-12 text-base text-primary"
                    onClick={() => {
                      setShowActionSheet(false);
                      onStartChat(message.user_id);
                    }}
                  >
                    <MessageCircle className="h-5 w-5 mr-3" />
                    Написать в личку
                  </Button>
                )}

                {/* Report */}
                <Button
                  variant="ghost"
                  className="justify-start h-12 text-base text-amber-600"
                  onClick={() => {
                    setShowActionSheet(false);
                    setShowReportModal(true);
                  }}
                >
                  <Flag className="h-5 w-5 mr-3" />
                  Пожаловаться
                </Button>
              </>
            )}

            {/* Admin/Moderator actions */}
            {isAdmin && !isOwn && (
              <>
                <div className="h-px bg-border my-2" />
                {isPinned ? (
                  <Button
                    variant="ghost"
                    className="justify-start h-12 text-base"
                    onClick={() => {
                      setShowActionSheet(false);
                      onUnpin?.(message.id);
                    }}
                  >
                    <Pin className="h-5 w-5 mr-3" fill="currentColor" />
                    Открепить
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="justify-start h-12 text-base"
                    onClick={() => {
                      setShowActionSheet(false);
                      onPin?.(message.id);
                    }}
                  >
                    <Pin className="h-5 w-5 mr-3" />
                    Закрепить
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="justify-start h-12 text-base text-destructive hover:text-destructive"
                  onClick={() => {
                    setShowActionSheet(false);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-5 w-5 mr-3" />
                  Удалить (модерация)
                </Button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сообщение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сообщение будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report modal */}
      <ReportModal
        messageId={message.id}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </>
  );
}

// Date separator component
export function DateSeparator({ date }: { date: Date }) {
  let label: string;
  
  if (isToday(date)) {
    label = 'Сегодня';
  } else if (isYesterday(date)) {
    label = 'Вчера';
  } else {
    label = format(date, 'd MMMM', { locale: ru });
  }

  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 rounded-full bg-muted/60 backdrop-blur-sm">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
