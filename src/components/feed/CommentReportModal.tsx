import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CommentReportModalProps {
  commentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Спам' },
  { value: 'harassment', label: 'Оскорбления / Травля' },
  { value: 'inappropriate', label: 'Неуместный контент' },
  { value: 'misinformation', label: 'Ложная информация' },
  { value: 'self_harm', label: 'Призывы к самоповреждению' },
  { value: 'other', label: 'Другое' },
];

export function CommentReportModal({ commentId, isOpen, onClose }: CommentReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('comment_reports')
      .insert({
        comment_id: commentId,
        reporter_id: user.id,
        reason,
        details: details.trim() || null
      });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('Вы уже отправляли жалобу на этот комментарий');
      } else {
        toast.error('Не удалось отправить жалобу');
      }
      return;
    }

    toast.success('Жалоба отправлена. Спасибо!');
    setReason('');
    setDetails('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Пожаловаться на комментарий</DialogTitle>
          <DialogDescription>
            Выберите причину жалобы. Мы рассмотрим её в ближайшее время.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REPORT_REASONS.map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value} id={`comment-${value}`} />
                <Label htmlFor={`comment-${value}`} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </RadioGroup>

          {reason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="comment-details">Подробности (необязательно)</Label>
              <Textarea
                id="comment-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                placeholder="Опишите проблему..."
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? 'Отправка...' : 'Отправить жалобу'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
