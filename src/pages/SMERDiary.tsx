import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, Plus, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { useSMEREntries } from "@/hooks/useSMEREntries";
import { SMERWizard } from "@/components/diary/SMERWizard";
import { SMEREntryList } from "@/components/diary/SMEREntryList";
import SEO from "@/components/SEO";

export default function SMERDiary() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const { entries, loading, refetch } = useSMEREntries();
  const [showWizard, setShowWizard] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(() => {
    return !localStorage.getItem('smer_info_collapsed');
  });

  const isRu = language === 'ru';

  const handleCollapseInfo = () => {
    setInfoExpanded(false);
    localStorage.setItem('smer_info_collapsed', '1');
  };

  const handleExpandInfo = () => {
    setInfoExpanded(true);
    localStorage.removeItem('smer_info_collapsed');
  };

  return (
    <>
      <SEO
        title={isRu ? "Дневник СМЭР — Serenity" : "SMER Diary — Serenity"}
        description={isRu ? "Разбирайте сложные ситуации по шагам с методом СМЭР" : "Break down difficult situations step by step with the SMER method"}
      />

      <div className="min-h-screen bg-[#080A10] relative overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 px-4 py-3"
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between rounded-2xl px-3 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/diary')}
              className="rounded-xl text-white/70 hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <motion.div
                className="p-1.5 rounded-xl bg-violet-500/20"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Brain className="w-5 h-5 text-violet-400" />
              </motion.div>
              <h1 className="text-lg font-bold text-white">
                {isRu ? 'Дневник СМЭР' : 'SMER Diary'}
              </h1>
            </div>

            <div className="w-10" />
          </div>
        </motion.div>

        <div className="container max-w-2xl mx-auto px-4 py-4 pb-32 space-y-5">
          {/* Info block — collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="p-5 rounded-3xl bg-violet-500/10 border-violet-500/20 backdrop-blur-sm">
              <button
                onClick={infoExpanded ? handleCollapseInfo : handleExpandInfo}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-violet-300">
                    {isRu ? 'Что такое СМЭР?' : 'What is SMER?'}
                  </span>
                </div>
                {infoExpanded
                  ? <ChevronUp className="w-4 h-4 text-violet-400/60" />
                  : <ChevronDown className="w-4 h-4 text-violet-400/60" />
                }
              </button>

              <AnimatePresence>
                {infoExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-violet-300/80 mt-3 leading-relaxed">
                      {isRu
                        ? 'СМЭР — это метод когнитивно-поведенческой терапии. Он помогает разобрать сложную ситуацию по шагам: что произошло, какие мысли возникли, какие эмоции вы почувствовали и как отреагировали. Регулярная практика помогает замечать автоматические мысли и находить более конструктивные способы реагирования.'
                        : 'SMER is a cognitive-behavioral therapy method. It helps you break down a difficult situation step by step: what happened, what thoughts arose, what emotions you felt, and how you reacted. Regular practice helps you notice automatic thoughts and find more constructive ways to respond.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* New entry button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              onClick={() => setShowWizard(true)}
              size="lg"
              className="w-full rounded-2xl h-14 text-base font-semibold bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25 gap-2"
            >
              <Plus className="w-5 h-5" />
              {isRu ? 'Новая запись' : 'New Entry'}
            </Button>
          </motion.div>

          {/* Entries list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {loading ? (
              <Card className="p-6 rounded-3xl bg-white/5 border-white/10">
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </Card>
            ) : entries.length === 0 ? (
              <Card className="p-8 rounded-3xl bg-white/5 border-white/10 text-center">
                <Brain className="w-12 h-12 text-white/15 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">
                  {isRu ? 'Пока нет записей' : 'No entries yet'}
                </h3>
                <p className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed">
                  {isRu
                    ? 'Создайте первую запись, чтобы начать замечать связь между мыслями, эмоциями и реакциями.'
                    : 'Create your first entry to start noticing the connection between thoughts, emotions, and reactions.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-medium text-white/60">
                    {isRu ? `Ваши записи (${entries.length})` : `Your entries (${entries.length})`}
                  </h3>
                </div>
                <SMEREntryList entries={entries} isLight={false} />
              </div>
            )}
          </motion.div>
        </div>

        {/* SMER Wizard */}
        <SMERWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          onSuccess={() => refetch()}
        />
      </div>
    </>
  );
}
