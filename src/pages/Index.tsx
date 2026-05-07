import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, RotateCcw, LogOut } from "lucide-react";
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

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60 * 60);
  const [running, setRunning] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualHours, setManualHours] = useState("1");
  const [manualMinutes, setManualMinutes] = useState("0");
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const elapsedAtPauseRef = useRef<number>(0); // accumulated focused seconds while paused
  const { todaySec, weekSec, monthSec, byDay, addSession } = useSessions();

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

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // session complete
          completeSession(duration * 60);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const completeSession = (focusedSec: number) => {
    setRunning(false);
    const startedAt = startedAtRef.current ?? new Date(Date.now() - focusedSec * 1000);
    addSession({
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      durationSec: focusedSec,
      plannedMin: duration,
      user_id: user?.id || 'local'
    });
    startedAtRef.current = null;
    elapsedAtPauseRef.current = 0;
    playCompletionSound();
    toast.success("Session complete", {
      description: `${formatDuration(focusedSec)} of deep work logged.`,
    });
  };

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
          startedAt: startedAtRef.current.toISOString(),
          endedAt: new Date().toISOString(),
          durationSec: focused,
          plannedMin: duration,
          user_id: user?.id || 'local'
        });
      }
      startedAtRef.current = null;
    }
    setDuration(m);
    setRemaining(m * 60);
    setRunning(false);
  };

  const reset = () => {
    if (startedAtRef.current) {
      const focused = duration * 60 - remaining;
      if (focused >= 60) {
        addSession({
          startedAt: startedAtRef.current.toISOString(),
          endedAt: new Date().toISOString(),
          durationSec: focused,
          plannedMin: duration,
          user_id: user?.id || 'local'
        });
      }
      startedAtRef.current = null;
    }
    setRunning(false);
    setRemaining(duration * 60);
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
      <BinauralPlayer />
      <TaskWidget />
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
