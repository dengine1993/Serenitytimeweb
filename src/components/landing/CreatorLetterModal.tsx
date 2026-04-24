import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Zap, Brain, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CreatorLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const CreatorLetterModal = ({ isOpen, onClose, userId }: CreatorLetterModalProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChoicePremium = async () => {
    setIsProcessing(true);
    try {
      // Mark letter as shown
      await supabase
        .from('profiles')
        .update({ creator_letter_shown: true })
        .eq('user_id', userId);

      // Navigate to premium page
      navigate('/premium');
      onClose();
    } catch (error) {
      console.error('Error choosing premium:', error);
      toast.error('Что-то пошло не так');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChoiceFree = async () => {
    setIsProcessing(true);
    try {
      // Mark letter as shown and end trial
      await supabase
        .from('profiles')
        .update({ 
          creator_letter_shown: true,
        })
        .eq('user_id', userId);

      toast.success('Ты остаёшься на бесплатной версии');
      onClose();
    } catch (error) {
      console.error('Error choosing free:', error);
      toast.error('Что-то пошло не так');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-card rounded-3xl p-8 pointer-events-auto"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="inline-block mb-4"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                    <Heart className="w-10 h-10 text-primary" fill="currentColor" />
                  </div>
                </motion.div>

                <h2 className="text-3xl font-bold mb-2">{t('index.creatorLetter.title')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('index.creatorLetter.greeting')} {t('index.creatorLetter.intro')}
                </p>
              </div>

              {/* Body text */}
              <div className="mb-8 text-center max-w-2xl mx-auto">
                <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                  {t('index.creatorLetter.body')}
                </p>
              </div>

              {/* Choice cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Premium Choice */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card p-6 rounded-2xl border-2 border-primary/50 relative overflow-hidden group cursor-pointer"
                  onClick={handleChoicePremium}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{t('index.creatorLetter.choice.premium.title')}</h3>
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    
                    <p className="text-2xl font-bold text-primary mb-2">
                      {t('index.creatorLetter.choice.premium.price')}
                    </p>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('index.creatorLetter.choice.premium.description')}
                    </p>

                    <div className="space-y-2">
                      {['features.0', 'features.1', 'features.2', 'features.3'].map((key, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{t(`index.creatorLetter.choice.premium.${key}`)}</span>
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full mt-6 bg-gradient-to-r from-primary to-secondary"
                      disabled={isProcessing}
                    >
                      {t('index.creatorLetter.cta.premium')}
                    </Button>
                  </div>
                </motion.div>

                {/* Free Choice */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card p-6 rounded-2xl border-2 border-white/20 relative overflow-hidden group cursor-pointer"
                  onClick={handleChoiceFree}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{t('index.creatorLetter.choice.free.title')}</h3>
                      <Brain className="w-6 h-6 text-muted-foreground" />
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('index.creatorLetter.choice.free.description')}
                    </p>

                    <div className="space-y-2 mb-6">
                      {['features.0', 'features.1', 'features.2', 'features.3'].map((key, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                          <span>{t(`index.creatorLetter.choice.free.${key}`)}</span>
                        </div>
                      ))}
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={isProcessing}
                    >
                      {t('index.creatorLetter.cta.free')}
                    </Button>
                  </div>
                </motion.div>
              </div>

              {/* Footer message */}
              <p className="text-center text-muted-foreground italic">
                {t('index.creatorLetter.thanks')}
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
