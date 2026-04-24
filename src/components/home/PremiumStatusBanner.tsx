import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';
import { Crown, Settings, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function PremiumStatusBanner() {
  const navigate = useNavigate();
  const { theme } = useHomeTheme();
  const { user } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ['subscription-end-date', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('subscriptions')
        .select('current_period_end, status')
        .eq('user_id', user.id)
        .eq('plan', 'premium')
        .eq('status', 'active')
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const endDate = subscription?.current_period_end 
    ? format(new Date(subscription.current_period_end), 'd MMMM yyyy', { locale: ru })
    : null;

  return (
    <div className="relative group">
      {/* Animated glow */}
      <motion.div 
        className={cn(
          "absolute -inset-1 rounded-2xl blur-xl opacity-40",
          theme === 'light' 
            ? "bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300" 
            : "bg-gradient-to-r from-amber-500/50 via-orange-500/50 to-rose-500/50"
        )}
        animate={{ 
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.02, 1]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Card */}
      <div className={cn(
        "relative rounded-2xl p-4 transition-all duration-300 overflow-hidden",
        theme === 'light'
          ? "bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border border-amber-200/60"
          : "bg-gradient-to-r from-amber-900/20 via-orange-900/20 to-rose-900/20 border border-amber-700/30"
      )}>
        {/* Sparkles decoration */}
        <Sparkles className={cn(
          "absolute top-3 right-3 w-5 h-5 opacity-40",
          theme === 'light' ? "text-amber-400" : "text-amber-500"
        )} />
        
        <div className="flex items-center gap-4">
          {/* Crown with animated ring */}
          <div className="relative">
            <motion.div 
              className={cn(
                "absolute -inset-2 rounded-full",
                theme === 'light'
                  ? "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
              )}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.3 }}
            />
            <div className={cn(
              "relative p-2.5 rounded-full",
              theme === 'light' 
                ? "bg-gradient-to-br from-amber-100 to-orange-100" 
                : "bg-gradient-to-br from-amber-800/50 to-orange-800/50"
            )}>
              <Crown className={cn(
                "w-6 h-6",
                theme === 'light' ? "text-amber-600" : "text-amber-400"
              )} />
            </div>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-base font-bold",
                theme === 'light' ? "text-amber-700" : "text-amber-400"
              )}>
                Опора
              </span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-semibold",
                theme === 'light' 
                  ? "bg-amber-500/20 text-amber-700" 
                  : "bg-amber-500/30 text-amber-300"
              )}>
                Premium
              </span>
            </div>
            {endDate && (
              <p className={cn(
                "text-xs mt-0.5",
                theme === 'light' ? "text-amber-600/80" : "text-amber-500/80"
              )}>
                Безлимитный доступ до {endDate}
              </p>
            )}
          </div>
          
          {/* Manage button */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "flex-shrink-0 rounded-xl text-xs font-medium px-3 h-8",
              theme === 'light'
                ? "text-amber-700 hover:bg-amber-100"
                : "text-amber-400 hover:bg-amber-900/30"
            )}
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            Управлять
          </Button>
        </div>
      </div>
    </div>
  );
}
