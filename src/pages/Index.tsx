import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { FlipDigit } from "@/components/FlipDigit";
import { StatsWidget } from "@/components/StatsWidget";
import { FocusCalendar } from "@/components/FocusCalendar";

const DURATIONS = [25, 45, 60, 90, 120];

const Index = () => {
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60 * 60);
  const [running, setRunning] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const setDur = (m: number) => {
    setDuration(m);
    setRemaining(m * 60);
    setRunning(false);
  };

  const reset = () => {
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
          onClick={() => setRunning((r) => !r)}
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

      <StatsWidget today="0m" week="5.3h" month="7.0h" onClick={() => setCalendarOpen(true)} />
      <FocusCalendar open={calendarOpen} onOpenChange={setCalendarOpen} />
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
