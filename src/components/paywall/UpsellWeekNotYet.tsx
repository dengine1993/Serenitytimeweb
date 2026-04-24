import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { Calendar } from "lucide-react";

interface UpsellWeekNotYetProps {
  daysRemaining: number;
  onAction: () => void;
}

export const UpsellWeekNotYet = ({ daysRemaining, onAction }: UpsellWeekNotYetProps) => {
  const { t, tp } = useI18n();

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-400/30 p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-purple-400/20">
          <Calendar className="w-6 h-6 text-purple-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-2">
            {t("paywall.upsells.weekNotYet.title")}
          </h3>
          <p className="text-blue-100/70 text-sm mb-4">
            {tp("paywall.upsells.weekNotYet.desc", { days: daysRemaining })}
          </p>
          <Button
            onClick={onAction}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:scale-105 transition-transform"
          >
            {t("paywall.upsells.weekNotYet.btn")}
          </Button>
        </div>
      </div>
    </Card>
  );
};
