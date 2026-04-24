import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { Clock } from "lucide-react";

export const UpsellMinutesLow = ({ onAction }: { onAction: () => void }) => {
  const { t } = useI18n();

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-400/30 p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-amber-400/20">
          <Clock className="w-6 h-6 text-amber-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-2">
            {t("paywall.upsells.minutesLow.title")}
          </h3>
          <p className="text-blue-100/70 text-sm mb-4">
            {t("paywall.upsells.minutesLow.desc")}
          </p>
          <Button
            onClick={onAction}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-105 transition-transform"
          >
            {t("paywall.upsells.minutesLow.btn")}
          </Button>
        </div>
      </div>
    </Card>
  );
};
