import { motion } from "framer-motion";
import { Phone, Globe, ExternalLink } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useCrisisGeolocation } from "@/hooks/useCrisisGeolocation";
import { Button } from "@/components/ui/button";

interface HotlineCardProps {
  isDark: boolean;
}

export const HotlineCard = ({ isDark }: HotlineCardProps) => {
  const { t } = useI18n();
  const { hotlines, isLoading, countryCode } = useCrisisGeolocation();

  return (
    <div className={`h-full rounded-3xl p-6 backdrop-blur-xl border flex flex-col ${
      isDark 
        ? 'bg-gradient-to-br from-red-900/30 to-orange-900/30 border-white/10' 
        : 'bg-gradient-to-br from-red-100/80 to-orange-100/80 border-white/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {t('crisis.buttons.call')}
        </h3>
        {countryCode && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'
          }`}>
            {countryCode}
          </span>
        )}
      </div>

      {/* Hotlines */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {isLoading ? (
          <div className={`flex items-center justify-center py-8 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            {t('common.loading')}
          </div>
        ) : (
          hotlines.map((hotline, index) => (
            <motion.a
              key={index}
              href={`tel:${hotline.phone.replace(/\D/g, '')}`}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                isDark 
                  ? 'bg-white/5 hover:bg-white/10 border border-white/10' 
                  : 'bg-white/60 hover:bg-white/80 border border-white/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-red-500/30' : 'bg-red-200'
                }`}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Phone className={`w-5 h-5 ${isDark ? 'text-red-300' : 'text-red-600'}`} />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {hotline.name}
                </p>
                <p className={`text-lg font-bold ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                  {hotline.phone}
                </p>
              </div>
            </motion.a>
          ))
        )}
      </div>

      {/* International Link */}
      <div className={`mt-4 p-4 rounded-2xl ${
        isDark ? 'bg-white/5 border border-white/10' : 'bg-white/40 border border-white/30'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <Globe className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {t('crisis.international.title')}
            </p>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {t('crisis.international.description')}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`w-full ${
            isDark 
              ? 'border-white/20 text-white hover:bg-white/10' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => window.open("https://www.opencounseling.com/suicide-hotlines", "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {t('crisis.international.findContacts')}
        </Button>
      </div>
    </div>
  );
};
