import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useI18n } from '@/hooks/useI18n';

interface CommunityHeaderProps {
  onlineCount: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
  showOnline?: boolean;
}

export function CommunityHeader({
  onlineCount,
  searchQuery = '',
  onSearchChange,
  showSearch = true,
  showOnline = true,
}: CommunityHeaderProps) {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchToggle = () => {
    if (isSearchOpen) {
      onSearchChange?.('');
    }
    setIsSearchOpen(!isSearchOpen);
  };

  const onlinePlural = (() => {
    if (language === 'ru') {
      const n = onlineCount % 100;
      const n1 = n % 10;
      if (n > 10 && n < 20) return t('community.header.onlineForms.many');
      if (n1 > 1 && n1 < 5) return t('community.header.onlineForms.few');
      if (n1 === 1) return t('community.header.onlineForms.one');
      return t('community.header.onlineForms.many');
    }
    return onlineCount === 1
      ? t('community.header.onlineForms.one')
      : t('community.header.onlineForms.many');
  })();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <AnimatePresence mode="wait">
            {isSearchOpen ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1"
              >
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={t('community.header.searchPlaceholder')}
                  className="h-9 bg-muted/50"
                  autoFocus
                />
              </motion.div>
            ) : (
              <motion.div
                key="title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-lg font-bold text-foreground">{t('community.header.title')}</h1>
                {showOnline && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-2 h-2 rounded-full bg-emerald-500"
                    />
                    <span>{t('community.header.online', { count: onlineCount, plural: onlinePlural })}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchToggle}
              className="rounded-full"
            >
              {isSearchOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          )}
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isSearchOpen && searchQuery && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-2"
        >
          <p className="text-xs text-muted-foreground">
            {t('community.header.searchLabel', { query: searchQuery })}
          </p>
        </motion.div>
      )}
    </header>
  );
}
