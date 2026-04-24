import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ConsentCheckboxesProps {
  variant: 'registration' | 'payment' | 'ai-disclaimer';
  consents: {
    offer?: boolean;
    privacy?: boolean;
    immediateService?: boolean; // deprecated, kept for backward compat
    disclaimer?: boolean;
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
  const updateConsent = (key: keyof typeof consents, value: boolean) => {
    onChange({ ...consents, [key]: value });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Offer consent - for registration and payment */}
      {(variant === 'registration' || variant === 'payment') && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-offer"
            checked={consents.offer || false}
            onCheckedChange={(checked) => updateConsent('offer', !!checked)}
            className={cn(
              "mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary",
              error && !consents.offer && "border-red-500"
            )}
          />
          <Label 
            htmlFor="consent-offer" 
            className="text-sm text-white/80 cursor-pointer leading-relaxed"
          >
            Я принимаю условия{' '}
            <Link 
              to="/legal/offer" 
              target="_blank"
              className="text-primary underline hover:text-primary/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Публичной оферты
            </Link>
          </Label>
        </div>
      )}

      {/* Privacy consent - for registration and payment */}
      {(variant === 'registration' || variant === 'payment') && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-privacy"
            checked={consents.privacy || false}
            onCheckedChange={(checked) => updateConsent('privacy', !!checked)}
            className={cn(
              "mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary",
              error && !consents.privacy && "border-red-500"
            )}
          />
          <Label 
            htmlFor="consent-privacy" 
            className="text-sm text-white/80 cursor-pointer leading-relaxed"
          >
            Я согласен(на) с{' '}
            <Link 
              to="/legal/privacy" 
              target="_blank"
              className="text-primary underline hover:text-primary/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Политикой обработки персональных данных
            </Link>
          </Label>
        </div>
      )}

      {/* Immediate service consent removed */}


      {/* Disclaimer consent - for AI features */}
      {variant === 'ai-disclaimer' && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-disclaimer"
            checked={consents.disclaimer || false}
            onCheckedChange={(checked) => updateConsent('disclaimer', !!checked)}
            className={cn(
              "mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary",
              error && !consents.disclaimer && "border-red-500"
            )}
          />
          <Label 
            htmlFor="consent-disclaimer" 
            className="text-sm text-white/80 cursor-pointer leading-relaxed"
          >
            Я понимаю, что это не медицинская помощь{' '}
            <Link 
              to="/legal/disclaimer" 
              target="_blank"
              className="text-primary underline hover:text-primary/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              (подробнее)
            </Link>
          </Label>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400 mt-2">
          Пожалуйста, подтвердите согласие со всеми условиями
        </p>
      )}
    </div>
  );
}

// Helper to validate consents based on variant
export function validateConsents(
  variant: 'registration' | 'payment' | 'ai-disclaimer',
  consents: ConsentCheckboxesProps['consents']
): boolean {
  switch (variant) {
    case 'registration':
      return !!(consents.offer && consents.privacy);
    case 'payment':
      return !!(consents.offer && consents.privacy);
    case 'ai-disclaimer':
      return !!consents.disclaimer;
    default:
      return false;
  }
}
