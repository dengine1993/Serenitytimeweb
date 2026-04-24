import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CrisisIntensity = "high" | "medium" | "low";
export type CrisisOutcome = "better" | "same" | "worse";
export type CrisisTechnique = "grounding" | "breathing" | "hotline";

export interface CrisisSession {
  id: string;
  user_id: string;
  intensity: CrisisIntensity | null;
  techniques_used: CrisisTechnique[] | null;
  outcome: CrisisOutcome | null;
  notes: string | null;
  created_at: string;
}

export interface CrisisStats {
  total: number;
  betterCount: number;
}

export function useCrisisSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CrisisSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("crisis_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSessions((data || []) as CrisisSession[]);
    } catch (err) {
      console.error("Error fetching crisis sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteSession = async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("crisis_sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      console.error("Error deleting crisis session:", err);
      return false;
    }
  };

  const stats: CrisisStats = (() => {
    const total = sessions.length;
    const betterCount = sessions.filter((s) => s.outcome === "better").length;
    return { total, betterCount };
  })();

  const hasSessionOnDate = useCallback(
    (dateStr: string): boolean => {
      return sessions.some((s) => s.created_at.startsWith(dateStr));
    },
    [sessions]
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    stats,
    deleteSession,
    hasSessionOnDate,
    refetch: fetchSessions,
  };
}
