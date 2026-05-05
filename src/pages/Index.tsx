import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { FlipDigit } from "@/components/FlipDigit";
import { StatsWidget } from "@/components/StatsWidget";
import { FocusCalendar } from "@/components/FocusCalendar";
import { useSessions, formatDuration } from "@/lib/sessions";
import { toast } from "sonner";

const DURATIONS = [25, 45, 60, 90, 120];

const Index = () => {
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60 * 60);
  const [running, setRunning] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const elapsedAtPauseRef = useRef<number>(0); // accumulated focused seconds while paused
  const { todaySec, weekSec, monthSec, byDay, addSession } = useSessions();

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
    });
    startedAtRef.current = null;
    elapsedAtPauseRef.current = 0;
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
        });
      }
      startedAtRef.current = null;
    }
    setRunning(false);
    setRemaining(duration * 60);
  };

  const hours = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      <h1 className="text-xs md:text-sm text-spaced text-muted-foreground font-light mb-12 animate-fade-in">
        DEEP WORK
      </h1>

      <div className="flex items-center gap-3 md:gap-5 animate-fade-in">
        <FlipDigit value={hours} />
        <Separator />
        <FlipDigit value={minutes} />
        <Separator />
        <FlipDigit value={seconds} />
      </div>

      <p className="mt-12 text-[11px] tracking-[0.4em] text-muted-foreground font-light animate-fade-in flex items-center gap-3">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            running ? "bg-foreground animate-pulse-soft" : "bg-muted-foreground/40"
          }`}
        />
        {running ? "FOCUS SESSION RUNNING" : remaining === 0 ? "SESSION COMPLETE" : "READY TO FOCUS"}
      </p>

      <div className="mt-8 flex items-center gap-1 glass rounded-full px-1.5 py-1.5 animate-fade-in">
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
          className="group glass rounded-full pl-5 pr-6 py-3 flex items-center gap-2.5 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02]"
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
        today={formatDuration(todaySec)}
        week={formatDuration(weekSec)}
        month={formatDuration(monthSec)}
        onClick={() => setCalendarOpen(true)}
      />
      <FocusCalendar open={calendarOpen} onOpenChange={setCalendarOpen} byDay={byDay} />
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
