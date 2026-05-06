import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useInvalidatePremiumStatus } from '@/hooks/useEntitlements';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

type PaymentStatus = 'loading' | 'succeeded' | 'processing' | 'failed';

const SUNRISE_CTA =
  'w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border border-orange-300/30 shadow-[0_0_22px_rgba(249,115,22,0.45)]';

const SUNRISE_CARD =
  'max-w-md w-full bg-card/60 backdrop-blur-xl border border-orange-400/20 shadow-[0_30px_80px_-20px_rgba(249,115,22,0.3)] p-8 text-center';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sunrise-ambient flex items-center justify-center px-4">
      <Card className={SUNRISE_CARD}>{children}</Card>
    </div>
  );
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const invalidatePremium = useInvalidatePremiumStatus();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const paymentId = searchParams.get('payment_id');

  const pollPaymentStatus = useCallback(async (attempts = 0) => {
    if (!paymentId) {
      setStatus('failed');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('Error fetching payment status:', error);
        if (attempts < 10) {
          setTimeout(() => pollPaymentStatus(attempts + 1), 1500);
        } else {
          setStatus('processing');
        }
        return;
      }

      if (data?.status === 'succeeded') {
        setStatus('succeeded');
        invalidatePremium();
        return;
      }

      if (data?.status === 'failed' || data?.status === 'canceled') {
        setStatus('failed');
        return;
      }

      // Still pending or processing
      if (attempts < 10) {
        setTimeout(() => pollPaymentStatus(attempts + 1), 1500);
      } else {
        setStatus('processing');
      }
    } catch (err) {
      console.error('Poll error:', err);
      if (attempts < 10) {
        setTimeout(() => pollPaymentStatus(attempts + 1), 1500);
      } else {
        setStatus('processing');
      }
    }
  }, [paymentId, invalidatePremium]);

  useEffect(() => {
    if (user && paymentId) {
      trackEvent('payment_success', {
        user_id: user.id,
        payment_id: paymentId,
      });
      pollPaymentStatus();
    } else if (!paymentId) {
      setStatus('failed');
    }
  }, [user, paymentId, pollPaymentStatus]);

  if (status === 'loading') {
    return (
      <Wrapper>
        <Loader2 className="w-16 h-16 text-amber-300 animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Обрабатываем платёж...
        </h2>
        <p className="text-muted-foreground">
          Это займёт всего несколько секунд
        </p>
      </Wrapper>
    );
  }

  if (status === 'processing') {
    return (
      <Wrapper>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/15 ring-2 ring-amber-400/30 mb-6">
          <Loader2 className="w-12 h-12 text-amber-300 animate-spin" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Платёж обрабатывается
        </h1>

        <p className="text-muted-foreground mb-8">
          Подождите немного и обновите страницу или перейдите в профиль.
        </p>

        <div className="space-y-3">
          <Button onClick={() => window.location.reload()} className={SUNRISE_CTA}>
            Обновить страницу
          </Button>

          <Button
            onClick={() => navigate('/settings')}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Перейти в настройки
          </Button>
        </div>
      </Wrapper>
    );
  }

  if (status === 'failed') {
    return (
      <Wrapper>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 ring-2 ring-red-400/30 mb-6">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Ошибка платежа
        </h1>

        <p className="text-muted-foreground mb-8">
          Что-то пошло не так. Попробуйте ещё раз или обратитесь в поддержку.
        </p>

        <div className="space-y-3">
          <Button onClick={() => navigate('/premium')} className={SUNRISE_CTA}>
            Попробовать снова
          </Button>

          <Button
            onClick={() => navigate('/app')}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            На главную
          </Button>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/25 to-rose-500/20 ring-2 ring-orange-400/40 mb-6">
        <CheckCircle
          className="w-12 h-12 text-amber-200"
          style={{ filter: 'drop-shadow(0 0 18px rgba(245,158,11,0.65))' }}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-amber-200 to-rose-300">
        Оплата прошла успешно!
      </h1>

      <p className="text-muted-foreground mb-8">
        Спасибо за поддержку проекта. Ваша подписка активирована.
      </p>

      <div className="space-y-3">
        <Button onClick={() => navigate('/settings')} className={SUNRISE_CTA}>
          Перейти в настройки
        </Button>

        <Button
          onClick={() => navigate('/app')}
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground"
        >
          На главную
        </Button>
      </div>
    </Wrapper>
  );
}
