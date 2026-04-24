import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ArrowLeft, BarChart3, Sparkles, CheckCircle, Pencil, Brain, LifeBuoy, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import SEO from "@/components/SEO";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { useMoodEntries, type MoodType } from "@/hooks/useMoodEntries";
import { useSMEREntries } from "@/hooks/useSMEREntries";
import { useCrisisSessions } from "@/hooks/useCrisisSessions";
import { EnhancedMoodSelector, getEnhancedMoodInfo } from "@/components/diary/EnhancedMoodSelector";
import { EnhancedDiaryStats } from "@/components/diary/EnhancedDiaryStats";
import { DiaryFormSkeleton, DiaryStatsSkeleton } from "@/components/diary/DiaryFormSkeleton";
import { createMoodDayContent } from "@/components/diary/MoodDayContent";
import { CrisisSessionCard } from "@/components/diary/CrisisSessionCard";
import { DiaryParticles } from "@/components/diary/DiaryParticles";
import { DiaryEmptyState } from "@/components/diary/DiaryEmptyState";
import { StreakGraceMessage } from "@/components/diary/StreakGraceMessage";
import { SMERPrompt, shouldTriggerSMER } from "@/components/diary/SMERPrompt";

import { DiaryAnalyticsDrawer } from "@/components/diary/DiaryAnalyticsDrawer";
import { ContextualNotePrompt, getContextualPlaceholder } from "@/components/diary/ContextualNotePrompt";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function Diary() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { entries, loading, stats, saveEntry, getEntryForDate } = useMoodEntries();
  const { entries: smerEntries, loading: smerLoading } = useSMEREntries();
  const { sessions: crisisSessions, loading: crisisLoading } = useCrisisSessions();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const isLightTheme = false;
  const [isEditing, setIsEditing] = useState(false);
  const [showJivaFeedback, setShowJivaFeedback] = useState(false);
  
  // New state for SMER integration
  const [showSMERPrompt, setShowSMERPrompt] = useState(false);
  const [showAnalyticsDrawer, setShowAnalyticsDrawer] = useState(false);
  const [lastSavedMood, setLastSavedMood] = useState<MoodType | null>(null);

  const locale = language === 'ru' ? ru : enUS;

  // Crisis date set for calendar overlay
  const crisisDates = useMemo(() => {
    return new Set(crisisSessions.map(s => s.created_at.slice(0, 10)));
  }, [crisisSessions]);

  // Recent SOS sessions
  const recentCrisisSessions = useMemo(() => crisisSessions.slice(0, 3), [crisisSessions]);

  // Create custom day content with mood colors + crisis overlay
  const MoodDayContent = useMemo(
    () => createMoodDayContent(entries, crisisDates),
    [entries, crisisDates]
  );

  // Load existing entry when date changes
  useEffect(() => {
    if (date) {
      const existing = getEntryForDate(date);
      if (existing) {
        setSelectedMood(existing.mood);
        setNote(existing.note || "");
      } else {
        setSelectedMood(null);
        setNote("");
      }
      setIsEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const existingEntry = date ? getEntryForDate(date) : undefined;

  const handleSave = async () => {
    if (!selectedMood || !date || !user) {
      if (!user) {
        toast.error(t('errors.unauthorized'));
        navigate('/auth');
      }
      return;
    }

    setSaving(true);
    const success = await saveEntry(selectedMood, note, date);
    setSaving(false);

    if (success) {
      setShowJivaFeedback(true);
      setLastSavedMood(selectedMood);
      setIsEditing(false);
      // Show SMER prompt for anxious moods after a short delay
      setTimeout(() => {
        setShowJivaFeedback(false);
        if (shouldTriggerSMER(selectedMood)) {
          setShowSMERPrompt(true);
        }
      }, 2000);
    } else {
      toast.error(t('errors.generic'));
    }
  };

  const getPlaceholder = useMemo(() => {
    return getContextualPlaceholder(selectedMood, language);
  }, [selectedMood, language]);

  // Recent entries (last 5)
  const recentEntries = entries.slice(0, 5);

  // SMER handlers
  const handleAnalyzeSMER = () => {
    setShowSMERPrompt(false);
    navigate('/smer');
  };

  const handleDismissSMER = () => {
    setShowSMERPrompt(false);
  };

  return (
    <>
      <SEO 
        title={t('diary.pageTitle')}
        description={t('diary.pageDescription')}
      />

      <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
        isLightTheme 
          ? "bg-gradient-to-b from-sky-50 via-blue-50/50 to-orange-50/80" 
          : "bg-[#080A10]"
      }`}>
        <DiaryParticles isLight={isLightTheme} />

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 px-4 py-3"
        >
          <div className={`max-w-6xl mx-auto flex items-center justify-between rounded-2xl px-3 py-2.5 ${
            isLightTheme 
              ? "bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-blue-100/20" 
              : "bg-white/5 backdrop-blur-xl border border-white/10"
          }`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isEditing ? setIsEditing(false) : navigate('/app')}
              className={`rounded-xl ${isLightTheme ? "text-gray-600 hover:bg-gray-100" : "text-white/70 hover:bg-white/10"}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <motion.div 
                className={`p-1.5 rounded-xl ${isLightTheme ? "bg-primary/10" : "bg-primary/20"}`}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </motion.div>
              <h1 className={`text-lg font-bold ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                {language === 'ru' ? 'Дневник настроения' : 'Mood Diary'}
              </h1>
            </div>
            
            {/* Analytics button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAnalyticsDrawer(true)}
              className={`rounded-xl ${isLightTheme ? "text-gray-600 hover:bg-gray-100" : "text-white/70 hover:bg-white/10"}`}
            >
              <BarChart3 className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        <div className="container max-w-6xl mx-auto px-4 py-4 pb-32 lg:pb-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-5 lg:gap-6">
            {/* Right: Entry Form - Shows first on mobile */}
            <div className="space-y-4 order-1 lg:order-2">
              {loading ? (
                <DiaryFormSkeleton isLight={isLightTheme} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Card className={`p-5 sm:p-6 rounded-3xl ${
                    isLightTheme 
                      ? "bg-white/80 border-white/60 shadow-xl shadow-blue-100/20 backdrop-blur-sm" 
                      : "bg-white/5 border-white/10 backdrop-blur-sm"
                  }`}>
                    <h2 className={`text-lg font-bold mb-4 ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                      {date ? format(date, "d MMMM yyyy", { locale }) : t('diary.selectDate')}
                    </h2>

                    {/* View mode: entry exists and not editing */}
                    {existingEntry && !isEditing ? (
                      <div className="space-y-4">
                        <div className={`flex items-center gap-3 p-4 rounded-2xl ${
                          isLightTheme ? "bg-green-50/80 border border-green-200/60" : "bg-green-500/10 border border-green-500/20"
                        }`}>
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                          <span className={`text-sm font-medium ${isLightTheme ? "text-green-700" : "text-green-400"}`}>
                            {language === 'ru' ? 'Запись сохранена' : 'Entry saved'}
                          </span>
                        </div>

                        <div className={`p-4 rounded-2xl ${
                          isLightTheme ? "bg-gray-50/80 border border-gray-100/60" : "bg-white/5 border border-white/5"
                        }`}>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{getEnhancedMoodInfo(existingEntry.mood)?.emoji || '❓'}</span>
                            <span className={`font-semibold ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                              {t(`diary.moods.${existingEntry.mood}`)}
                            </span>
                          </div>
                          {existingEntry.note && (
                            <p className={`text-sm mt-2 leading-relaxed ${isLightTheme ? "text-gray-600" : "text-white/70"}`}>
                              {existingEntry.note}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (existingEntry) {
                              setSelectedMood(existingEntry.mood);
                              setNote(existingEntry.note || "");
                            }
                            setIsEditing(true);
                          }}
                          className={`gap-1.5 ${isLightTheme ? "text-gray-500 hover:text-gray-700" : "text-white/50 hover:text-white/80"}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {language === 'ru' ? 'Редактировать' : 'Edit'}
                        </Button>

                        {/* SMER shortcut */}
                        <button
                          onClick={() => navigate('/smer')}
                          className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${
                            isLightTheme
                              ? "bg-violet-50/80 border border-violet-200/60 hover:bg-violet-100/80"
                              : "bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15"
                          }`}
                        >
                          <Brain className={`w-5 h-5 ${isLightTheme ? "text-violet-500" : "text-violet-400"}`} />
                          <div className="text-left">
                            <span className={`text-sm font-medium block ${isLightTheme ? "text-violet-700" : "text-violet-300"}`}>
                              {language === 'ru' ? 'Дневник СМЭР' : 'SMER Diary'}
                            </span>
                            <span className={`text-xs ${isLightTheme ? "text-violet-500/70" : "text-violet-400/60"}`}>
                              {language === 'ru' ? 'Разобрать ситуацию по шагам' : 'Break down a situation step by step'}
                            </span>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Mood Selector */}
                        <div className="mb-6">
                          <label className={`block text-sm font-medium mb-3 ${
                            isLightTheme ? "text-gray-600" : "text-white/70"
                          }`}>
                            {language === 'ru' ? 'Как ты себя чувствуешь?' : 'How are you feeling?'}
                          </label>
                          <EnhancedMoodSelector 
                            selectedMood={selectedMood} 
                            onSelect={setSelectedMood}
                            isLight={isLightTheme}
                          />
                        </div>

                        {/* Note with voice input */}
                        <div className="mb-6">
                          <div className="mb-2">
                            <label className={`block text-sm font-medium ${
                              isLightTheme ? "text-gray-600" : "text-white/70"
                            }`}>
                              {language === 'ru' ? 'Что хочешь запомнить?' : 'What do you want to remember?'}
                            </label>
                            <ContextualNotePrompt selectedMood={selectedMood} isLight={isLightTheme} />
                          </div>
                          <Textarea
                            placeholder={getPlaceholder}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className={`min-h-[100px] resize-none rounded-2xl ${
                              isLightTheme 
                                ? "bg-gray-50/80 border-gray-200/60 focus:border-primary placeholder:text-gray-400" 
                                : "bg-white/5 border-white/10 focus:border-primary placeholder:text-white/65"
                            }`}
                          />
                        </div>

                        {/* Desktop save button */}
                        <div className="relative group">
                          <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              onClick={handleSave}
                              disabled={!selectedMood || saving || !user}
                              size="lg"
                              className={`w-full rounded-2xl h-12 text-base font-semibold transition-all hidden sm:flex ${
                                selectedMood && user
                                  ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
                                  : ""
                              } ${
                                !selectedMood || !user
                                  ? isLightTheme
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200"
                                    : "bg-white/10 text-white/60 cursor-not-allowed hover:bg-white/10"
                                  : ""
                              }`}
                            >
                              {saving 
                                ? t('diary.saving') 
                                : existingEntry 
                                  ? (language === 'ru' ? 'Обновить запись' : 'Update Entry')
                                  : (language === 'ru' ? 'Сохранить запись' : 'Save Entry')
                              }
                            </Button>
                          </motion.div>
                          {!selectedMood && !saving && (
                            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${
                              isLightTheme ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                            }`}>
                              {language === 'ru' ? 'Выбери настроение' : 'Select a mood'}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* Empty State or Recent Entries */}
              {entries.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <DiaryEmptyState isLight={isLightTheme} />
                </motion.div>
              ) : (
                <>
                  <StreakGraceMessage entries={entries} isLight={isLightTheme} />
                  
                  {recentEntries.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className={`p-5 rounded-3xl ${
                        isLightTheme 
                          ? "bg-white/80 border-white/60 shadow-lg shadow-blue-100/20 backdrop-blur-sm" 
                          : "bg-white/5 border-white/10 backdrop-blur-sm"
                      }`}>
                        <h3 className={`text-base font-bold mb-3 ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                          {language === 'ru' ? 'Недавние записи' : 'Recent entries'}
                        </h3>
                        <div className="space-y-2">
                          {recentEntries.map((entry, index) => {
                            const moodInfo = getEnhancedMoodInfo(entry.mood);
                            return (
                              <motion.div 
                                key={entry.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.01, x: 4 }}
                                className={`p-3.5 rounded-2xl cursor-pointer transition-all ${
                                  isLightTheme 
                                    ? "bg-gray-50/80 hover:bg-gray-100 border border-gray-100/60" 
                                    : "bg-white/5 hover:bg-white/10 border border-white/5"
                                }`}
                                onClick={() => setDate(new Date(entry.entry_date))}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm ${isLightTheme ? "text-gray-500" : "text-white/60"}`}>
                                    {format(new Date(entry.entry_date), "d MMM", { locale })}
                                  </span>
                                  <span className="text-xl">{moodInfo?.emoji || '❓'}</span>
                                </div>
                                {entry.note && (
                                  <p className={`text-sm line-clamp-2 ${isLightTheme ? "text-gray-700" : "text-white/80"}`}>
                                    {entry.note}
                                  </p>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* SOS moments section */}
                  {recentCrisisSessions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <Card className={`p-5 rounded-3xl ${
                        isLightTheme
                          ? "bg-white/80 border-orange-100/60 shadow-lg backdrop-blur-sm"
                          : "bg-white/5 border-white/10 backdrop-blur-sm"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`text-base font-bold flex items-center gap-2 ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                            <LifeBuoy className="w-4 h-4 text-orange-400" />
                            {language === 'ru' ? 'SOS-моменты' : 'SOS moments'}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/diary/sos')}
                            className={`gap-1 text-xs ${isLightTheme ? "text-gray-500" : "text-white/60 hover:text-white"}`}
                          >
                            {language === 'ru' ? 'Все' : 'All'}
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {recentCrisisSessions.map((session) => (
                            <CrisisSessionCard key={session.id} session={session} isLight={isLightTheme} />
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Left: Calendar & Stats */}
            <div className="space-y-4 order-2 lg:order-1">
              {/* Stats Grid */}
              {loading ? (
                <DiaryStatsSkeleton isLight={isLightTheme} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <EnhancedDiaryStats 
                    stats={stats} 
                    totalEntries={entries.length} 
                    isLight={isLightTheme} 
                  />
                </motion.div>
              )}

              {/* Calendar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className={`p-5 rounded-3xl ${
                  isLightTheme 
                    ? "bg-white/80 border-white/60 shadow-lg shadow-blue-100/20 backdrop-blur-sm" 
                    : "bg-white/5 border-white/10 backdrop-blur-sm"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-base font-bold ${isLightTheme ? "text-gray-900" : "text-white"}`}>
                      <CalendarIcon className="w-4 h-4 inline mr-2" />
                      {language === 'ru' ? 'Календарь' : 'Calendar'}
                    </h2>
                  </div>
                  
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={locale}
                    className={`rounded-2xl ${isLightTheme ? "bg-white/50" : ""}`}
                    classNames={isLightTheme ? {
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold text-gray-900",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-8 w-8 bg-white p-0 border border-primary/20 rounded-xl hover:bg-primary/5 hover:border-primary/30 text-primary/70 hover:text-primary inline-flex items-center justify-center transition-colors shadow-sm",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-gray-600 rounded-md w-9 font-medium text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative rounded-xl",
                      day: "h-9 w-9 p-0 font-medium text-gray-800 hover:bg-primary/10 rounded-xl inline-flex items-center justify-center transition-colors",
                      day_range_end: "day-range-end",
                      day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-xl shadow-lg shadow-primary/25",
                      day_today: "bg-blue-100 text-blue-700 font-bold rounded-xl ring-2 ring-blue-300",
                      day_outside: "text-gray-400 opacity-50",
                      day_disabled: "text-gray-400 opacity-50",
                      day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary",
                      day_hidden: "invisible",
                    } : {
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold text-white",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-8 w-8 bg-white/10 p-0 border border-white/20 rounded-xl hover:bg-white/20 text-white/70 hover:text-white inline-flex items-center justify-center transition-colors",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-white/60 rounded-md w-9 font-medium text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative rounded-xl",
                      day: "h-9 w-9 p-0 font-medium text-white/90 hover:bg-white/10 rounded-xl inline-flex items-center justify-center transition-colors",
                      day_range_end: "day-range-end",
                      day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-xl shadow-lg shadow-primary/25",
                      day_today: "bg-primary/20 text-primary font-bold rounded-xl ring-2 ring-primary/30",
                      day_outside: "text-white/60 opacity-50",
                      day_disabled: "text-white/60 opacity-50",
                      day_range_middle: "aria-selected:bg-primary/20 aria-selected:text-primary",
                      day_hidden: "invisible",
                    }}
                    components={{
                      DayContent: MoodDayContent
                    }}
                  />
                </Card>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Save Button - hidden when viewing existing entry */}
        {!loading && (!existingEntry || isEditing) && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className={`fixed bottom-0 left-0 right-0 p-4 sm:hidden z-40 ${
              isLightTheme 
                ? "bg-white/90 backdrop-blur-xl border-t border-white/60" 
                : "bg-black/90 backdrop-blur-xl border-t border-white/10"
            }`}
          >
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              animate={selectedMood ? { 
                boxShadow: [
                  "0 0 0 0 rgba(var(--primary), 0)",
                  "0 0 0 8px rgba(var(--primary), 0)"
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Button
                onClick={handleSave}
                disabled={!selectedMood || saving || !user}
                size="lg"
                className={`w-full rounded-2xl h-14 text-base font-semibold ${
                  selectedMood && user
                    ? "bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
                    : ""
                }`}
              >
                {saving 
                  ? t('diary.saving') 
                  : existingEntry 
                    ? (language === 'ru' ? 'Обновить запись' : 'Update Entry')
                    : (language === 'ru' ? 'Сохранить запись' : 'Save Entry')
                }
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Success feedback toast */}
        <AnimatePresence>
          {showJivaFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-green-500/90 backdrop-blur-lg rounded-full shadow-lg flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5 text-white" />
              <span className="text-white font-medium text-sm">
                {language === 'ru' ? 'Запись сохранена!' : 'Entry saved!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SMER Prompt - shown after saving anxious mood */}
        <AnimatePresence>
          {showSMERPrompt && (
            <SMERPrompt
              onAnalyze={handleAnalyzeSMER}
              onDismiss={handleDismissSMER}
              mood={lastSavedMood || undefined}
            />
          )}
        </AnimatePresence>

        {/* Analytics Drawer */}
        <DiaryAnalyticsDrawer
          open={showAnalyticsDrawer}
          onOpenChange={setShowAnalyticsDrawer}
          entries={entries}
          smerEntries={smerEntries}
          stats={stats}
          onOpenSMERWizard={() => {
            setShowAnalyticsDrawer(false);
            navigate('/smer');
          }}
        />
      </div>
    </>
  );
}
