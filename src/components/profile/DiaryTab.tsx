import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Calendar } from "lucide-react";

export function DiaryTab({ userId }: { userId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="glass-card p-8 text-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
            <BookOpen className="w-10 h-10 text-blue-200" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              {t('diary.title')}
            </h3>
            <p className="text-blue-100/70 text-[15px]">
              {t('diary.subtitle')}
            </p>
          </div>

          <Button
            onClick={() => navigate("/emotion-calendar")}
            className="bg-gradient-to-r from-primary to-secondary text-white gap-2"
          >
            <Calendar className="w-4 h-4" />
            {t('diary.openCalendar')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
