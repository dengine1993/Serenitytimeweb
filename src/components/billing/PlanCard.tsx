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
          ? "bg-gradient-to-br from-orange-500/22 via-rose-500/15 to-amber-400/18 border-2 border-orange-400/55 shadow-[0_20px_80px_-15px_rgba(249,115,22,0.45)] scale-105"
          : "bg-white/5 backdrop-blur-xl border border-white/10 hover:border-orange-400/30"
      )}
    >
      {featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium border border-orange-300/40 shadow-[0_0_18px_rgba(249,115,22,0.5)]">
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
            ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border border-orange-300/30 shadow-[0_0_22px_rgba(249,115,22,0.45)]"
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
        muted ? "text-white/65" : "text-amber-300"
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
