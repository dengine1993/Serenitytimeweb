import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { ConsentCheckboxes, validateConsents } from "@/components/legal/ConsentCheckboxes";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSIONS } from "@/lib/legalVersions";
import { logPaymentConsents } from "@/lib/consentLogger";

interface PaymentConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  productName?: string;
  price?: number;
}

export function PaymentConsentModal({ 
  open, 
  onClose, 
  onConfirm, 
  loading = false,
  productName = "Premium",
  price
}: PaymentConsentModalProps) {
  const [consents, setConsents] = useState({
    offer: false,
    privacy: false
  });
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const isValid = validateConsents('payment', consents);

  const handleConfirm = async () => {
    if (!isValid) {
      setError(true);
      return;
    }

    setError(false);
    setSaving(true);

    try {
      // Get client IP (will be empty if blocked by browser)
      let clientIp = '';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch {
        // IP fetch failed, continue without it
      }

      // Save consents to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update profiles table
        await supabase.from('profiles').update({
          offer_accepted_at: new Date().toISOString(),
          offer_version: LEGAL_VERSIONS.offer,
          privacy_accepted_at: new Date().toISOString(),
          privacy_version: LEGAL_VERSIONS.privacy,
          consent_ip: clientIp || null
        }).eq('user_id', user.id);

        // Log to consent_log for 152-FZ compliance
        await logPaymentConsents('payment_premium');
      }

      onConfirm();
    } catch (error) {
      console.error('Failed to save consents:', error);
      // Still proceed with payment even if consent save fails
      onConfirm();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setConsents({ offer: false, privacy: false });
      setError(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md border border-white/10 bg-card/95 backdrop-blur-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-white">
              Подтверждение согласий
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-white/70 text-sm">
            Для оформления подписки <span className="text-white font-medium">{productName}</span>
            {price && <span className="text-white font-medium"> ({price} ₽)</span>} подтвердите следующее:
          </p>

          <ConsentCheckboxes
            variant="payment"
            consents={consents}
            onChange={(newConsents) => setConsents({
              offer: newConsents.offer ?? false,
              privacy: newConsents.privacy ?? false
            })}
            error={error}
          />

          <div className="space-y-2 pt-2">
            <Button 
              onClick={handleConfirm}
              disabled={loading || saving || !isValid}
              className="w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-semibold py-6 text-lg"
            >
              {loading || saving ? 'Загрузка...' : 'Подтвердить и оплатить'}
            </Button>
            
            <Button 
              onClick={() => handleOpenChange(false)}
              variant="ghost"
              disabled={loading || saving}
              className="w-full text-white/60 hover:text-white/90"
            >
              Отмена
            </Button>
          </div>

          <p className="text-xs text-center text-white/50">
            Нажимая "Подтвердить и оплатить", вы соглашаетесь с указанными условиями
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
