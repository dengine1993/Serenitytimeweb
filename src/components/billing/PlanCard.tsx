import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { PlanConfig } from "@/config/plans";
import { useI18n } from "@/hooks/useI18n";
import { usePricing } from "@/hooks/usePricing";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: PlanConfig;
  isCurrentPlan?: boolean;
  onSelect: () => void;
  featured?: boolean;
}

export function PlanCard({ plan, isCurrentPlan, onSelect, featured }: PlanCardProps) {
  const { t } = useI18n();
  const { premiumMonthly } = usePricing();
  const displayPrice = plan.id === 'premium' ? premiumMonthly : plan.monthlyPriceRub;

  return (
    <div
      className={cn(
        "relative rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300",
        featured
          ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/50 shadow-[0_20px_80px_rgba(155,135,245,0.3)] scale-105"
          : "bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20"
      )}
    >
      {featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-sm font-medium">
          {t(`billing.${plan.id}.badge`)}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-white font-semibold text-2xl">
          {t(`billing.${plan.id}.name`)}
        </h3>
        <div className="text-white text-3xl font-bold">
          {displayPrice
            ? t(`billing.${plan.id}.price`, { price: displayPrice })
            : t(`billing.${plan.id}.price`)
          }
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <Feature 
          text={t(`billing.${plan.id}.features.therapy`)} 
        />
        <Feature 
          text={t(`billing.${plan.id}.features.navigator`)} 
        />
        {plan.features.prioritySupport && (
          <Feature 
            text={t(`billing.${plan.id}.features.priority`)} 
          />
        )}
      </div>

      <Button
        onClick={onSelect}
        disabled={isCurrentPlan}
        className={cn(
          "w-full font-medium",
          featured
            ? "bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg"
            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
        )}
      >
        {isCurrentPlan ? "Текущий план" : t(`billing.${plan.id}.cta`)}
      </Button>
    </div>
  );
}

function Feature({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Check className={cn(
        "w-5 h-5 flex-shrink-0 mt-0.5",
        muted ? "text-white/65" : "text-primary"
      )} />
      <span className={cn(
        "text-sm leading-relaxed",
        muted ? "text-white/50" : "text-white/80"
      )}>
        {text}
      </span>
    </div>
  );
}
