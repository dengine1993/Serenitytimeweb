import { motion } from "framer-motion";
import { ArrowLeft, LifeBuoy, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";
import { useCrisisSessions } from "@/hooks/useCrisisSessions";
import { CrisisSessionCard } from "@/components/diary/CrisisSessionCard";
import { toast } from "sonner";

export default function CrisisJournal() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const { sessions, loading, stats, deleteSession } = useCrisisSessions();

  const handleDelete = async (id: string) => {
    const ok = await deleteSession(id);
    if (ok) toast.success(language === "ru" ? "Запись удалена" : "Entry deleted");
    else toast.error(language === "ru" ? "Не удалось удалить" : "Failed to delete");
  };

  return (
    <>
      <SEO
        title={language === "ru" ? "SOS-журнал" : "SOS Journal"}
        description={
          language === "ru"
            ? "История моментов, когда ты справился сам"
            : "History of moments when you coped on your own"
        }
      />
      <div className="min-h-screen bg-[#080A10] relative">
        {/* Header */}
        <div className="sticky top-0 z-40 px-4 py-3 bg-[#080A10]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/diary")}
              className="rounded-xl text-white/70 hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-orange-400" />
              <h1 className="text-lg font-bold text-white">
                {language === "ru" ? "SOS-журнал" : "SOS Journal"}
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-4">
          {/* Stats */}
          {sessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-3"
            >
              <Card className="p-3 rounded-2xl bg-white/5 border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-[11px] text-white/60 mt-0.5">
                  {language === "ru" ? "всего сессий" : "total sessions"}
                </div>
              </Card>
              <Card className="p-3 rounded-2xl bg-white/5 border-white/10 text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats.betterCount}</div>
                <div className="text-[11px] text-white/60 mt-0.5">
                  {language === "ru" ? "стало лучше" : "felt better"}
                </div>
              </Card>
            </motion.div>
          )}

          {/* List */}
          {loading ? (
            <div className="text-center text-white/60 py-8 text-sm">
              {language === "ru" ? "Загрузка..." : "Loading..."}
            </div>
          ) : sessions.length === 0 ? (
            <Card className="p-8 rounded-3xl bg-white/5 border-white/10 text-center">
              <div className="text-4xl mb-3">🆘</div>
              <p className="text-white/80 text-sm leading-relaxed">
                {language === "ru"
                  ? "Здесь будут появляться моменты, когда ты прошёл через сложное состояние с помощью SOS-практик."
                  : "Moments when you went through a difficult state with SOS practices will appear here."}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="relative group">
                  <CrisisSessionCard session={session} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(session.id)}
                    className="absolute top-3 right-12 w-7 h-7 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={language === "ru" ? "Удалить" : "Delete"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
