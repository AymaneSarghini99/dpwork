import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, RotateCcw, LogOut, BarChart3 } from "lucide-react";
import { FlipDigit } from "@/components/FlipDigit";
import { StatsWidget } from "@/components/StatsWidget";
import { FocusCalendar } from "@/components/FocusCalendar";
import { BinauralPlayer } from "@/components/BinauralPlayer";
import TaskWidget from "@/components/TaskWidget";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { playCompletionSound } from "@/lib/sound";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSessions, formatDuration, formatHours } from "@/lib/sessions";
import { toast } from "sonner";

const DURATIONS = [25, 45, 60, 90, 120];
const TIMER_STORAGE_KEY = "deepwork_timer_state";

type TimerStorageState = {
  duration?: unknown;
  remaining?: unknown;
  running?: unknown;
  startedAt?: unknown;
  elapsedAtPause?: unknown;
  timestamp?: unknown;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const clearTimerStorage = () => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing timer state:", error);
  }
};

const normalizeTimerState = (raw: TimerStorageState) => {
  const duration = toFiniteNumber(raw.duration);
  const remaining = toFiniteNumber(raw.remaining);
  const elapsedAtPause = toFiniteNumber(raw.elapsedAtPause) ?? 0;
  const startedAt = typeof raw.startedAt === "string" && raw.startedAt ? raw.startedAt : null;
  const running = Boolean(raw.running);

  if (duration === null || remaining === null) {
    return null;
  }

  return {
    duration,
    remaining,
    elapsedAtPause,
    startedAt,
    running,
  };
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60 * 60);
  const [running, setRunning] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualHours, setManualHours] = useState("1");
  const [manualMinutes, setManualMinutes] = useState("0");
  const animationFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const elapsedAtPauseRef = useRef<number>(0); // accumulated focused seconds while paused
  const lastUpdateTimeRef = useRef<number>(0);
  const isMasterInstanceRef = useRef<boolean>(true); // Track if this is the master instance
  const durationRef = useRef(duration);
  
  // Keep durationRef in sync with duration state
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  
  const { todaySec, weekSec, monthSec, byDay, addSession } = useSessions();

  const completeSession = useCallback((focusedSec: number) => {
    setRunning(false);
    const startedAt = startedAtRef.current ?? new Date(Date.now() - focusedSec * 1000);
    addSession({
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      duration_sec: focusedSec,
      planned_min: durationRef.current,
      user_id: user?.id || 'local'
    });
    startedAtRef.current = null;
    elapsedAtPauseRef.current = 0;
    playCompletionSound();
    toast.success("Session complete", {
      description: `${formatDuration(focusedSec)} of deep work logged.`,
    });
    
    // Clear timer state from localStorage when completed
    clearTimerStorage();
  }, [addSession, user?.id]);

  // Load timer state once on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as TimerStorageState;
      const state = normalizeTimerState(parsed);
      if (!state) {
        clearTimerStorage();
        return;
      }
      const now = Date.now();

      if (state.running && state.startedAt) {
        const startedAtMs = new Date(state.startedAt).getTime();
        if (!Number.isFinite(startedAtMs)) {
          clearTimerStorage();
          return;
        }

        const elapsedSeconds = Math.floor((now - startedAtMs) / 1000);
        const nextRemaining = Math.max(0, state.duration * 60 - elapsedSeconds);

        setDuration(state.duration);
        setRemaining(nextRemaining);
        startedAtRef.current = new Date(startedAtMs);
        elapsedAtPauseRef.current = state.elapsedAtPause;

        if (nextRemaining > 0) {
          setRunning(true);
        } else {
          completeSession(state.duration * 60);
        }
      } else {
        setDuration(state.duration);
        setRemaining(state.remaining);
        setRunning(state.running);
        startedAtRef.current = state.startedAt ? new Date(state.startedAt) : null;
        elapsedAtPauseRef.current = state.elapsedAtPause;
      }
    } catch (error) {
      console.error("Error loading timer state:", error);
      clearTimerStorage();
    }
  }, [completeSession]);

  // Persist timer state whenever it changes.
  useEffect(() => {
    try {
      const state = {
        duration,
        remaining,
        running,
        startedAt: startedAtRef.current?.toISOString(),
        elapsedAtPause: elapsedAtPauseRef.current,
        timestamp: Date.now(),
      };
      if (!Number.isFinite(state.duration) || !Number.isFinite(state.remaining)) {
        return;
      }
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  }, [duration, remaining, running]);

  // Listen for storage events from other browser instances.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== TIMER_STORAGE_KEY || !e.newValue) return;

      try {
        const parsed = JSON.parse(e.newValue) as TimerStorageState;
        const state = normalizeTimerState(parsed);
        if (!state) {
          clearTimerStorage();
          return;
        }
        const now = Date.now();

        setDuration(state.duration);
        setRemaining(state.remaining);
        setRunning(state.running);
        startedAtRef.current = state.startedAt ? new Date(state.startedAt) : null;
        elapsedAtPauseRef.current = state.elapsedAtPause;

        if (state.running && state.startedAt) {
          const startedAtMs = new Date(state.startedAt).getTime();
          if (!Number.isFinite(startedAtMs)) {
            clearTimerStorage();
            return;
          }

          const elapsedSeconds = Math.floor((now - startedAtMs) / 1000);
          const calculatedRemaining = Math.max(0, state.duration * 60 - elapsedSeconds);
          setRemaining(calculatedRemaining);

          if (calculatedRemaining === 0) {
            completeSession(state.duration * 60);
          }
        }
      } catch (error) {
        console.error("Error handling storage change:", error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [completeSession]);

  // Handle OAuth parameters if user lands directly on main page
  useEffect(() => {
    const handleOAuthParams = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasAuthParams = hashParams.has('access_token') || hashParams.has('refresh_token');
      
      if (hasAuthParams && !user) {
        // Redirect to auth callback to handle OAuth parameters
        navigate('/auth/callback', { replace: true });
      }
    };

    handleOAuthParams();
  }, [user, navigate]);

  // Tick with requestAnimationFrame for accurate timing across tabs
  useEffect(() => {
    if (!running) {
      lastUpdateTimeRef.current = 0;
      return;
    }

    const animate = (timestamp: number) => {
      if (lastUpdateTimeRef.current === 0) {
        lastUpdateTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateTimeRef.current;
      
      // Update every second (1000ms)
      if (elapsed >= 1000) {
        const secondsPassed = Math.floor(elapsed / 1000);
        lastUpdateTimeRef.current += secondsPassed * 1000;
        
        setRemaining((r) => {
          if (r <= secondsPassed) {
            // session complete
            completeSession(durationRef.current * 60);
            return 0;
          }
          return r - secondsPassed;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  
  const handleToggle = () => {
    if (running) {
      // pausing — accumulate focused time
      elapsedAtPauseRef.current += (duration * 60 - remaining) - elapsedAtPauseRef.current;
      setRunning(false);
      return;
    }
    // starting or resuming
    if (!startedAtRef.current) startedAtRef.current = new Date();
    setRunning(true);
  };

  const setDur = (m: number) => {
    // if a session is in progress, log partial focus before switching
    if (startedAtRef.current) {
      const focused = duration * 60 - remaining;
      if (focused >= 60) {
        addSession({
          started_at: startedAtRef.current.toISOString(),
          ended_at: new Date().toISOString(),
          duration_sec: focused,
          planned_min: duration,
          user_id: user?.id || 'local'
        });
      }
      startedAtRef.current = null;
    }
    setDuration(m);
    setRemaining(m * 60);
    setRunning(false);
    elapsedAtPauseRef.current = 0;
  };

  const reset = () => {
    if (startedAtRef.current) {
      const focused = duration * 60 - remaining;
      if (focused >= 60) {
        addSession({
          started_at: startedAtRef.current.toISOString(),
          ended_at: new Date().toISOString(),
          duration_sec: focused,
          planned_min: duration,
          user_id: user?.id || 'local'
        });
      }
      startedAtRef.current = null;
    }
    setRunning(false);
    setRemaining(duration * 60);
    elapsedAtPauseRef.current = 0;
  };

  const openManual = () => {
    const totalMinutes = duration;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setManualHours(String(hours));
    setManualMinutes(String(minutes));
    setManualOpen(true);
  };

  const applyManual = () => {
    const hours = Number.parseInt(manualHours, 10);
    const minutes = Number.parseInt(manualMinutes, 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      toast.error("Enter a valid time.");
      return;
    }

    const totalMinutes = Math.max(1, hours * 60 + minutes);
    setDur(totalMinutes);
    setManualOpen(false);
    toast.success("Timer updated", {
      description: `${totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`} set manually.`,
    });
  };

  const hours = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-start md:justify-center px-4 sm:px-6 pt-12 md:pt-0 pb-40 md:pb-6 overflow-hidden">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      <h1 className="text-xs md:text-sm text-spaced text-muted-foreground font-light mb-12 animate-fade-in flex items-center justify-center w-full max-w-2xl">
        <span>DEEP WORK</span>
      </h1>

      <button
        type="button"
        onDoubleClick={openManual}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openManual();
          }
        }}
        className="group flex items-center gap-2 sm:gap-3 md:gap-5 animate-fade-in outline-none"
        aria-label="Double click to set timer manually"
        title="Double click to set timer manually"
      >
        <FlipDigit value={hours} />
        <Separator />
        <FlipDigit value={minutes} />
        <Separator />
        <FlipDigit value={seconds} />
      </button>

      <p className="mt-10 md:mt-12 text-[10px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.4em] text-muted-foreground font-light animate-fade-in flex items-center gap-3 text-center px-2">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            running ? "bg-foreground animate-pulse-soft" : "bg-muted-foreground/40"
          }`}
        />
        {running ? "FOCUS SESSION RUNNING" : remaining === 0 ? "SESSION COMPLETE" : "READY TO FOCUS"}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-1 glass rounded-full px-1.5 py-1.5 animate-fade-in max-w-[min(100%,26rem)]">
        {DURATIONS.map((m) => (
          <button
            key={m}
            onClick={() => setDur(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium tabular-nums transition-all duration-300 ${
              duration === m
                ? "bg-white text-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 animate-fade-in">
        <button
          onClick={handleToggle}
          className="group glass rounded-full pl-5 pr-6 py-3 flex items-center gap-2.5 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02] min-w-[9rem] justify-center"
        >
          {running ? (
            <Pause className="w-4 h-4 fill-foreground text-foreground" />
          ) : (
            <Play className="w-4 h-4 fill-foreground text-foreground" />
          )}
          <span className="text-xs tracking-[0.3em] font-medium">
            {running ? "PAUSE" : "START"}
          </span>
        </button>
        <button
          onClick={reset}
          className="w-11 h-11 glass rounded-full flex items-center justify-center hover:bg-white/[0.08] transition-all duration-300"
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <StatsWidget
        today={formatHours(todaySec)}
        week={formatHours(weekSec)}
        month={formatHours(monthSec)}
        onClick={() => setCalendarOpen(true)}
      />
      <FocusCalendar open={calendarOpen} onOpenChange={setCalendarOpen} byDay={byDay} />
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="glass border-white/10 bg-black/80 backdrop-blur-2xl text-foreground">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-[10px] tracking-[0.45em] text-muted-foreground font-medium uppercase">
              SET TIMER
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground/80">
              Choose a custom focus length in hours and minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">Hours</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                max={12}
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                className="h-11 rounded-full border-white/10 bg-white/[0.04] text-center text-base text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus-visible:border-white/20 focus-visible:ring-0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">Minutes</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                max={59}
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                className="h-11 rounded-full border-white/10 bg-white/[0.04] text-center text-base text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus-visible:border-white/20 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setManualHours(String(Math.floor(m / 60)));
                  setManualMinutes(String(m % 60));
                }}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] tracking-[0.3em] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
              >
                {m}m
              </button>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setManualOpen(false)}
              className="rounded-full border border-white/10 px-4 py-2 text-[10px] tracking-[0.3em] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={applyManual}
              className="rounded-full bg-white px-4 py-2 text-[10px] font-medium tracking-[0.3em] text-black transition-colors hover:bg-white/90"
            >
              APPLY
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Mobile Stats Icon - Top Right */}
      <div className="lg:hidden fixed top-6 right-6 z-40">
        <button
          onClick={() => setMobileStatsOpen(true)}
          className="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-white/[0.08] transition-colors shadow-lg"
        >
          <BarChart3 className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Mobile Stats Dialog */}
      <Dialog open={mobileStatsOpen} onOpenChange={setMobileStatsOpen}>
        <DialogContent className="glass border-white/10 bg-black/80 backdrop-blur-2xl text-foreground max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-xs tracking-[0.35em] text-muted-foreground uppercase font-medium text-center">
              Focus Statistics
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-xs tracking-[0.2em] text-muted-foreground font-medium mb-1">TODAY</div>
                <div className="text-sm font-medium text-foreground tabular-nums">{formatHours(todaySec)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs tracking-[0.2em] text-muted-foreground font-medium mb-1">WEEK</div>
                <div className="text-sm font-medium text-foreground tabular-nums">{formatHours(weekSec)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs tracking-[0.2em] text-muted-foreground font-medium mb-1">MONTH</div>
                <div className="text-sm font-medium text-foreground tabular-nums">{formatHours(monthSec)}</div>
              </div>
            </div>

            {/* Calendar Button */}
            <button
              onClick={() => {
                setMobileStatsOpen(false);
                setCalendarOpen(true);
              }}
              className="w-full rounded-lg border border-white/10 px-3 py-2 text-[10px] tracking-[0.3em] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              View Calendar
            </button>

            {/* Personal Button */}
            <button
              onClick={() => {
                setMobileStatsOpen(false);
                navigate('/personal');
              }}
              className="w-full rounded-lg border border-white/10 px-3 py-2 text-[10px] tracking-[0.3em] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              Personal
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="flex-1">
          <BinauralPlayer />
        </div>
        <div className="lg:flex-shrink-0">
          <TaskWidget />
        </div>
      </div>
    </main>
  );
};

const Separator = () => (
  <div className="flex flex-col gap-3">
    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
  </div>
);

export default Index;
