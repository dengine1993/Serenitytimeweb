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
        payment_id: paymentId 
      });
      pollPaymentStatus();
    } else if (!paymentId) {
      setStatus('failed');
    }
  }, [user, paymentId, pollPaymentStatus]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-card/50 backdrop-blur-md border-border p-8 text-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Обрабатываем платёж...
          </h2>
          <p className="text-muted-foreground">
            Это займёт всего несколько секунд
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-card/50 backdrop-blur-md border-border p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 mb-6">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Платёж обрабатывается
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Подождите немного и обновите страницу или перейдите в профиль.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
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
        </Card>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-card/50 backdrop-blur-md border-border p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Ошибка платежа
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Что-то пошло не так. Попробуйте ещё раз или обратитесь в поддержку.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/premium')}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
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
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background-secondary flex items-center justify-center px-4">
      <Card className="max-w-md w-full bg-card/50 backdrop-blur-md border-border p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Оплата прошла успешно!
        </h1>
        
        <p className="text-muted-foreground mb-8">
          Спасибо за поддержку проекта. Ваша подписка активирована.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/settings')}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
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
      </Card>
    </div>
  );
}
