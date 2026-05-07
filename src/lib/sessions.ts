import { useEffect, useState, useCallback } from "react";
import { supabase } from "./auth";
import { useAuth } from "@/contexts/AuthContext";

export interface FocusSession {
  id: string;
  user_id: string;
  started_at: string; // ISO
  ended_at: string; // ISO
  duration_sec: number; // actual seconds focused
  planned_min: number;
}

const LEGACY_STORAGE_KEY = "deepwork.sessions.v1";
const EVENT = "deepwork:sessions-updated";

function readLegacy(): FocusSession[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FocusSession[];
  } catch {
    return [];
  }
}

export async function saveSession(s: Omit<FocusSession, "id">) {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({ ...s, id: crypto.randomUUID() })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving session:', error);
    // Fallback to localStorage for offline support
    const legacy = readLegacy();
    legacy.push({ ...s, id: crypto.randomUUID(), user_id: s.user_id || 'local' });
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
  }
  
  window.dispatchEvent(new Event(EVENT));
  return data;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = seconds / 3600;
  if (h >= 1) return `${h.toFixed(1)}h`;
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export function formatHours(seconds: number): string {
  if (seconds <= 0) return "0h";
  const hours = seconds / 3600;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}h`;
}

export function useSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      // Load legacy sessions when not authenticated
      const legacySessions = readLegacy();
      setSessions(legacySessions);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('ended_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        // Fallback to legacy sessions
        const legacySessions = readLegacy();
        setSessions(legacySessions);
      } else {
        setSessions(data || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      const legacySessions = readLegacy();
      setSessions(legacySessions);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const refresh = () => fetchSessions();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [fetchSessions]);

  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  let today = 0, week = 0, month = 0;
  const byDay: Record<string, number> = {};
  for (const s of sessions) {
    const t = new Date(s.ended_at).getTime();
    if (t >= todayStart) today += s.duration_sec;
    if (t >= weekStart) week += s.duration_sec;
    if (t >= monthStart) month += s.duration_sec;
    const key = startOfDay(new Date(s.ended_at)).toDateString();
    byDay[key] = (byDay[key] || 0) + s.duration_sec;
  }

  const add = useCallback((s: Omit<FocusSession, "id">) => {
    const sessionWithUser = { ...s, user_id: user?.id || 'local' };
    return saveSession(sessionWithUser);
  }, [user]);

  return {
    sessions,
    loading,
    todaySec: today,
    weekSec: week,
    monthSec: month,
    byDay,
    addSession: add,
    refetch: fetchSessions,
  };
}
