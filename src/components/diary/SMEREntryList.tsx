import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Trash2, Edit3, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/hooks/useI18n';
import { useSMEREntries, type SMEREntry } from '@/hooks/useSMEREntries';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SMEREntryListProps {
  entries: SMEREntry[];
  isLight?: boolean;
  onEdit?: (entry: SMEREntry) => void;
}

export function SMEREntryList({ entries, isLight = true, onEdit }: SMEREntryListProps) {
  const { t, language } = useI18n();
  const { deleteEntry } = useSMEREntries();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const locale = language === 'ru' ? ru : enUS;

  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      anxiety: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      fear: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
      anger: 'bg-red-500/20 text-red-700 border-red-500/30',
      sadness: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      shame: 'bg-pink-500/20 text-pink-700 border-pink-500/30',
      guilt: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
      frustration: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    };
    return colors[emotion] || 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteEntry(deleteId);
      setDeleteId(null);
    }
  };

  const handleCopy = async (entry: SMEREntry) => {
    const dateStr = format(new Date(entry.entry_date), 'd MMM yyyy', { locale });
    const emotionsStr = entry.emotions
      .map(e => `${t(`smer.emotionTypes.${e.emotion}`)} (${e.intensity})`)
      .join(', ');

    const lines = [
      `📋 ${isRu ? 'СМЭР-запись' : 'SMER Entry'} (${dateStr})`,
      '',
      `${isRu ? 'Ситуация' : 'Situation'}: ${entry.situation}`,
      `${isRu ? 'Мысли' : 'Thoughts'}: ${entry.thoughts}`,
      `${isRu ? 'Эмоции' : 'Emotions'}: ${emotionsStr}`,
    ];
    if (entry.reaction) {
      lines.push(`${isRu ? 'Реакция' : 'Reaction'}: ${entry.reaction}`);
    }
    if (entry.alternative_reaction) {
      lines.push(`${isRu ? 'Альтернатива' : 'Alternative'}: ${entry.alternative_reaction}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedId(entry.id);
      toast.success(t('common.copied'));
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const isRu = language === 'ru';

  if (entries.length === 0) {
    return (
      <Card className={`p-6 text-center ${
        isLight 
          ? 'bg-white border-gray-200' 
          : 'bg-white/5 border-white/10'
      }`}>
        <p className={isLight ? 'text-gray-500' : 'text-white/50'}>
          {t('smer.noEntries')}
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={`overflow-hidden ${
              isLight 
                ? 'bg-white border-gray-200 shadow-sm' 
                : 'bg-white/5 border-white/10'
            }`}>
              {/* Header - always visible */}
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className={`w-full p-4 text-left flex items-start justify-between gap-3 transition-colors ${
                  isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                      {format(new Date(entry.entry_date), 'd MMM yyyy', { locale })}
                    </span>
                  </div>
                  <p className={`text-sm line-clamp-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {entry.situation}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {entry.emotions.map(({ emotion, intensity }) => (
                      <Badge
                        key={emotion}
                        variant="outline"
                        className={`text-xs ${getEmotionColor(emotion)}`}
                      >
                        {t(`smer.emotionTypes.${emotion}`)} ({intensity})
                      </Badge>
                    ))}
                  </div>
                </div>
                {expandedId === entry.id ? (
                  <ChevronUp className={`w-5 h-5 flex-shrink-0 ${isLight ? 'text-gray-400' : 'text-white/65'}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 flex-shrink-0 ${isLight ? 'text-gray-400' : 'text-white/65'}`} />
                )}
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {expandedId === entry.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`px-4 pb-4 pt-2 border-t space-y-3 ${
                      isLight ? 'border-gray-100' : 'border-white/5'
                    }`}>
                      {/* Thoughts */}
                      <div>
                        <h4 className={`text-xs font-medium mb-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                          {t('smer.thoughts')}
                        </h4>
                        <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                          {entry.thoughts}
                        </p>
                      </div>

                      {/* Reaction */}
                      {entry.reaction && (
                        <div>
                          <h4 className={`text-xs font-medium mb-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                            {t('smer.reaction')}
                          </h4>
                          <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                            {entry.reaction}
                          </p>
                        </div>
                      )}

                      {/* Alternative */}
                      {entry.alternative_reaction && (
                        <div>
                          <h4 className={`text-xs font-medium mb-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                            {t('smer.alternative')}
                          </h4>
                          <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                            {entry.alternative_reaction}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(entry)}
                          className="gap-1.5"
                        >
                          {copiedId === entry.id ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === entry.id ? t('common.copied') : t('common.copy')}
                        </Button>
                        {onEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(entry)}
                            className="gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {t('common.edit')}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(entry.id)}
                          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('smer.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('smer.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
