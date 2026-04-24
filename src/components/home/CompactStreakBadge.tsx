import { useEffect, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';

export function CompactStreakBadge() {
  const { user } = useAuth();
  const { theme } = useHomeTheme();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const calculateStreak = async () => {
      try {
        const { data: posts } = await supabase
          .from('posts')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!posts || posts.length === 0) {
          setStreak(0);
          setLoading(false);
          return;
        }

        let currentStreak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        const postDates = new Set(
          posts.map(p => new Date(p.created_at).toISOString().split('T')[0])
        );

        const today = new Date().toISOString().split('T')[0];
        if (!postDates.has(today)) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (postDates.has(checkDate.toISOString().split('T')[0])) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }

        setStreak(currentStreak);
      } catch (error) {
        console.error('Error calculating streak:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateStreak();
  }, [user]);

  if (loading || streak === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all",
        theme === 'light'
          ? "bg-amber-100/80 border border-amber-200/60"
          : "bg-amber/15 border border-amber/30"
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Flame className="h-3.5 w-3.5 text-amber-500" />
      </motion.div>
      <span className={cn(
        "text-xs font-semibold",
        theme === 'light' ? "text-amber-700" : "text-amber"
      )}>
        {streak}
      </span>
      {streak >= 7 && (
        <Sparkles className="h-3 w-3 text-amber-500" />
      )}
    </motion.div>
  );
}
