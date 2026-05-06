import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

interface InlineCommentEditorProps {
  initialValue: string;
  maxLength?: number;
  onSave: (text: string) => Promise<void> | void;
  onCancel: () => void;
  className?: string;
  autoFocus?: boolean;
}

export function InlineCommentEditor({
  initialValue,
  maxLength = 1000,
  onSave,
  onCancel,
  className,
  autoFocus = true,
}: InlineCommentEditorProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialValue.trim() || saving) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className={cn('space-y-2', className)} onClick={(e) => e.stopPropagation()}>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
        onKeyDown={handleKey}
        className="min-h-[60px] text-sm bg-background/50 border-border/50"
        disabled={saving}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="text-[10px] text-muted-foreground mr-auto">
          {value.length}/{maxLength}
        </span>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 px-2">
          <X className="h-3.5 w-3.5 mr-1" />
          {t('common.cancel')}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !value.trim() || value.trim() === initialValue.trim()}
          className="h-7 px-2"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
