import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmotionIntensityPicker, type EmotionWithIntensity } from './EmotionIntensityPicker';
import { useI18n } from '@/hooks/useI18n';
import { useSMEREntries, type SMERFormData } from '@/hooks/useSMEREntries';

interface SMERFormProps {
  isLight?: boolean;
  onSuccess?: () => void;
}

export function SMERForm({ isLight = true, onSuccess }: SMERFormProps) {
  const { t } = useI18n();
  const { saveEntry, saving } = useSMEREntries();

  const [situation, setSituation] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [emotions, setEmotions] = useState<EmotionWithIntensity[]>([]);
  const [reaction, setReaction] = useState('');
  const [alternative, setAlternative] = useState('');

  const isValid = situation.trim() && thoughts.trim() && emotions.length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;

    const data: SMERFormData = {
      situation: situation.trim(),
      thoughts: thoughts.trim(),
      emotions,
      reaction: reaction.trim() || undefined,
      alternative_reaction: alternative.trim() || undefined
    };

    const success = await saveEntry(data);
    if (success) {
      // Reset form
      setSituation('');
      setThoughts('');
      setEmotions([]);
      setReaction('');
      setAlternative('');
      onSuccess?.();
    }
  };

  const textareaClass = `min-h-[80px] resize-none ${
    isLight 
      ? 'bg-gray-50 border-gray-200 focus:border-primary placeholder:text-gray-400' 
      : 'bg-white/5 border-white/10 focus:border-primary placeholder:text-white/65'
  }`;

  const labelClass = `text-sm font-medium ${isLight ? 'text-gray-700' : 'text-white/80'}`;

  return (
    <Card className={`p-4 sm:p-5 ${
      isLight 
        ? 'bg-white border-gray-200 shadow-sm' 
        : 'bg-white/5 border-white/10 backdrop-blur-sm'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${isLight ? 'bg-primary/10' : 'bg-primary/20'}`}>
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <h2 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {t('smer.newEntry')}
        </h2>
      </div>

      <div className="space-y-4">
        {/* Situation */}
        <div>
          <Label className={labelClass}>
            {t('smer.situation')} <span className="text-red-500">*</span>
          </Label>
          <p className={`text-xs mb-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
            {t('smer.situationHint')}
          </p>
          <Textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder={t('smer.situationPlaceholder')}
            className={textareaClass}
          />
        </div>

        {/* Thoughts */}
        <div>
          <Label className={labelClass}>
            {t('smer.thoughts')} <span className="text-red-500">*</span>
          </Label>
          <p className={`text-xs mb-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
            {t('smer.thoughtsHint')}
          </p>
          <Textarea
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            placeholder={t('smer.thoughtsPlaceholder')}
            className={textareaClass}
          />
        </div>

        {/* Emotions */}
        <div>
          <Label className={labelClass}>
            {t('smer.emotions')} <span className="text-red-500">*</span>
          </Label>
          <p className={`text-xs mb-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
            {t('smer.emotionsHint')}
          </p>
          <EmotionIntensityPicker
            value={emotions}
            onChange={setEmotions}
            isLight={isLight}
          />
        </div>

        {/* Reaction */}
        <div>
          <Label className={labelClass}>{t('smer.reaction')}</Label>
          <p className={`text-xs mb-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
            {t('smer.reactionHint')}
          </p>
          <Textarea
            value={reaction}
            onChange={(e) => setReaction(e.target.value)}
            placeholder={t('smer.reactionPlaceholder')}
            className={textareaClass}
          />
        </div>

        {/* Alternative */}
        <div>
          <Label className={labelClass}>{t('smer.alternative')}</Label>
          <p className={`text-xs mb-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
            {t('smer.alternativeHint')}
          </p>
          <Textarea
            value={alternative}
            onChange={(e) => setAlternative(e.target.value)}
            placeholder={t('smer.alternativePlaceholder')}
            className={textareaClass}
          />
        </div>

        {/* Submit */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            size="lg"
            className="w-full gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('smer.save')}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </Card>
  );
}
