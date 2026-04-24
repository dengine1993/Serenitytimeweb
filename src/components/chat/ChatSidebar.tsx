import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Hash, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ChatTopic {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  messages_count: number;
}

interface PrivateConversation {
  id: string;
  type: string;
  last_message?: {
    content: string;
    created_at: string;
  };
  participants: Array<{
    user_id: string;
    profiles: {
      id: string;
      display_name?: string;
      username: string;
      avatar_url?: string;
    };
  }>;
}

interface ChatSidebarProps {
  topics: ChatTopic[];
  conversations: PrivateConversation[];
  currentUserId: string | null;
  selectedChatId: string | null;
  selectedChatType: "topic" | "private" | null;
  onSelectChat: (id: string, type: "topic" | "private") => void;
}

const colorMap: Record<string, string> = {
  amber: "from-amber-500/20 to-orange-500/20",
  purple: "from-purple-500/20 to-indigo-500/20",
  blue: "from-blue-500/20 to-cyan-500/20",
  green: "from-green-500/20 to-emerald-500/20",
  red: "from-red-500/20 to-pink-500/20",
};

export const ChatSidebar = ({
  topics,
  conversations,
  currentUserId,
  selectedChatId,
  selectedChatType,
  onSelectChat,
}: ChatSidebarProps) => {
  const getOtherParticipant = (conv: PrivateConversation) => {
    return conv.participants.find(p => p.user_id !== currentUserId)?.profiles;
  };

  const getConversationTitle = (conv: PrivateConversation) => {
    const other = getOtherParticipant(conv);
    return other?.display_name || other?.username || "Неизвестный";
  };

  const getLastMessagePreview = (conv: PrivateConversation) => {
    if (!conv.last_message) return "Начните общение";
    const content = conv.last_message.content;
    return content.length > 40 ? content.substring(0, 40) + "..." : content;
  };

  const isSelected = (id: string, type: "topic" | "private") => {
    return selectedChatId === id && selectedChatType === type;
  };

  return (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-md border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-foreground mb-3">Чаты</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск"
            className="pl-10 bg-background/50 border-white/10"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Topics */}
          {topics.map((topic) => (
            <Card
              key={`topic-${topic.id}`}
              onClick={() => onSelectChat(topic.id, "topic")}
              className={`p-3 cursor-pointer transition-all hover:bg-accent/50 ${
                isSelected(topic.id, "topic")
                  ? "bg-accent border-primary"
                  : "bg-card/30 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="w-3 h-3 text-primary" />
                    <h3 className="font-semibold text-foreground truncate text-sm">
                      {topic.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {topic.description}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {topic.messages_count || 0}
                </Badge>
              </div>
            </Card>
          ))}

          {/* Private Chats */}
          {conversations.map((conv) => {
            const other = getOtherParticipant(conv);
            return (
              <Card
                key={`conv-${conv.id}`}
                onClick={() => onSelectChat(conv.id, "private")}
                className={`p-3 cursor-pointer transition-all hover:bg-accent/50 ${
                  isSelected(conv.id, "private")
                    ? "bg-accent border-primary"
                    : "bg-card/30 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={other?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(other?.display_name || other?.username || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate text-sm">
                      {getConversationTitle(conv)}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {getLastMessagePreview(conv)}
                    </p>
                  </div>
                  {conv.last_message && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message.created_at), {
                        addSuffix: false,
                        locale: ru,
                      })}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
