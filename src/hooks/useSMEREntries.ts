import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';

export interface SMEREntry {
  id: string;
  user_id: string;
  situation: string;
  thoughts: string;
  emotions: { emotion: string; intensity: number }[];
  reaction?: string;
  alternative_reaction?: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export interface SMERFormData {
  situation: string;
  thoughts: string;
  emotions: { emotion: string; intensity: number }[];
  reaction?: string;
  alternative_reaction?: string;
  entry_date?: string;
}

export function useSMEREntries() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [entries, setEntries] = useState<SMEREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('smer_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      // Parse emotions from DB format "emotion:intensity" strings to objects
      const parsed = (data || []).map(entry => ({
        ...entry,
        reaction: entry.reactions ?? undefined,
        emotions: Array.isArray(entry.emotions)
          ? entry.emotions.map((e: string | { emotion: string; intensity: number }) => {
              if (typeof e === 'string' && e.includes(':')) {
                const [emotion, intensityStr] = e.split(':');
                return { emotion, intensity: parseInt(intensityStr, 10) || 0 };
              }
              if (typeof e === 'string') {
                return { emotion: e, intensity: 5 };
              }
              return e;
            })
          : typeof entry.emotions === 'string'
            ? JSON.parse(entry.emotions)
            : entry.emotions ?? []
      })) as SMEREntry[];

      setEntries(parsed);
    } catch (error) {
      console.error('Error fetching SMER entries:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const saveEntry = async (data: SMERFormData): Promise<string | boolean> => {
    if (!user) return false;

    setSaving(true);
    try {
      const entryDate = data.entry_date || new Date().toISOString().split('T')[0];
      
      // Convert emotions array to string array for DB
      const emotionsForDb = data.emotions.map(e => `${e.emotion}:${e.intensity}`);
      
      const { data: insertedData, error } = await supabase
        .from('smer_entries')
        .insert({
          user_id: user.id,
          situation: data.situation,
          thoughts: data.thoughts,
          emotions: emotionsForDb,
          reactions: data.reaction || null,
          alternative_reaction: data.alternative_reaction || null,
          entry_date: entryDate
        })
        .select('id')
        .single();

      if (error) throw error;

      // Also save to Jiva memory for context
      await supabase.from('jiva_memory_chunks').insert({
        user_id: user.id,
        source_type: 'smer',
        content: `СМЭР: ${data.situation}. Мысли: ${data.thoughts}. Эмоции: ${data.emotions.map(e => `${e.emotion}(${e.intensity})`).join(', ')}${data.alternative_reaction ? `. Альтернатива: ${data.alternative_reaction}` : ''}`,
        metadata: {
          situation: data.situation,
          thoughts: data.thoughts,
          emotions: data.emotions,
          reaction: data.reaction,
          alternative: data.alternative_reaction,
          date: entryDate
        }
      });

      toast.success(t('smer.saved'));
      await fetchEntries();
      return insertedData?.id || true;
    } catch (error) {
      console.error('Error saving SMER entry:', error);
      toast.error(t('errors.generic'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (id: string, data: Partial<SMERFormData>): Promise<boolean> => {
    if (!user) return false;

    setSaving(true);
    try {
      // Convert emotions if present
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      if (data.situation !== undefined) updateData.situation = data.situation;
      if (data.thoughts !== undefined) updateData.thoughts = data.thoughts;
      if (data.emotions !== undefined) {
        updateData.emotions = data.emotions.map(e => `${e.emotion}:${e.intensity}`);
      }
      if (data.reaction !== undefined) updateData.reactions = data.reaction;
      if (data.alternative_reaction !== undefined) updateData.alternative_reaction = data.alternative_reaction;
      if (data.entry_date !== undefined) updateData.entry_date = data.entry_date;
      
      const { error } = await supabase
        .from('smer_entries')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('smer.updated'));
      await fetchEntries();
      return true;
    } catch (error) {
      console.error('Error updating SMER entry:', error);
      toast.error(t('errors.generic'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('smer_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('smer.deleted'));
      await fetchEntries();
      return true;
    } catch (error) {
      console.error('Error deleting SMER entry:', error);
      toast.error(t('errors.generic'));
      return false;
    }
  };

  return {
    entries,
    loading,
    saving,
    saveEntry,
    updateEntry,
    deleteEntry,
    refetch: fetchEntries
  };
}
