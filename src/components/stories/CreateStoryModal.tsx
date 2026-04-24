import { useState } from 'react';
import { useStories } from '@/hooks/useStories';
import { useI18n } from '@/hooks/useI18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, PenLine } from 'lucide-react';

interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateStoryModal({ open, onOpenChange, onCreated }: CreateStoryModalProps) {
  const { t } = useI18n();
  const { createStory } = useStories({ sortBy: 'newest' });
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contentLength = content.trim().length;
  const isValid = contentLength >= 100;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createStory(content, title || undefined, isAnonymous);
    setIsSubmitting(false);

    if (result.error) {
      if (result.error.includes('one story per day')) {
        toast.error(t('stories.rateLimitError'));
      } else if (result.error.includes('100 characters')) {
        toast.error(t('stories.minLengthError'));
      } else {
        toast.error(result.error);
      }
      return;
    }

    toast.success(t('stories.storyPublished'));
    setTitle('');
    setContent('');
    setIsAnonymous(false);
    onCreated();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            {t('stories.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Title (optional) */}
          <div>
            <Input
              placeholder={t('stories.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          {/* Content */}
          <div>
            <Textarea
              placeholder={t('stories.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs ${contentLength < 100 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {contentLength < 100 
                  ? t('stories.minCharsRemaining', { count: 100 - contentLength })
                  : t('stories.charsCount', { count: contentLength })
                }
              </p>
              {contentLength < 100 && (
                <p className="text-xs text-muted-foreground">
                  {t('stories.minLengthHint')}
                </p>
              )}
            </div>
          </div>

          {/* Anonymous checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              disabled={isSubmitting}
            />
            <div>
              <p className="text-sm font-medium">{t('stories.anonymousLabel')}</p>
              <p className="text-xs text-muted-foreground">{t('stories.anonymousHint')}</p>
            </div>
          </label>

          {/* Submit button */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
              {t('stories.publishButton')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
