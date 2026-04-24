import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { FeedComposer } from './FeedComposer';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface DailyMomentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyMomentModal({ isOpen, onClose }: DailyMomentModalProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handlePostCreated = () => {
    // Mark as shown today
    localStorage.setItem('daily_moment_last_shown', new Date().toDateString());
    // Navigate to home
    navigate('/app');
  };

  const handleSkip = () => {
    // Mark as shown today
    localStorage.setItem('daily_moment_last_shown', new Date().toDateString());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop with gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Floating orbs effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg z-10"
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute -top-12 right-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 mb-4 shadow-lg shadow-amber-500/30"
              >
                <SparklesIcon className="w-8 h-8 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                {t('feed.dailyMoment.title')}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground"
              >
                {t('feed.dailyMoment.subtitle')}
              </motion.p>
            </div>

            {/* Composer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <FeedComposer
                onPostCreated={handlePostCreated}
                showDailyLimit={false}
              />
            </motion.div>

            {/* Skip button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center"
            >
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                {t('feed.dailyMoment.skip')}
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to check if we should show the modal
export function useDailyMomentModal() {
  const [shouldShow, setShouldShow] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setShouldShow(false);
      return;
    }

    const checkShowModal = async () => {
      const lastShown = localStorage.getItem('daily_moment_last_shown');
      const today = new Date().toDateString();

      // If already shown today, don't show again
      if (lastShown === today) {
        setShouldShow(false);
        return;
      }

      // Check if user has already posted today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString());

      // Only show if no posts today
      if (count === 0) {
        setShouldShow(true);
      } else {
        setShouldShow(false);
      }
    };

    checkShowModal();
  }, [user]);

  const dismiss = () => {
    localStorage.setItem('daily_moment_last_shown', new Date().toDateString());
    setShouldShow(false);
  };

  return { shouldShow, dismiss };
}
