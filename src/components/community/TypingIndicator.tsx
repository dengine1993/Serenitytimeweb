import { motion } from 'framer-motion';
import { useI18n } from '@/hooks/useI18n';

interface TypingIndicatorProps {
  typingUsers: { user_id: string; display_name: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const { t } = useI18n();
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return t('community.typing.single', { name: typingUsers[0].display_name });
    }
    if (typingUsers.length === 2) {
      return t('community.typing.double', {
        name1: typingUsers[0].display_name,
        name2: typingUsers[1].display_name,
      });
    }
    return t('community.typing.many', {
      name: typingUsers[0].display_name,
      count: typingUsers.length - 1,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="px-4 py-2"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
        <span>{getTypingText()}...</span>
      </div>
    </motion.div>
  );
}
