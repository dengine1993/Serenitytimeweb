import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

interface MentionSuggestionsProps {
  suggestions: Profile[];
  isLoading: boolean;
  isOpen: boolean;
  onSelect: (profile: Profile) => void;
  onClose: () => void;
}

const EMOJI_AVATARS = ['🌿', '🌸', '🌊', '🌻', '🍀', '🦋', '🌈', '✨', '🌙', '☀️'];

export function MentionSuggestions({ suggestions, isLoading, isOpen, onSelect, onClose }: MentionSuggestionsProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl overflow-hidden z-50"
      >
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground text-center">
            Никого не найдено
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((profile, index) => {
              const displayName = profile.display_name || profile.username || 'Аноним';
              const emojiIndex = profile.user_id.charCodeAt(0) % EMOJI_AVATARS.length;
              
              return (
                <button
                  key={profile.user_id}
                  onClick={() => onSelect(profile)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-pink-100 dark:from-blue-500/20 dark:to-pink-500/20 text-sm">
                      {EMOJI_AVATARS[emojiIndex]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayName}
                    </p>
                    {profile.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{profile.username}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
