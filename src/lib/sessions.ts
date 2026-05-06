import { useEffect, useState, useCallback } from "react";

export interface FocusSession {
  id: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  durationSec: number; // actual seconds focused
  plannedMin: number;
}

const STORAGE_KEY = "deepwork.sessions.v1";
const EVENT = "deepwork:sessions-updated";

function read(): FocusSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FocusSession[];
  } catch {
    return [];
  }
}

function write(sessions: FocusSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event(EVENT));
}

export function saveSession(s: Omit<FocusSession, "id">) {
  const all = read();
  all.push({ ...s, id: crypto.randomUUID() });
  write(all);
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
  const [sessions, setSessions] = useState<FocusSession[]>(() => read());

  useEffect(() => {
    const refresh = () => setSessions(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  let today = 0, week = 0, month = 0;
  const byDay: Record<string, number> = {};
  for (const s of sessions) {
    const t = new Date(s.endedAt).getTime();
    if (t >= todayStart) today += s.durationSec;
    if (t >= weekStart) week += s.durationSec;
    if (t >= monthStart) month += s.durationSec;
    const key = startOfDay(new Date(s.endedAt)).toDateString();
    byDay[key] = (byDay[key] || 0) + s.durationSec;
  }

  const add = useCallback((s: Omit<FocusSession, "id">) => saveSession(s), []);

  return {
    sessions,
    todaySec: today,
    weekSec: week,
    monthSec: month,
    byDay,
    addSession: add,
  };
}
