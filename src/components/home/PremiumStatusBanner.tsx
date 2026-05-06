import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';
import { Crown, Settings } from 'lucide-react';
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
      {/* Static soft glow (rotation removed — visual noise) */}
      <div
        className={cn(
          'absolute -inset-0.5 rounded-2xl blur-lg opacity-30 pointer-events-none',
          theme === 'light'
            ? 'bg-gradient-to-r from-amber-300 to-orange-300'
            : 'bg-gradient-to-r from-amber-500/40 to-orange-500/40'
        )}
      />

      {/* Card */}
      <div className={cn(
        "relative rounded-2xl p-4 transition-all duration-300 overflow-hidden",
        theme === 'light'
          ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60"
          : "bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-700/30"
      )}>
        <div className="flex items-center gap-4">
          {/* Crown — без вращающегося кольца */}
          <div className={cn(
            "flex-shrink-0 p-2.5 rounded-full",
            theme === 'light'
              ? "bg-gradient-to-br from-amber-100 to-orange-100"
              : "bg-gradient-to-br from-amber-800/50 to-orange-800/50"
          )}>
            <Crown className={cn(
              "w-6 h-6",
              theme === 'light' ? "text-amber-600" : "text-amber-400"
            )} />
          </div>

          {/* Info — без дубля «Premium Premium» */}
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-base font-bold",
              theme === 'light' ? "text-amber-700" : "text-amber-400"
            )}>
              Premium
            </div>
            {endDate && (
              <p className={cn(
                "text-xs mt-0.5 truncate",
                theme === 'light' ? "text-amber-600/80" : "text-amber-500/80"
              )}>
                Безлимит до {endDate}
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
