import { motion } from "framer-motion";
import { Phone, ArrowLeft, RotateCcw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useCrisisGeolocation } from "@/hooks/useCrisisGeolocation";

interface HotlineStepProps {
  isDark: boolean;
  onTryAgain: () => void;
  onBack: () => void;
}

interface Hotline {
  name: string;
  phone: string;
  description?: string;
}

const russianHotlines: Hotline[] = [
  { name: "Телефон доверия", phone: "8-800-2000-122", description: "Бесплатно, круглосуточно" },
  { name: "Центр экстренной помощи", phone: "112", description: "Экстренные службы" },
  { name: "Психологическая помощь", phone: "051", description: "Бесплатно с мобильного" },
];

const internationalHotlines: Hotline[] = [
  { name: "Crisis Text Line", phone: "Text HOME to 741741", description: "US" },
  { name: "Samaritans", phone: "116 123", description: "UK" },
  { name: "National Suicide Prevention", phone: "988", description: "US" },
];

export const HotlineStep = ({ isDark, onTryAgain, onBack }: HotlineStepProps) => {
  const { t, language } = useI18n();
  const { countryCode } = useCrisisGeolocation();

  const hotlines = countryCode === 'RU' || language === 'ru' ? russianHotlines : internationalHotlines;

  const handleCall = (phone: string) => {
    // Extract just the number for tel: link
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone) {
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  return (
    <div className="flex flex-col items-center text-center px-4 py-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`self-start mb-4 flex items-center gap-2 text-sm ${
          isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
        } transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      {/* Title */}
      <h2 className={`text-xl font-semibold mb-2 ${
        isDark ? 'text-white' : 'text-gray-800'
      }`}>
        {t('crisis.wizard.hotline.title')}
      </h2>

      <p className={`text-sm mb-6 max-w-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
        {t('crisis.wizard.hotline.subtitle')}
      </p>

      {/* Hotline cards */}
      <div className="flex flex-col gap-3 w-full max-w-xs mb-6">
        {hotlines.map((hotline, index) => (
          <motion.div
            key={hotline.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <button
              onClick={() => handleCall(hotline.phone)}
              className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                isDark 
                  ? 'bg-white/5 hover:bg-white/10 border border-white/10' 
                  : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDark ? 'bg-green-500/20' : 'bg-green-50'
              }`}>
                <Phone className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {hotline.name}
                </div>
                <div className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  {hotline.phone}
                </div>
                {hotline.description && (
                  <div className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                    {hotline.description}
                  </div>
                )}
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className={`flex items-center gap-2 mb-6 px-4 py-3 rounded-lg ${
          isDark ? 'bg-white/5' : 'bg-gray-50'
        }`}
      >
        <MessageCircle className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
        <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
          {t('crisis.wizard.hotline.message')}
        </p>
      </motion.div>

      {/* Try again button */}
      <Button
        onClick={onTryAgain}
        variant="outline"
        size="lg"
        className={`w-full max-w-xs py-4 rounded-xl ${
          isDark 
            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <RotateCcw className="w-5 h-5 mr-2" />
        {t('crisis.wizard.hotline.tryAgain')}
      </Button>
    </div>
  );
};
