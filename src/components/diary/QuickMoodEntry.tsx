import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";
import { useMoodEntries, type MoodType } from "@/hooks/useMoodEntries";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MoodOption {
  value: MoodType;
  emoji: string;
  labelKey: string;
}

const quickMoods: MoodOption[] = [
  { value: "joy", emoji: "☀️", labelKey: "diary.moods.joy" },
  { value: "calm", emoji: "☁️", labelKey: "diary.moods.calm" },
  { value: "neutral", emoji: "😐", labelKey: "diary.moods.neutral" },
  { value: "anxiety", emoji: "🌊", labelKey: "diary.moods.anxiety" },
  { value: "sadness", emoji: "💧", labelKey: "diary.moods.sadness" },
  { value: "anger", emoji: "🔥", labelKey: "diary.moods.anger" },
  { value: "fatigue", emoji: "🌙", labelKey: "diary.moods.fatigue" },
  { value: "fear", emoji: "😨", labelKey: "diary.moods.fear" },
];

const AUTO_SAVE_DELAY = 800;

interface QuickMoodEntryProps {
  onComplete?: () => void;
  compact?: boolean;
}

export function QuickMoodEntry({ onComplete, compact = false }: QuickMoodEntryProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { saveEntry, getEntryForDate } = useMoodEntries();
  
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentNoteRef = useRef(note);

  // Keep note ref in sync
  useEffect(() => {
    currentNoteRef.current = note;
  }, [note]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Check if today already has an entry
  const todayEntry = getEntryForDate(new Date());

  const performSave = useCallback(async (mood: MoodType, noteText: string) => {
    if (!user) {
      toast.error(t('errors.unauthorized'));
      return false;
    }

    setAutoSaving(true);
    const success = await saveEntry(mood, noteText, new Date());
    setAutoSaving(false);

    if (success) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setSelectedMood(null);
        setNote("");
        setShowNote(false);
        onComplete?.();
      }, 1500);
      return true;
    } else {
      toast.error(t('errors.generic'));
      return false;
    }
  }, [user, saveEntry, onComplete, t]);

  const handleMoodSelect = useCallback((mood: MoodType) => {
    setSelectedMood(mood);
    
    // Clear previous timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Start auto-save timer
    saveTimeoutRef.current = setTimeout(() => {
      performSave(mood, currentNoteRef.current);
    }, AUTO_SAVE_DELAY);
  }, [performSave]);

  const handleNoteBlur = useCallback(() => {
    // If mood is selected and note has content, trigger save now
    if (selectedMood && note.trim()) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      performSave(selectedMood, note);
    }
  }, [selectedMood, note, performSave]);

  // If already saved today, show compact confirmation
  if (todayEntry && !saved) {
    return (
      <Card className="p-4 bg-white/5 border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-500/20">
            <Check className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white/90">
              {language === 'ru' ? 'Сегодня уже записано' : 'Already logged today'}
            </p>
            <p className="text-xs text-white/60">
              {t(`diary.moods.${todayEntry.mood}`)}
            </p>
          </div>
          <span className="text-2xl">
            {quickMoods.find(m => m.value === todayEntry.mood)?.emoji || '✨'}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden bg-white/5 border-white/10 backdrop-blur-sm ${compact ? 'p-3' : 'p-4'}`}>
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2 py-4"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              <Check className="w-8 h-8 text-green-400" />
            </motion.div>
            <span className="text-lg font-medium text-white">
              {language === 'ru' ? 'Записано!' : 'Saved!'}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white/90">
                {language === 'ru' ? 'Как ты сейчас?' : 'How are you now?'}
              </span>
            </div>

            {/* Mood buttons */}
            <div className="relative">
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                {quickMoods.map((mood) => {
                  const isSelected = selectedMood === mood.value;
                  return (
                    <motion.button
                      key={mood.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMoodSelect(mood.value)}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all min-w-[72px] min-h-[60px]
                        ${isSelected
                          ? "border-primary bg-primary/20 shadow-lg shadow-primary/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                        }
                      `}
                    >
                      <span className="text-lg">{mood.emoji}</span>
                      <span className="text-[10px] text-white/60 mt-0.5 text-center leading-tight">
                        {t(mood.labelKey)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {/* Swipe hint gradient */}
              <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white/10 to-transparent pointer-events-none rounded-r-xl" />
            </div>

            {/* Optional note toggle & auto-save status */}
            <AnimatePresence>
              {selectedMood && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <button
                    onClick={() => setShowNote(!showNote)}
                    className="flex items-center gap-1 text-xs text-white/60 hover:text-white/80 mb-2 transition-colors"
                  >
                    {showNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {language === 'ru' ? 'Добавить заметку' : 'Add a note'}
                  </button>

                  <AnimatePresence>
                    {showNote && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3"
                      >
                        <Textarea
                          placeholder={language === 'ru' ? 'Одно предложение...' : 'One sentence...'}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          onBlur={handleNoteBlur}
                          className="min-h-[60px] resize-none rounded-xl bg-white/5 border-white/10 text-sm placeholder:text-white/40"
                          maxLength={200}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Auto-save status indicator */}
                  <div className="flex items-center justify-center h-8">
                    {autoSaving ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-xs text-white/60"
                      >
                        <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                        {language === 'ru' ? 'Сохраняю...' : 'Saving...'}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        className="flex items-center gap-1.5 text-xs text-white/50"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                        {language === 'ru' ? 'Сохранится автоматически' : 'Will save automatically'}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
