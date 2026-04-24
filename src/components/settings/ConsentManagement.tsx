import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Shield, Clock, ExternalLink, Trash2, History } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ConsentLogEntry {
  id: string;
  consent_type: string;
  document_version: string;
  action: string;
  context: string;
  created_at: string;
}

const CONSENT_TYPE_LABELS: Record<string, { ru: string; en: string }> = {
  offer: { ru: 'Публичная оферта', en: 'Public Offer' },
  privacy: { ru: 'Политика конфиденциальности', en: 'Privacy Policy' },
  immediate_service: { ru: 'Согласие на немедленное исполнение', en: 'Immediate Service Consent' }
};

const CONTEXT_LABELS: Record<string, { ru: string; en: string }> = {
  registration: { ru: 'Регистрация', en: 'Registration' },
  payment_premium: { ru: 'Оплата Premium', en: 'Premium Payment' },
  payment_topup: { ru: 'Покупка сообщений', en: 'Top-up Purchase' }
};

export function ConsentManagement() {
  const { user } = useAuth();
  const { language } = useI18n();
  const [consents, setConsents] = useState<ConsentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const isRu = language === 'ru';

  useEffect(() => {
    if (user) {
      loadConsents();
    }
  }, [user]);

  const loadConsents = async () => {
    try {
      const { data, error } = await supabase
        .from('consent_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConsents(data || []);
    } catch (error) {
      console.error('Failed to load consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConsent = async () => {
    if (!user) return;
    
    setWithdrawing(true);
    try {
      const { error } = await supabase.functions.invoke('withdraw-consent', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success(isRu ? 'Заявка на отзыв согласия принята. Ваши данные будут удалены.' : 'Consent withdrawal request accepted. Your data will be deleted.');
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      toast.error(isRu ? 'Не удалось отозвать согласие' : 'Failed to withdraw consent');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: isRu ? ru : undefined });
  };

  const getConsentLabel = (type: string) => {
    return CONSENT_TYPE_LABELS[type]?.[isRu ? 'ru' : 'en'] || type;
  };

  const getContextLabel = (context: string) => {
    return CONTEXT_LABELS[context]?.[isRu ? 'ru' : 'en'] || context;
  };

  return (
    <div className="space-y-6">
      {/* Legal Documents Section */}
      <Card className="glass-card p-5 border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isRu ? 'Правовые документы' : 'Legal Documents'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRu ? 'Актуальные версии документов' : 'Current document versions'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link to="/legal/offer" className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-foreground">{isRu ? 'Публичная оферта' : 'Public Offer'}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/legal/privacy" className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-foreground">{isRu ? 'Политика конфиденциальности' : 'Privacy Policy'}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/legal/refund" className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-foreground">{isRu ? 'Правила возврата' : 'Refund Policy'}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/legal/disclaimer" className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-sm text-foreground">{isRu ? 'Отказ от ответственности' : 'Disclaimer'}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </Card>

      {/* Consent History Section */}
      <Card className="glass-card p-5 border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <History className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isRu ? 'История согласий' : 'Consent History'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRu ? 'Все ваши подтверждения по 152-ФЗ' : 'All your consents per 152-FZ'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />
          </div>
        ) : consents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isRu ? 'История согласий пуста' : 'No consent history'}
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {consents.map((consent) => (
              <div key={consent.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {getConsentLabel(consent.consent_type)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      v{consent.document_version}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getContextLabel(consent.context)}</span>
                    <span>•</span>
                    <span>{formatDate(consent.created_at)}</span>
                  </div>
                </div>
                <Badge variant={consent.action === 'accepted' ? 'default' : 'destructive'} className="text-xs">
                  {consent.action === 'accepted' 
                    ? (isRu ? 'Принято' : 'Accepted')
                    : (isRu ? 'Отозвано' : 'Withdrawn')
                  }
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Withdraw Consent Section */}
      <Card className="glass-card p-5 border-destructive/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isRu ? 'Отзыв согласия на обработку ПДн' : 'Withdraw PD Processing Consent'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRu ? 'В соответствии со ст. 9 п. 2 152-ФЗ' : 'Per Article 9.2 of 152-FZ'}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {isRu 
            ? 'Вы имеете право отозвать согласие на обработку персональных данных. Это приведёт к удалению вашего аккаунта и всех данных.'
            : 'You have the right to withdraw consent for personal data processing. This will result in deletion of your account and all data.'
          }
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              {isRu ? 'Отозвать согласие и удалить данные' : 'Withdraw consent and delete data'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isRu ? 'Вы уверены?' : 'Are you sure?'}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  {isRu 
                    ? 'Это действие необратимо. Будут удалены:'
                    : 'This action is irreversible. The following will be deleted:'
                  }
                </p>
                <ul className="list-disc pl-4 text-sm">
                  <li>{isRu ? 'Ваш аккаунт' : 'Your account'}</li>
                  <li>{isRu ? 'История дневника и записи СМЭР' : 'Diary and SMER entries'}</li>
                  <li>{isRu ? 'Рисунки арт-терапии' : 'Art therapy drawings'}</li>
                  <li>{isRu ? 'История чатов с AI' : 'AI chat history'}</li>
                  <li>{isRu ? 'Все персональные данные' : 'All personal data'}</li>
                </ul>
                <p className="font-medium text-destructive">
                  {isRu 
                    ? 'Активная подписка не будет возвращена.'
                    : 'Active subscription will not be refunded.'
                  }
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {isRu ? 'Отмена' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleWithdrawConsent}
                disabled={withdrawing}
                className="bg-destructive hover:bg-destructive/90"
              >
                {withdrawing 
                  ? (isRu ? 'Обработка...' : 'Processing...')
                  : (isRu ? 'Да, удалить всё' : 'Yes, delete everything')
                }
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
