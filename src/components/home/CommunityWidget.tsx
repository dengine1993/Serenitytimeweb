import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UsersIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { cn } from '@/lib/utils';

export function CommunityWidget() {
  const navigate = useNavigate();
  const { theme } = useHomeTheme();

  const { data: recentMessages } = useQuery({
    queryKey: ['community-widget-messages'],
    queryFn: async () => {
      const { data: messages } = await supabase
        .from('community_messages')
        .select('id, content, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!messages || messages.length === 0) return [];

      // Get profiles
      const userIds = [...new Set(messages.map((m: { user_id: string }) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map((p: { user_id: string; display_name: string | null }) => [p.user_id, p]) || []);

      return messages.map((m: { id: string; content: string; created_at: string; user_id: string }) => {
        const profile = profileMap.get(m.user_id) as { display_name: string | null } | undefined;
        return {
          ...m,
          author: profile?.display_name || 'Аноним'
        };
      });
    },
    staleTime: 30000,
  });

  const { data: messageCount } = useQuery({
    queryKey: ['community-message-count'],
    queryFn: async () => {
      // @ts-ignore - Avoiding deep type instantiation
      const { count } = await supabase
        .from('community_messages')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
    staleTime: 60000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        "rounded-2xl p-4 cursor-pointer transition-all duration-300 group",
        theme === 'light'
          ? "bg-gradient-to-br from-blue-50/80 to-slate-100/60 border border-blue-200/60 hover:border-blue-300 shadow-sm hover:shadow-md"
          : "bg-gradient-to-br from-slate-800/60 to-slate-900/50 border border-slate-700/40 hover:border-slate-600/50 shadow-lg"
      )}
      onClick={() => navigate('/community')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            theme === 'light' ? "bg-white/70" : "bg-slate-700/50"
          )}>
            <UsersIcon className={cn(
              "h-4 w-4",
              theme === 'light' ? "text-blue-500" : "text-slate-400"
            )} aria-hidden="true" />
          </div>
          <div>
            <h3 className={cn(
              "text-sm font-semibold",
              theme === 'light' ? "text-slate-700" : "text-slate-200"
            )}>
              Сообщество
            </h3>
            <p className={cn(
              "text-[10px]",
              theme === 'light' ? "text-slate-500" : "text-slate-500"
            )}>
              {messageCount ? `${messageCount} сообщений` : 'Поддержка'}
            </p>
          </div>
        </div>
        <ArrowRightIcon className={cn(
          "h-4 w-4 transition-transform group-hover:translate-x-1",
          theme === 'light' ? "text-blue-400" : "text-slate-500"
        )} />
      </div>

      {/* Recent messages preview */}
      {recentMessages && recentMessages.length > 0 ? (
        <div className="space-y-1.5">
          {recentMessages.slice(0, 2).map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-lg truncate",
                theme === 'light'
                  ? "bg-white/60 text-slate-600"
                  : "bg-slate-700/40 text-slate-400"
              )}
            >
              <span className={cn(
                "font-medium mr-1",
                theme === 'light' ? "text-blue-600" : "text-slate-300"
              )}>
                {msg.author}:
              </span>
              {msg.content.slice(0, 40)}{msg.content.length > 40 ? '...' : ''}
            </div>
          ))}
        </div>
      ) : (
        <p className={cn(
          "text-xs italic",
          theme === 'light' ? "text-slate-400" : "text-slate-500"
        )}>
          Присоединяйтесь к общению
        </p>
      )}
    </motion.div>
  );
}
