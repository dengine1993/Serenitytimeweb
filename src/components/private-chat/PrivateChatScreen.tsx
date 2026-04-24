import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Send, 
  MoreVertical,
  Check,
  CheckCheck,
  Trash2,
  Flag,
  UserPlus,
  UserCheck,
  Users,
  Ban,
  Unlock,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { usePrivateMessages, PrivateMessage } from '@/hooks/usePrivateMessages';
import { usePrivateChats, PrivateConversation } from '@/hooks/usePrivateChats';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { useS3Upload } from '@/hooks/useS3Upload';
import { Progress } from '@/components/ui/progress';
import { compressImage, isAllowedInPrivateChat } from '@/lib/imageCompression';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PrivateChatScreenProps {
  conversationId: string;
  onBack: () => void;
}

export function PrivateChatScreen({ conversationId, onBack }: PrivateChatScreenProps) {
  const { user } = useAuth();
  const { deleteConversation } = usePrivateChats();
  const { isFriend, hasPendingRequest, sendFriendRequest, acceptRequest, getIncomingRequest, isBlocked, blockUser, unblockUser } = useFriends();
  const { 
    messages, 
    isLoading, 
    otherUserTyping, 
    sendMessage, 
    markAllAsRead,
    startTyping,
    stopTyping 
  } = usePrivateMessages(conversationId);
  
  const [inputValue, setInputValue] = useState('');
  const [otherUser, setOtherUser] = useState<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_online?: boolean;
    last_seen?: string;
  } | null>(null);
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: s3Upload, uploading: s3Uploading, progress: uploadProgress } = useS3Upload();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load other user info
  useEffect(() => {
    const loadOtherUser = async () => {
      // @ts-ignore
      const { data: conv } = await supabase
        .from('private_conversations')
        .select('user_id_1, user_id_2')
        .eq('id', conversationId)
        .single();

      if (!conv || !user) return;

      const otherId = conv.user_id_1 === user.id ? conv.user_id_2 : conv.user_id_1;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', otherId)
        .single();

      if (profile) {
        setOtherUser(profile);
      }
    };

    loadOtherUser();
  }, [conversationId, user]);

  // Mark messages as read when opening chat
  useEffect(() => {
    markAllAsRead();
  }, [conversationId, markAllAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const check = isAllowedInPrivateChat(file);
    if (!check.allowed) {
      toast.error(check.reason);
      e.target.value = '';
      return;
    }
    
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !selectedFile) return;
    
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    
    if (selectedFile) {
      let fileToUpload = selectedFile;
      
      // Compress images
      if (selectedFile.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(selectedFile);
        } catch (err) {
          console.warn('Compression failed, using original:', err);
        }
      }
      
      const result = await s3Upload(fileToUpload, 'chat');
      if (!result) {
        return; // Upload failed, error shown by hook
      }
      
      mediaUrl = result.publicUrl;
      if (selectedFile.type.startsWith('image/')) {
        mediaType = 'image';
      } else if (selectedFile.type.startsWith('video/')) {
        mediaType = 'video';
      } else {
        mediaType = 'file';
      }
    }
    
    const content = inputValue;
    setInputValue('');
    removeFile();
    
    await sendMessage(content, mediaUrl, mediaType);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    startTyping();
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleDeleteChat = async () => {
    if (confirm('Удалить этот чат? Это действие нельзя отменить.')) {
      await deleteConversation(conversationId);
      onBack();
      toast.success('Чат удалён');
    }
  };

  const handleBlockUser = async () => {
    if (!otherUser) return;
    
    if (confirm('Заблокировать пользователя? Вы больше не сможете получать от него сообщения.')) {
      const result = await blockUser(otherUser.user_id);
      if (result.success) {
        toast.success('Пользователь заблокирован');
      }
    }
  };

  const handleUnblockUser = async () => {
    if (!otherUser) return;
    
    const result = await unblockUser(otherUser.user_id);
    if (result.success) {
      toast.success('Пользователь разблокирован');
    }
  };

  const handleFriendAction = async () => {
    if (!otherUser) return;
    
    const userId = otherUser.user_id;
    
    if (isFriend(userId)) {
      toast.info('Вы уже друзья');
      return;
    }
    
    const pending = hasPendingRequest(userId);
    if (pending === 'incoming') {
      const request = getIncomingRequest(userId);
      if (request) {
        await acceptRequest(request.id);
        toast.success('Запрос принят!');
      }
    } else if (pending === 'outgoing') {
      toast.info('Запрос уже отправлен');
    } else {
      const result = await sendFriendRequest(userId);
      if (result.success) {
        toast.success('Запрос в друзья отправлен');
      }
    }
  };

  const name = otherUser?.display_name || 'Пользователь';
  const isUserFriend = otherUser ? isFriend(otherUser.user_id) : false;
  const pendingStatus = otherUser ? hasPendingRequest(otherUser.user_id) : null;
  const isUserBlocked = otherUser ? isBlocked(otherUser.user_id) : false;

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-sky-50/30 via-background to-background dark:from-slate-900/50">
      {/* Header - Telegram style */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0 -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser?.avatar_url || ''} />
          <AvatarFallback className="bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900 dark:to-blue-900 text-primary">
            {name[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-foreground truncate">
              {name}
            </h2>
            {isUserFriend && (
              <Users className="h-3.5 w-3.5 text-green-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {otherUserTyping ? (
              <span className="text-primary animate-pulse">печатает...</span>
            ) : (
              'в сети'
            )}
          </p>
        </div>

        {/* Add friend button */}
        {!isUserFriend && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFriendAction}
            className={cn(
              "shrink-0",
              pendingStatus === 'incoming' && "text-primary"
            )}
            title={pendingStatus === 'incoming' ? 'Принять запрос' : pendingStatus === 'outgoing' ? 'Запрос отправлен' : 'Добавить в друзья'}
          >
            {pendingStatus === 'incoming' ? (
              <UserCheck className="h-5 w-5" />
            ) : (
              <UserPlus className="h-5 w-5" />
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.info('Жалоба отправлена')}>
              <Flag className="h-4 w-4 mr-2" />
              Пожаловаться
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isUserBlocked ? (
              <DropdownMenuItem onClick={handleUnblockUser}>
                <Unlock className="h-4 w-4 mr-2" />
                Разблокировать
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={handleBlockUser}
                className="text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                Заблокировать
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={handleDeleteChat}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить чат
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-2 mt-auto">
            {/* Skeleton message bubbles */}
            <div className="flex items-end gap-2">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 w-48 h-12 animate-pulse" />
            </div>
            <div className="flex items-end gap-2 justify-end">
              <div className="bg-primary/20 rounded-2xl rounded-br-md px-4 py-3 w-56 h-14 animate-pulse" />
            </div>
            <div className="flex items-end gap-2">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 w-36 h-10 animate-pulse" />
            </div>
            <div className="flex items-end gap-2 justify-end">
              <div className="bg-primary/20 rounded-2xl rounded-br-md px-4 py-3 w-44 h-12 animate-pulse" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <Avatar className="h-16 w-16 mb-3">
              <AvatarImage src={otherUser?.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900 dark:to-blue-900 text-primary text-xl">
                {name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              Начни разговор с {name}
            </p>
          </div>
        ) : (
          <div className="mt-auto space-y-1">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === user?.id}
                  showAvatar={
                    index === 0 || 
                    messages[index - 1]?.sender_id !== message.sender_id
                  }
                  otherUserAvatar={otherUser?.avatar_url || ''}
                  otherUserName={name}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {/* Typing indicator */}
        {otherUserTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-2"
            role="status"
            aria-live="polite"
            aria-label={`${name} печатает`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser?.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-to-br from-sky-100 to-blue-100 text-primary text-xs">
                {name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Telegram style */}
      <div className="shrink-0 p-3 pb-safe border-t border-border/40 bg-background/80 backdrop-blur-sm">
        {isUserBlocked ? (
          <div className="flex items-center justify-center gap-3 py-2 text-center">
            <Ban className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Вы заблокировали этого пользователя</span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleUnblockUser}
              className="text-primary p-0 h-auto"
            >
              Разблокировать
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* File preview */}
            {selectedFile && (
              <div className="relative flex items-center gap-2 p-2 bg-muted/50 rounded-xl overflow-hidden">
                {/* Upload progress overlay */}
                {s3Uploading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10"
                  >
                    <div className="w-3/4">
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground">Загрузка... {uploadProgress}%</p>
                  </motion.div>
                )}
                
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-12 w-12 object-cover rounded-lg" />
                ) : (
                  <div className="h-12 w-12 flex items-center justify-center bg-muted rounded-lg">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} КБ
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  disabled={s3Uploading}
                  className="shrink-0 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex items-end gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Attachment button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={s3Uploading}
                className="shrink-0 rounded-full h-10 w-10"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {/* Emoji picker */}
              <div aria-label="Выбор эмодзи">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>

              {/* Text input */}
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  className="min-h-[44px] max-h-[120px] resize-none py-3 pr-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  rows={1}
                />
              </div>

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={(!inputValue.trim() && !selectedFile) || s3Uploading}
                size="icon"
                className="shrink-0 rounded-full bg-primary hover:bg-primary/90 h-11 w-11"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: PrivateMessage;
  isOwn: boolean;
  showAvatar: boolean;
  otherUserAvatar: string;
  otherUserName: string;
}

function MessageBubble({ message, isOwn, showAvatar, otherUserAvatar, otherUserName }: MessageBubbleProps) {
  const time = format(new Date(message.created_at), 'HH:mm', { locale: ru });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex items-end gap-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for other user */}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUserAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-sky-100 to-blue-100 text-primary text-xs">
                {otherUserName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Message bubble - Telegram-style soft colors */}
      <div
        className={cn(
          "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm",
          isOwn 
            ? "bg-emerald-500/85 dark:bg-emerald-600/80 text-white rounded-br-md" 
            : "bg-muted/80 text-foreground rounded-bl-md"
        )}
      >
        {/* Media */}
        {message.media_url && message.media_type === 'image' && (
          <img 
            src={message.media_url} 
            alt="Attachment" 
            className="rounded-lg max-w-full mb-2 cursor-pointer"
            onClick={() => window.open(message.media_url!, '_blank')}
          />
        )}
        
        {message.media_url && message.media_type === 'video' && (
          <video 
            src={message.media_url} 
            controls 
            className="rounded-lg max-w-full mb-2"
          />
        )}
        
        {message.media_url && message.media_type === 'file' && (
          <a 
            href={message.media_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg mb-2",
              isOwn ? "bg-white/20" : "bg-background/50"
            )}
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm truncate">Файл</span>
          </a>
        )}
        
        {/* Content */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
        
        {/* Time and read status */}
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[10px]",
            isOwn ? "text-white/70" : "text-muted-foreground"
          )}>
            {time}
          </span>
          {isOwn && (
            message.read_at ? (
              <CheckCheck className="h-3 w-3 text-white/70" />
            ) : (
              <Check className="h-3 w-3 text-white/70" />
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
