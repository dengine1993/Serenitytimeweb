import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Camera, Save, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useS3Upload } from "@/hooks/useS3Upload";

// Common timezones for Russian users
const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
];

interface ProfileData {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  timezone: string | null;
}

export function ProfileEditForm() {
  const { user } = useAuth();
  const { language } = useI18n();
  const isRu = language === 'ru';
  const { upload: s3Upload, uploading } = useS3Upload();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    bio: '',
    avatar_url: null,
    timezone: 'Europe/Moscow'
  });

  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, timezone')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setProfile({
          display_name: data.display_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url,
          timezone: data.timezone || 'Europe/Moscow'
        });
      }
      setLoading(false);
    };
    
    loadProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    
    try {
      // Upload to S3
      const result = await s3Upload(file, 'avatars');
      
      if (!result) return;
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: result.publicUrl })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      setProfile(prev => ({ ...prev, avatar_url: result.publicUrl }));
      toast.success(isRu ? 'Фото обновлено' : 'Photo updated');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(isRu ? 'Ошибка загрузки фото' : 'Error uploading photo');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          bio: profile.bio,
          timezone: profile.timezone
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast.success(isRu ? 'Профиль сохранён' : 'Profile saved');
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error(isRu ? 'Ошибка сохранения' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Avatar + Name in one card - more compact */}
      <div className="flex items-center gap-5 p-4 rounded-2xl bg-muted/30 border border-border">
        <div className="relative shrink-0">
          <Avatar className="w-20 h-20 ring-2 ring-primary/30">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/40 to-secondary/40 text-xl font-medium">
              {profile.display_name?.charAt(0)?.toUpperCase() || <User className="w-8 h-8" />}
            </AvatarFallback>
          </Avatar>
          
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-foreground" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        
        <div className="flex-1 min-w-0">
          <Input
            id="display_name"
            value={profile.display_name || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
            placeholder={isRu ? 'Имя пользователя' : 'Display name'}
            className="bg-transparent border-0 border-b border-border rounded-none px-0 text-lg font-medium focus-visible:ring-0 focus-visible:border-primary"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {user?.email}
          </p>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm text-muted-foreground">
          {isRu ? 'О себе' : 'About'}
        </Label>
        <Textarea
          id="bio"
          value={profile.bio || ''}
          onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
          placeholder={isRu ? 'Расскажи немного о себе...' : 'Tell us about yourself...'}
          className="bg-muted/30 border-border min-h-[80px] resize-none rounded-xl"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {(profile.bio?.length || 0)}/200
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4" />
          {isRu ? 'Часовой пояс' : 'Timezone'}
        </Label>
        <Select
          value={profile.timezone || 'Europe/Moscow'}
          onValueChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}
        >
          <SelectTrigger className="bg-muted/30 border-border rounded-xl">
            <SelectValue placeholder={isRu ? 'Выбери часовой пояс' : 'Select timezone'} />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isRu ? 'Используется для расчёта суточных лимитов' : 'Used for daily limit calculations'}
        </p>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 rounded-xl font-medium"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {isRu ? 'Сохранить изменения' : 'Save Changes'}
      </Button>
    </motion.div>
  );
}
