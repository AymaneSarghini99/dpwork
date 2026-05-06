import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDuration } from "@/lib/sessions";

interface FocusCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  byDay: Record<string, number>; // date.toDateString() -> seconds
}

export const FocusCalendar = ({ open, onOpenChange, byDay }: FocusCalendarProps) => {
  const [cursor, setCursor] = useState(new Date());

  const { days, monthLabel } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return {
      days: cells,
      monthLabel: cursor.toLocaleString("en-US", { month: "long", year: "numeric" }),
    };
  }, [cursor]);

  const today = new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 bg-black/80 backdrop-blur-2xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xs tracking-[0.4em] text-muted-foreground font-normal text-center">
            FOCUS HISTORY
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mt-2 mb-6">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium tracking-wide">{monthLabel}</span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-[10px] tracking-[0.2em] text-muted-foreground text-center py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square" />;
            const seconds = byDay[day.toDateString()] || 0;
            const hours = seconds / 3600;
            const isToday = day.toDateString() === today.toDateString();
            const intensity = Math.min(hours / 6, 1);
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer border ${
                  isToday ? "border-white/40" : "border-white/5"
                }`}
                style={{
                  background: hours
                    ? `hsl(0 0% 100% / ${0.05 + intensity * 0.18})`
                    : "hsl(0 0% 100% / 0.02)",
                }}
                title={seconds ? `${formatDuration(seconds)} focused` : "No session"}
              >
                <span className="text-xs font-medium text-foreground/90">{day.getDate()}</span>
                {seconds > 0 && (
                  <span className="text-[8px] text-muted-foreground tabular-nums mt-0.5">
                    {formatDuration(seconds)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-[10px] tracking-[0.2em] text-muted-foreground">
          <span>LESS</span>
          <div className="flex gap-1">
            {[0.05, 0.1, 0.15, 0.2, 0.25].map((o, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm border border-white/5"
                style={{ background: `hsl(0 0% 100% / ${o})` }}
              />
            ))}
          </div>
          <span>MORE</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
