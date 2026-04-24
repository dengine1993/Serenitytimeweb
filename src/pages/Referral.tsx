import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Gift, Users } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function Referral() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    pendingReferrals: 0,
    bonusDaysEarned: 0
  });

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    try {
      // Use user ID as referral code (simple approach)
      const code = user.id.substring(0, 8).toUpperCase();
      setReferralCode(code);
      setReferralLink(`${window.location.origin}/r/${code}`);

      const { data: referrals } = await supabase
        .from('referrals_v2')
        .select('*')
        .eq('inviter_user_id', user.id);

      const completed = referrals?.filter(r => r.inviter_reward_days > 0).length || 0;
      const pending = (referrals?.length || 0) - completed;
      const bonusDays = referrals?.reduce((sum, r) => sum + (r.inviter_reward_days || 0), 0) || 0;

      setStats({
        totalReferrals: referrals?.length || 0,
        pendingReferrals: pending,
        bonusDaysEarned: bonusDays
      });
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Не удалось загрузить данные рефералов');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!user) return;
    navigator.clipboard.writeText(referralLink);
    trackEvent('referral_link_copied', { user_id: user.id });
    toast.success(t('ref.copied'));
  };

  if (loading) return <div className="text-white">Загрузка...</div>;
  if (!user) return <div className="text-white">Авторизуйтесь</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">{t('ref.title')}</h1>
          <p className="text-muted-foreground mt-2">
            Пригласи друга — получи +7 дней Премиум
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-md border-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Твоя реферальная ссылка</h2>
              <p className="text-muted-foreground text-sm">Поделись с друзьями и получай бонусы</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
            />
            <Button onClick={handleCopy} className="flex-shrink-0">
              <Copy className="w-4 h-4 mr-2" />
              {t('ref.copy')}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-card/50 backdrop-blur-md border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-primary" />
              <span className="text-muted-foreground text-sm">Всего приглашений</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.totalReferrals}</div>
          </Card>

          <Card className="bg-card/50 backdrop-blur-md border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-6 h-6 text-accent" />
              <span className="text-muted-foreground text-sm">Ожидают оплаты</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.pendingReferrals}</div>
          </Card>

          <Card className="bg-card/50 backdrop-blur-md border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-6 h-6 text-primary" />
              <span className="text-muted-foreground text-sm">Бонусных дней</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.bonusDaysEarned}</div>
          </Card>
        </div>

        <Card className="bg-card/50 backdrop-blur-md border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Как это работает?</h3>
          <div className="space-y-3 text-muted-foreground text-sm">
            <p>1. Поделись своей реферальной ссылкой с друзьями</p>
            <p>2. Твой друг регистрируется и получает скидку 30% на первый месяц Премиум</p>
            <p>3. Когда друг оплачивает подписку, ты получаешь +7 дней Премиум</p>
            <p className="text-primary font-medium">Приглашай столько друзей, сколько хочешь!</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
