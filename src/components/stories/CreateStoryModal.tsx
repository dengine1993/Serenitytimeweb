import { useState } from 'react';
import { useStories, STORY_MIN_LENGTH } from '@/hooks/useStories';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contentLength = content.trim().length;
  const isValid = contentLength >= STORY_MIN_LENGTH;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createStory(content, title || undefined);
    setIsSubmitting(false);

    if (result.error) {
      const err = result.error;
      if (err === 'rate_limit') {
        toast.error(t('stories.rateLimitError'));
      } else if (err.startsWith('min_length:')) {
        toast.error(t('stories.minLengthError'));
      } else if (err === 'too_long') {
        toast.error(t('stories.tooLongError'));
      } else {
        toast.error(err);
      }
      return;
    }

    toast.success(t('stories.storyPublished'));
    setTitle('');
    setContent('');
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
          <div>
            <Input
              placeholder={t('stories.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Textarea
              placeholder={t('stories.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs ${contentLength < STORY_MIN_LENGTH ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {contentLength < STORY_MIN_LENGTH
                  ? t('stories.minCharsRemaining', { count: STORY_MIN_LENGTH - contentLength })
                  : t('stories.charsCount', { count: contentLength })
                }
              </p>
              {contentLength < STORY_MIN_LENGTH && (
                <p className="text-xs text-muted-foreground">
                  {t('stories.minLengthHint')}
                </p>
              )}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/90 italic">
              {t('stories.createHint')}
            </p>
          </div>

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
