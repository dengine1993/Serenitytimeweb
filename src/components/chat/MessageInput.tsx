import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Image as ImageIcon, FileText, Video } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/hooks/useI18n";
import { useS3Upload } from "@/hooks/useS3Upload";
import { compressImage, isAllowedInPrivateChat } from "@/lib/imageCompression";

interface MessageInputProps {
  onSend: (content: string, mediaUrls?: string[], mediaType?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput = ({ onSend, disabled, placeholder = "Сообщение..." }: MessageInputProps) => {
  const { t } = useI18n();
  const { upload: s3Upload, uploading } = useS3Upload();
  const [message, setMessage] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadFile = async (file: File, type: "image" | "video" | "document") => {
    try {
      // Check if file is allowed
      const check = isAllowedInPrivateChat(file);
      if (!check.allowed) {
        toast.error(check.reason);
        return;
      }

      let fileToUpload = file;

      // Compress images before upload
      if (type === "image" && file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file);
        } catch (err) {
          console.warn('Image compression failed, uploading original:', err);
        }
      }

      const result = await s3Upload(fileToUpload, 'chat');
      
      if (!result) return;

      onSend(file.name, [result.publicUrl], type);
      setAttachmentMenuOpen(false);
      
      const successMessages = {
        image: t("chat.imageSent"),
        video: "Видео отправлено",
        document: t("chat.fileSent"),
      };
      toast.success(successMessages[type]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t("chat.uploadError"));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "document") => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, type);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <div className="border-t border-white/10 bg-background/95 backdrop-blur-md p-4">
      <div className="flex items-end gap-2">
        {/* Attachment Menu */}
        <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              disabled={disabled || uploading}
              className="text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Фото
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
              >
                <Video className="w-4 h-4 mr-2" />
                Видео (до 10 МБ)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <FileText className="w-4 h-4 mr-2" />
                Документ
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => handleFileSelect(e, "image")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => handleFileSelect(e, "video")}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFileSelect(e, "document")}
        />

        {/* Message Input */}
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || uploading}
            className="pr-12 bg-background/50 border-white/10"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || uploading}
          size="icon"
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
