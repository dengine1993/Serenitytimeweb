import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useI18n } from '@/hooks/useI18n';

export interface EmotionWithIntensity {
  emotion: string;
  intensity: number;
}

interface EmotionIntensityPickerProps {
  value: EmotionWithIntensity[];
  onChange: (emotions: EmotionWithIntensity[]) => void;
  isLight?: boolean;
}

const EMOTION_TYPES = [
  { key: 'anxiety', color: 'bg-yellow-500', emoji: '😰' },
  { key: 'fear', color: 'bg-purple-500', emoji: '😨' },
  { key: 'anger', color: 'bg-red-500', emoji: '😠' },
  { key: 'sadness', color: 'bg-blue-500', emoji: '😢' },
  { key: 'shame', color: 'bg-pink-500', emoji: '😳' },
  { key: 'guilt', color: 'bg-indigo-500', emoji: '😔' },
  { key: 'frustration', color: 'bg-orange-500', emoji: '😤' },
];

export function EmotionIntensityPicker({ value, onChange, isLight = true }: EmotionIntensityPickerProps) {
  const { t } = useI18n();
  const [showPicker, setShowPicker] = useState(false);

  const addEmotion = (emotionKey: string) => {
    if (value.some(e => e.emotion === emotionKey)) return;
    onChange([...value, { emotion: emotionKey, intensity: 5 }]);
    setShowPicker(false);
  };

  const removeEmotion = (emotionKey: string) => {
    onChange(value.filter(e => e.emotion !== emotionKey));
  };

  const updateIntensity = (emotionKey: string, intensity: number) => {
    onChange(value.map(e => 
      e.emotion === emotionKey ? { ...e, intensity } : e
    ));
  };

  const availableEmotions = EMOTION_TYPES.filter(
    et => !value.some(v => v.emotion === et.key)
  );

  const getEmotionInfo = (key: string) => 
    EMOTION_TYPES.find(et => et.key === key);

  return (
    <div className="space-y-3">
      {/* Selected emotions with sliders */}
      <AnimatePresence>
        {value.map(({ emotion, intensity }) => {
          const info = getEmotionInfo(emotion);
          return (
            <motion.div
              key={emotion}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`p-3 rounded-xl ${
                isLight ? 'bg-gray-50 border border-gray-200' : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info?.emoji}</span>
                  <span className={`text-sm font-medium ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                    {t(`smer.emotionTypes.${emotion}`)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold min-w-[2ch] text-right ${
                    isLight ? 'text-gray-900' : 'text-white'
                  }`}>
                    {intensity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${isLight ? 'hover:bg-gray-200' : 'hover:bg-white/10'}`}
                    onClick={() => removeEmotion(emotion)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[intensity]}
                onValueChange={([val]) => updateIntensity(emotion, val)}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add emotion button */}
      {availableEmotions.length > 0 && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPicker(!showPicker)}
            className={`w-full gap-2 ${
              isLight 
                ? 'border-dashed border-gray-300 hover:bg-gray-50' 
                : 'border-dashed border-white/20 hover:bg-white/5'
            }`}
          >
            <Plus className="w-4 h-4" />
            {t('smer.addEmotion')}
          </Button>

          {/* Emotion picker dropdown */}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`absolute top-full left-0 right-0 mt-2 p-2 rounded-xl z-10 ${
                  isLight 
                    ? 'bg-white border border-gray-200 shadow-lg' 
                    : 'bg-gray-900 border border-white/10'
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  {availableEmotions.map((et) => (
                    <button
                      key={et.key}
                      type="button"
                      onClick={() => addEmotion(et.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                        isLight 
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                          : 'bg-white/10 hover:bg-white/20 text-white/80'
                      }`}
                    >
                      <span>{et.emoji}</span>
                      <span className="text-sm">{t(`smer.emotionTypes.${et.key}`)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {value.length === 0 && (
        <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
          {t('smer.noEmotionsSelected')}
        </p>
      )}
    </div>
  );
}
