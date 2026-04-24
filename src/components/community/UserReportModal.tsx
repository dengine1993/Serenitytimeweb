import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  ShieldAlert, 
  MessageSquareWarning,
  Ban,
  Loader2,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UserReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onBlockUser?: () => Promise<void>;
}

const REPORT_REASONS = [
  { id: 'harassment', labelRu: 'Оскорбления или травля', labelEn: 'Harassment or bullying' },
  { id: 'spam', labelRu: 'Спам или реклама', labelEn: 'Spam or advertising' },
  { id: 'inappropriate', labelRu: 'Неподобающий контент', labelEn: 'Inappropriate content' },
  { id: 'impersonation', labelRu: 'Выдаёт себя за другого', labelEn: 'Impersonation' },
  { id: 'threats', labelRu: 'Угрозы или опасное поведение', labelEn: 'Threats or dangerous behavior' },
  { id: 'other', labelRu: 'Другое', labelEn: 'Other' },
];

export function UserReportModal({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  onBlockUser 
}: UserReportModalProps) {
  const { language } = useI18n();
  const { user } = useAuth();
  const isRu = language === 'ru';
  
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [shouldBlock, setShouldBlock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const handleSubmit = async () => {
    if (!reason || !user) return;

    setIsSubmitting(true);
    try {
      // Submit report
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_user_id: userId,
        reason,
        details: details.trim() || null,
      });

      if (error) throw error;

      // Block user if checkbox is checked
      if (shouldBlock && onBlockUser) {
        await onBlockUser();
      }

      setStep('success');
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(isRu ? 'Ошибка отправки жалобы' : 'Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDetails('');
    setShouldBlock(true);
    setStep('form');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <DialogTitle>
                      {isRu ? 'Пожаловаться на пользователя' : 'Report User'}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {userName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {/* Reason selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {isRu ? 'Причина жалобы' : 'Reason for report'}
                  </Label>
                  <RadioGroup value={reason} onValueChange={setReason}>
                    {REPORT_REASONS.map((r) => (
                      <div
                        key={r.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          reason === r.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setReason(r.id)}
                      >
                        <RadioGroupItem value={r.id} id={r.id} />
                        <Label htmlFor={r.id} className="cursor-pointer flex-1">
                          {isRu ? r.labelRu : r.labelEn}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <Label htmlFor="details" className="text-sm font-medium">
                    {isRu ? 'Подробности (необязательно)' : 'Details (optional)'}
                  </Label>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={isRu 
                      ? 'Опишите ситуацию подробнее...' 
                      : 'Describe the situation in more detail...'
                    }
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {details.length}/500
                  </p>
                </div>

                {/* Block checkbox */}
                {onBlockUser && (
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                    <Checkbox
                      id="block"
                      checked={shouldBlock}
                      onCheckedChange={(checked) => setShouldBlock(checked === true)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="block" className="cursor-pointer font-medium">
                        {isRu ? 'Также заблокировать пользователя' : 'Also block this user'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isRu 
                          ? 'Пользователь не сможет писать вам и видеть вашу активность' 
                          : 'User won\'t be able to message you or see your activity'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  {isRu ? 'Отмена' : 'Cancel'}
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!reason || isSubmitting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isRu ? 'Отправка...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {isRu ? 'Отправить жалобу' : 'Submit Report'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <ShieldAlert className="w-8 h-8 text-green-500" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">
                {isRu ? 'Жалоба отправлена' : 'Report Submitted'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isRu 
                  ? 'Модераторы рассмотрят вашу жалобу в ближайшее время' 
                  : 'Moderators will review your report soon'
                }
              </p>
              {shouldBlock && (
                <p className="text-muted-foreground text-sm mt-2">
                  {isRu ? 'Пользователь заблокирован' : 'User has been blocked'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
