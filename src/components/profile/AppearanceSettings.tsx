import { motion } from "framer-motion";
import { Monitor } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/hooks/useI18n";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function AppearanceSettings() {
  const { language } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const isRu = language === 'ru';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Reduced Motion */}
      <Card className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Monitor className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">
                  {isRu ? 'Уменьшить анимации' : 'Reduce Motion'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRu 
                    ? 'Упрощённые анимации для комфорта'
                    : 'Simplified animations for comfort'
                  }
                </p>
              </div>
              <Switch
                checked={Boolean(prefersReducedMotion)}
                disabled
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
