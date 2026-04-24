import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Trash2, MessageCircle, Users, Lock, Globe, Ban, Unlock, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { UserReportModal } from "@/components/community/UserReportModal";
import AiMemorySettings from "./AiMemorySettings";
import { toast } from "sonner";

type PrivacySetting = 'all' | 'friends' | 'nobody';
type FriendRequestSetting = 'all' | 'nobody';

export function PrivacySettings() {
  const { language } = useI18n();
  const { user } = useAuth();
  const { blockedUsers, unblockUser, isLoading: friendsLoading } = useFriends();
  const isRu = language === 'ru';
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [reportUserName, setReportUserName] = useState('');
  const [privacySetting, setPrivacySetting] = useState<PrivacySetting>('all');
  const [friendRequestSetting, setFriendRequestSetting] = useState<FriendRequestSetting>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('allow_private_messages, allow_friend_requests')
        .eq('user_id', user.id)
        .single();
      
      if (data?.allow_private_messages) {
        setPrivacySetting(data.allow_private_messages as PrivacySetting);
      }
      if (data?.allow_friend_requests) {
        setFriendRequestSetting(data.allow_friend_requests as FriendRequestSetting);
      }
      setIsLoading(false);
    };
    
    loadSettings();
  }, [user]);

  const handlePrivacyChange = async (value: PrivacySetting) => {
    if (!user) return;
    
    setPrivacySetting(value);
    
    const { error } = await supabase
      .from('profiles')
      .update({ allow_private_messages: value })
      .eq('user_id', user.id);
    
    if (error) {
      toast.error(isRu ? 'Ошибка сохранения' : 'Failed to save');
      return;
    }
    toast.success(isRu ? 'Настройки сохранены' : 'Settings saved');
  };

  const handleFriendRequestChange = async (value: FriendRequestSetting) => {
    if (!user) return;
    
    setFriendRequestSetting(value);
    
    const { error } = await supabase
      .from('profiles')
      .update({ allow_friend_requests: value })
      .eq('user_id', user.id);
    
    if (error) {
      toast.error(isRu ? 'Ошибка сохранения' : 'Failed to save');
      return;
    }
    toast.success(isRu ? 'Настройки сохранены' : 'Settings saved');
  };

  const handleUnblock = async (userId: string) => {
    const result = await unblockUser(userId);
    if (result.success) {
      toast.success(isRu ? 'Пользователь разблокирован' : 'User unblocked');
    } else {
      toast.error(isRu ? 'Ошибка разблокировки' : 'Failed to unblock');
    }
  };

  const openReportModal = (userId: string, userName: string) => {
    setReportUserId(userId);
    setReportUserName(userName);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* AI memory */}
      <AiMemorySettings />

      {/* Private Messages Settings */}
      <Card className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {isRu ? 'Личные сообщения' : 'Private Messages'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {isRu 
                ? 'Кто может отправлять тебе личные сообщения'
                : 'Who can send you private messages'
              }
            </p>
            
            <RadioGroup 
              value={privacySetting} 
              onValueChange={(v) => handlePrivacyChange(v as PrivacySetting)}
              disabled={isLoading}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{isRu ? 'Все' : 'Everyone'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRu ? 'Любой пользователь может написать' : 'Anyone can message you'}
                  </p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                <RadioGroupItem value="friends" id="friends" />
                <Label htmlFor="friends" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{isRu ? 'Только друзья' : 'Friends only'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRu ? 'Только люди из списка друзей' : 'Only people in your friends list'}
                  </p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                <RadioGroupItem value="nobody" id="nobody" />
                <Label htmlFor="nobody" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{isRu ? 'Никто' : 'Nobody'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRu ? 'Личные сообщения отключены' : 'Private messages disabled'}
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </Card>

      {/* Friend Requests Settings */}
      <Card className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {isRu ? 'Запросы в друзья' : 'Friend Requests'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {isRu 
                ? 'Кто может отправлять тебе запросы в друзья'
                : 'Who can send you friend requests'
              }
            </p>
            
            <RadioGroup 
              value={friendRequestSetting} 
              onValueChange={(v) => handleFriendRequestChange(v as FriendRequestSetting)}
              disabled={isLoading}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                <RadioGroupItem value="all" id="fr-all" />
                <Label htmlFor="fr-all" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{isRu ? 'Все' : 'Everyone'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRu ? 'Любой пользователь может добавить в друзья' : 'Anyone can send you friend requests'}
                  </p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                <RadioGroupItem value="nobody" id="fr-nobody" />
                <Label htmlFor="fr-nobody" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{isRu ? 'Никто' : 'Nobody'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRu ? 'Запросы в друзья отключены' : 'Friend requests disabled'}
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </Card>

      {/* Security Info */}
      <Card className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-rose-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {isRu ? 'Безопасность данных' : 'Data Security'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isRu 
                ? 'Все данные зашифрованы и хранятся на защищённых серверах. Мы не передаём твои данные третьим лицам.'
                : 'All data is encrypted and stored on secure servers. We never share your data with third parties.'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Blocked Users */}
      <Card className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Ban className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {isRu ? 'Заблокированные пользователи' : 'Blocked Users'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {isRu 
                ? 'Заблокированные пользователи не могут писать вам сообщения'
                : 'Blocked users cannot send you messages'
              }
            </p>
            
            {friendsLoading ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {isRu ? 'Нет заблокированных пользователей' : 'No blocked users'}
              </div>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((blocked) => (
                  <div 
                    key={blocked.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={blocked.blocked_profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900">
                        {(blocked.blocked_profile?.display_name || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {blocked.blocked_profile?.display_name || blocked.blocked_profile?.username || 'Пользователь'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReportModal(
                          blocked.friend_id, 
                          blocked.blocked_profile?.display_name || blocked.blocked_profile?.username || 'Пользователь'
                        )}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Flag className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnblock(blocked.friend_id)}
                        className="shrink-0"
                      >
                        <Unlock className="h-4 w-4 mr-1" />
                        {isRu ? 'Разблокировать' : 'Unblock'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Delete Account */}
      <Card className="glass-card p-6 border-destructive/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">
              {isRu ? 'Удалить аккаунт' : 'Delete Account'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {isRu 
                ? 'Навсегда удалить аккаунт и все данные. Это действие необратимо.'
                : 'Permanently delete your account and all data. This action cannot be undone.'
              }
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isRu ? 'Удалить аккаунт' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Card>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
      />

      {/* User Report Modal */}
      <UserReportModal
        isOpen={!!reportUserId}
        onClose={() => setReportUserId(null)}
        userId={reportUserId || ''}
        userName={reportUserName}
      />
    </motion.div>
  );
}
