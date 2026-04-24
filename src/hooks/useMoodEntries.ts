import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, differenceInDays, parseISO } from "date-fns";

export type MoodType = 'joy' | 'calm' | 'neutral' | 'anxiety' | 'sadness' | 'anger' | 'fatigue' | 'fear';

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: MoodType;
  note: string | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export interface MoodStats {
  weeklyCount: number;
  streak: number;
  averageMood: MoodType | null;
}

const MOOD_SCORES: Record<MoodType, number> = {
  joy: 5,
  calm: 4,
  neutral: 3,
  anxiety: 2,
  sadness: 2,
  anger: 1,
  fatigue: 3,
  fear: 1
};

const SCORE_TO_MOOD: Record<number, MoodType> = {
  5: 'joy',
  4: 'calm',
  3: 'fatigue',
  2: 'anxiety',
  1: 'anger'
};

export function useMoodEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MoodStats>({ weeklyCount: 0, streak: 0, averageMood: null });

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch all entries - unlimited history for all users
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []) as MoodEntry[];
      setEntries(typedData);
      calculateStats(typedData);
    } catch (err) {
      console.error('Error fetching mood entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const calculateStats = (data: MoodEntry[]) => {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    
    // Weekly count
    const weeklyEntries = data.filter(e => {
      const entryDate = parseISO(e.entry_date);
      return entryDate >= weekAgo;
    });
    const weeklyCount = weeklyEntries.length;

    // Calculate streak
    let streak = 0;
    const sortedDates = data.map(e => e.entry_date).sort((a, b) => b.localeCompare(a));
    
    if (sortedDates.length > 0) {
      const todayStr = format(today, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
      
      // Start counting if today or yesterday has entry
      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = parseISO(sortedDates[i - 1]);
          const currDate = parseISO(sortedDates[i]);
          if (differenceInDays(prevDate, currDate) === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Average mood
    let averageMood: MoodType | null = null;
    if (weeklyEntries.length > 0) {
      const avgScore = weeklyEntries.reduce((sum, e) => sum + MOOD_SCORES[e.mood], 0) / weeklyEntries.length;
      const roundedScore = Math.round(avgScore);
      averageMood = SCORE_TO_MOOD[roundedScore] || 'calm';
    }

    setStats({ weeklyCount, streak, averageMood });
  };

  const saveEntry = async (mood: MoodType, note: string, date: Date): Promise<boolean> => {
    if (!user) return false;

    const entryDate = format(date, 'yyyy-MM-dd');
    
    try {
      // Check if entry exists for this date
      const { data: existing } = await supabase
        .from('mood_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', entryDate)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('mood_entries')
          .update({ mood, note: note || null, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('mood_entries')
          .insert({ user_id: user.id, mood, note: note || null, entry_date: entryDate });
        
        if (error) throw error;
      }

      await fetchEntries();
      return true;
    } catch (err) {
      console.error('Error saving mood entry:', err);
      return false;
    }
  };

  const getEntryForDate = useCallback((date: Date): MoodEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.find(e => e.entry_date === dateStr);
  }, [entries]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    stats,
    saveEntry,
    getEntryForDate,
    refetch: fetchEntries,
  };
}
