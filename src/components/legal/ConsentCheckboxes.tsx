import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLegalModal } from "@/components/legal/LegalModalProvider";

interface ConsentCheckboxesProps {
  variant: 'registration' | 'payment' | 'ai-disclaimer';
  consents: {
    offer?: boolean;
    privacy?: boolean;
    immediateService?: boolean; // deprecated
    disclaimer?: boolean;
    /** @deprecated больше не используется — оставлено для обратной совместимости типов */
    specialCategory?: boolean;
    /** 152-ФЗ — подтверждение возраста 16+ */
    ageConfirmed?: boolean;
    /** Опционально: разрешение Дживе обращаться по имени из профиля */
    nameToJiva?: boolean;
  };
  onChange: (consents: ConsentCheckboxesProps['consents']) => void;
  className?: string;
  error?: boolean;
}

export function ConsentCheckboxes({
  variant,
  consents,
  onChange,
  className,
  error
}: ConsentCheckboxesProps) {
  const { openLegal } = useLegalModal();

  const updateConsent = (key: keyof typeof consents, value: boolean) => {
    onChange({ ...consents, [key]: value });
  };

  const toggleOfferAndPrivacy = (value: boolean) => {
    onChange({ ...consents, offer: value, privacy: value });
  };
  const offerPrivacyChecked = !!(consents.offer && consents.privacy);
  const offerPrivacyError = error && !offerPrivacyChecked;

  const checkboxBase = cn(
    "mt-0.5 h-5 w-5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
  );
  const labelBase = "text-sm text-white/60 cursor-pointer leading-loose";
  const linkBase = "font-medium text-primary underline-offset-2 hover:underline transition-colors inline";

  const openModal = (type: 'offer' | 'privacy' | 'disclaimer' | 'consent') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openLegal(type as 'offer' | 'privacy' | 'disclaimer');
  };

  return (
    <div className={cn("space-y-4", className)}>
      {(variant === 'registration' || variant === 'payment') && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-offer-privacy"
            checked={offerPrivacyChecked}
            onCheckedChange={(checked) => toggleOfferAndPrivacy(!!checked)}
            className={cn(checkboxBase, offerPrivacyError && "border-red-500")}
          />
          <Label htmlFor="consent-offer-privacy" className={labelBase}>
            Я принимаю{' '}
            <button type="button" onClick={openModal('offer')} className={linkBase}>
              Публичную оферту
            </button>
            {' '}и согласен(на) с{' '}
            <button type="button" onClick={openModal('privacy')} className={linkBase}>
              Политикой обработки персональных данных
            </button>
          </Label>
        </div>
      )}

      {(variant === 'ai-disclaimer' || variant === 'registration' || variant === 'payment') && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-disclaimer"
            checked={consents.disclaimer || false}
            onCheckedChange={(checked) => updateConsent('disclaimer', !!checked)}
            className={cn(checkboxBase, error && !consents.disclaimer && "border-red-500")}
          />
          <Label htmlFor="consent-disclaimer" className={labelBase}>
            Я ознакомлен(а) с{' '}
            <button type="button" onClick={openModal('disclaimer')} className={linkBase}>
              Условиями использования сервиса
            </button>
            {' '}и понимаю, что Джива — ИИ-собеседник для эмоциональной поддержки (16+), не является медицинской, психотерапевтической или психологической помощью и не заменяет консультацию врача или специалиста
          </Label>
        </div>
      )}

      {/* Чекбокс «спец. категория ПДн» удалён — согласие на обработку ПДн уже включено в основной чекбокс «Политика обработки персональных данных» */}

      {/* 152-ФЗ: подтверждение возраста 16+ */}
      {variant === 'registration' && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-age"
            checked={consents.ageConfirmed || false}
            onCheckedChange={(checked) => updateConsent('ageConfirmed', !!checked)}
            className={cn(checkboxBase, error && !consents.ageConfirmed && "border-red-500")}
          />
          <Label htmlFor="consent-age" className={labelBase}>
            Подтверждаю, что мне исполнилось 16 лет.
            <span className="block text-xs text-white/40 mt-1">
              Сервис не предназначен для лиц младше 16 лет.
            </span>
          </Label>
        </div>
      )}

      {/* Опциональное согласие: разрешить Дживе обращаться по имени/нику из поля выше */}
      {variant === 'registration' && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-name-to-jiva"
            checked={consents.nameToJiva || false}
            onCheckedChange={(checked) => updateConsent('nameToJiva', !!checked)}
            className={checkboxBase}
          />
          <Label htmlFor="consent-name-to-jiva" className={labelBase}>
            Разрешаю Дживе обращаться ко мне так, как я указал(а) выше.
            <span className="block text-xs text-white/40 mt-1">
              Опционально. Если выключено — Джива будет писать нейтрально («друг»). Можно поменять в любой момент: Настройки → Приватность.
            </span>
          </Label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mt-2">
          Пожалуйста, подтвердите согласие со всеми условиями
        </p>
      )}
    </div>
  );
}

export function validateConsents(
  variant: 'registration' | 'payment' | 'ai-disclaimer',
  consents: ConsentCheckboxesProps['consents']
): boolean {
  switch (variant) {
    case 'registration':
      return !!(consents.offer && consents.privacy && consents.disclaimer && consents.ageConfirmed);
    case 'payment':
      return !!(consents.offer && consents.privacy && consents.disclaimer);
    case 'ai-disclaimer':
      return !!consents.disclaimer;
    default:
      return false;
  }
}
