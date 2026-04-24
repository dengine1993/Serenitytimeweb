import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { MessageInput } from "./MessageInput";
import { Hash, ArrowLeft, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_anonymous?: boolean;
  media_urls?: string[];
  media_type?: string;
  profiles?: {
    id: string;
    display_name?: string;
    username: string;
    avatar_url?: string;
  };
}

interface ChatWindowProps {
  chatId: string;
  chatType: "topic" | "private";
  chatTitle: string;
  chatEmoji?: string;
  messages: Message[];
  currentUserId: string | null;
  onSendMessage: (content: string, mediaUrls?: string[], mediaType?: string) => void;
  loading?: boolean;
  onBack?: () => void;
}

export const ChatWindow = ({
  chatTitle,
  chatEmoji,
  chatType,
  messages,
  currentUserId,
  onSendMessage,
  loading,
  onBack,
}: ChatWindowProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMedia = (message: Message) => {
    if (!message.media_urls || message.media_urls.length === 0) return null;

    switch (message.media_type) {
      case "image":
        return (
          <div className="mt-2">
            <img 
              src={message.media_urls[0]} 
              alt="Изображение" 
              className="max-w-sm rounded-lg"
            />
          </div>
        );
      case "document":
        return (
          <div className="mt-2 flex items-center gap-2 p-2 bg-accent/50 rounded-lg max-w-sm">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm truncate">{message.content}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-background/95 backdrop-blur-md">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        {chatType === "topic" ? (
          <>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
              {chatEmoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">{chatTitle}</h2>
              </div>
              <p className="text-xs text-muted-foreground">Онлайн-поддержка</p>
            </div>
          </>
        ) : (
          <>
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {chatTitle[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">{chatTitle}</h2>
              <p className="text-xs text-muted-foreground">был(а) недавно</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Загрузка сообщений...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-muted-foreground">Пока нет сообщений. Начните обсуждение!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.user_id === currentUserId;
              const displayName = msg.is_anonymous
                ? "Аноним"
                : msg.profiles?.display_name || msg.profiles?.username || "Пользователь";

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={msg.profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && (
                      <span className="text-xs text-primary font-medium mb-1">
                        {displayName}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-accent text-accent-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                      {renderMedia(msg)}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-white/10 bg-background/95 backdrop-blur-md p-4 relative z-20">
        <MessageInput onSend={onSendMessage} disabled={loading} />
      </div>
    </div>
  );
};
