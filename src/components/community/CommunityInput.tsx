import { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Paperclip, X, Image, File, Reply, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMentions } from '@/hooks/useMentions';
import { MentionSuggestions } from './MentionSuggestions';
import { useS3Upload } from '@/hooks/useS3Upload';
import { compressImage, isAllowedInCommunity } from '@/lib/imageCompression';
import { Progress } from '@/components/ui/progress';

// Flying message bubble component
const FlyingBubble = memo(({ content, onComplete }: { content: string; onComplete: () => void }) => (
  <motion.div
    initial={{ opacity: 1, scale: 1, y: 0, x: 0 }}
    animate={{ 
      opacity: 0, 
      scale: 0.5, 
      y: -150, 
      x: 20,
      rotate: 5
    }}
    transition={{ 
      duration: 0.5, 
      ease: [0.32, 0.72, 0, 1] 
    }}
    onAnimationComplete={onComplete}
    className="absolute bottom-full right-4 mb-2 max-w-[200px] px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-sm shadow-lg pointer-events-none z-50"
  >
    <p className="line-clamp-2">{content || '📎'}</p>
  </motion.div>
));
// Convert emoji to Twemoji URL
const getTwemojiUrl = (emoji: string) => {
  const codePoints = [...emoji]
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join('-')
    .replace(/-fe0f/g, '');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoints}.svg`;
};

const TwemojiImg = memo(({ emoji, size = 24 }: { emoji: string; size?: number }) => (
  <img
    src={getTwemojiUrl(emoji)}
    alt={emoji}
    width={size}
    height={size}
    loading="lazy"
    className="inline-block"
    style={{ width: size, height: size }}
    onError={(e) => {
      const target = e.target as HTMLImageElement;
      target.style.display = 'none';
      target.parentElement?.insertAdjacentHTML('beforeend', `<span style="font-size: ${size}px">${emoji}</span>`);
    }}
  />
));

interface ReplyToMessage {
  id: string;
  content: string;
  author?: {
    display_name: string | null;
  };
}

interface CommunityInputProps {
  onSend: (content: string, mediaUrl?: string, mediaType?: string, replyToId?: string) => void;
  replyTo?: ReplyToMessage | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
  disabled?: boolean;
}

// Full emoji categories like Telegram
const emojiCategories = {
  smileys: {
    icon: '😊',
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤗", "🤭", "🤫", "🤔", "😏", "😌", "😔", "😪", "🤤", "😴", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱"],
  },
  gestures: {
    icon: '👋',
    emojis: ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪", "🦾", "👀", "👁", "👅", "👄", "💋"],
  },
  hearts: {
    icon: '❤️',
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  },
  nature: {
    icon: '🌿',
    emojis: ["🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "🥀", "🌱", "🌿", "☘️", "🍀", "🌴", "🌲", "🎋", "🎍", "🍃", "🍂", "🍁", "🌾", "🌵", "🌈", "☀️", "🌤", "⛅", "🌥", "☁️", "🌦", "🌧", "⛈", "🌩", "⚡", "❄️", "☃️", "⛄", "💨", "💧", "💦", "☔", "🌊"],
  },
  animals: {
    icon: '🦋',
    emojis: ["🦋", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐴", "🦄", "🐝", "🐛", "🐌", "🐞", "🐜", "🕷", "🐢", "🐍", "🦎", "🐙", "🦑", "🦐", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈"],
  },
  food: {
    icon: '🍕',
    emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🥦", "🥬", "🥒", "🌶", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🍞", "🥖", "🧀", "🍳", "🥞", "🧇", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥗", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🍩", "🍪", "🎂", "🍰", "🧁", "🍫", "🍬", "🍭", "🍿", "☕", "🍵", "🧃", "🥤", "🍺", "🍻", "🥂", "🍷"],
  },
  objects: {
    icon: '✨',
    emojis: ["✨", "⭐", "🌟", "💫", "⚡", "🔥", "💥", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🎾", "🎮", "🎯", "🎲", "🧩", "🎭", "🎨", "🎬", "🎤", "🎧", "🎵", "🎶", "🎹", "🎸", "🎺", "🎻", "📱", "💻", "⌨️", "📷", "📸", "🔮", "💎", "💰", "💳", "🔑", "🔒", "📚", "📖", "✏️", "🖊", "📝"],
  },
  symbols: {
    icon: '💯',
    emojis: ["💯", "💢", "💬", "👁‍🗨", "🗯", "💭", "💤", "💮", "♨️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🔶", "🔷", "🔸", "🔹", "✅", "❌", "❓", "❗", "‼️", "⁉️", "💲", "🔰", "⭕", "✖️", "➕", "➖", "➗", "♾️", "🔜", "🔝"],
  },
};

// Emoji picker component with tabs
function EmojiPickerPopover({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof emojiCategories>('smileys');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        className="w-[320px] p-0 rounded-2xl overflow-hidden"
        align="start"
      >
        {/* Category tabs */}
        <div className="flex items-center gap-0.5 p-2 border-b border-border bg-muted/30 overflow-x-auto">
          {Object.entries(emojiCategories).map(([key, { icon }]) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveCategory(key as keyof typeof emojiCategories)}
              className={cn(
                "p-1.5 rounded-lg transition-colors flex-shrink-0",
                activeCategory === key ? "bg-primary/20" : "hover:bg-muted"
              )}
            >
              <TwemojiImg emoji={icon} size={20} />
            </motion.button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="h-[200px] overflow-y-auto p-2">
          <div className="grid grid-cols-8 gap-1">
            {emojiCategories[activeCategory].emojis.map((emoji, idx) => (
              <motion.button
                key={`${emoji}-${idx}`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onEmojiSelect(emoji)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
              >
                <TwemojiImg emoji={emoji} size={22} />
              </motion.button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CommunityInput({ onSend, replyTo, onCancelReply, onTyping, disabled }: CommunityInputProps) {
  const [content, setContent] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [flyingMessage, setFlyingMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { upload: s3Upload, uploading: s3Uploading, progress: uploadProgress } = useS3Upload();

  const { suggestions, isLoading, isOpen, insertMention, closeSuggestions } = useMentions(content, cursorPosition);

  const handleSend = async () => {
    if ((!content.trim() && !selectedFile) || isSending || s3Uploading || disabled) return;
    
    // Trigger fly animation
    setFlyingMessage(content.trim() || (selectedFile ? '📎 ' + selectedFile.name : ''));
    
    setIsSending(true);
    
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (selectedFile) {
      let fileToUpload = selectedFile;

      // Compress images before upload
      if (selectedFile.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(selectedFile);
        } catch (err) {
          console.warn('Image compression failed, uploading original:', err);
        }
      }

      const result = await s3Upload(fileToUpload, 'community');
      
      if (!result) {
        setIsSending(false);
        setFlyingMessage(null);
        return;
      }

      mediaUrl = result.publicUrl;
      mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
    }

    await onSend(content, mediaUrl, mediaType, replyTo?.id);
    setContent('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isOpen) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && isOpen) {
      closeSuggestions();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value.slice(0, 500));
    setCursorPosition(e.target.selectionStart || 0);
    onTyping?.();
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0);
  };

  const handleMentionSelect = (profile: any) => {
    const newContent = insertMention(profile);
    setContent(newContent);
    closeSuggestions();
    textareaRef.current?.focus();
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size for community
    const check = isAllowedInCommunity(file);
    if (!check.allowed) {
      toast.error(check.reason);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Paperclip className="h-5 w-5" />;
    if (selectedFile.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (selectedFile.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,16px))] sm:bottom-24 left-0 right-0 z-30 px-2 sm:px-4 pb-safe">
      <div className="max-w-3xl mx-auto relative">
        {/* Flying message animation */}
        <AnimatePresence>
          {flyingMessage && (
            <FlyingBubble 
              content={flyingMessage} 
              onComplete={() => setFlyingMessage(null)} 
            />
          )}
        </AnimatePresence>

        {/* Mention suggestions */}
        <MentionSuggestions
          suggestions={suggestions}
          isLoading={isLoading}
          isOpen={isOpen}
          onSelect={handleMentionSelect}
          onClose={closeSuggestions}
        />

        {/* Reply preview */}
        {replyTo && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 p-2 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-10 rounded-full bg-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Reply className="h-3 w-3" />
                  {replyTo.author?.display_name || 'Аноним'}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {replyTo.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancelReply}
                className="shrink-0 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* File preview */}
        {selectedFile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 p-2 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50 relative overflow-hidden"
          >
            {/* Upload progress overlay */}
            {s3Uploading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 rounded-2xl"
              >
                <div className="w-3/4">
                  <Progress value={uploadProgress} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">Загрузка... {uploadProgress}%</p>
              </motion.div>
            )}
            
            <div className="flex items-center gap-3">
              {previewUrl && selectedFile.type.startsWith('image/') ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded-xl"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  {getFileIcon()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} МБ
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                disabled={s3Uploading}
                className="shrink-0 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl">
          {/* File attachment - only images and PDFs for community */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-full h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground"
            aria-label="Прикрепить фото или PDF"
          >
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Emoji picker with tabs */}
          <EmojiPickerPopover onEmojiSelect={addEmoji} />

          {/* Input */}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            className="flex-1 min-h-[36px] sm:min-h-[40px] max-h-[100px] sm:max-h-[120px] py-2 sm:py-2.5 px-2 sm:px-4 border-0 bg-transparent resize-none text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0"
            rows={1}
          />

          {/* Send button */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleSend}
              disabled={(!content.trim() && !selectedFile) || isSending || disabled}
              size="icon"
              aria-label="Отправить сообщение"
              className={cn(
                "shrink-0 rounded-full h-9 w-9 sm:h-10 sm:w-10 transition-all",
                (content.trim() || selectedFile)
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        {/* Character count */}
        {content.length > 400 && (
          <p className={cn(
            "text-xs text-right mt-1 pr-2",
            content.length >= 500 ? "text-destructive" : "text-muted-foreground"
          )}>
            {content.length}/500
          </p>
        )}
      </div>
    </div>
  );
}
