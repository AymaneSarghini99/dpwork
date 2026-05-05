import { BarChart3 } from "lucide-react";

interface StatsWidgetProps {
  today: string;
  week: string;
  month: string;
  onClick: () => void;
}

export const StatsWidget = ({ today, week, month, onClick }: StatsWidgetProps) => {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-6 right-6 glass rounded-2xl px-5 py-3.5 flex items-center gap-5 transition-all duration-500 hover:scale-[1.02] hover:bg-white/[0.07] hover:shadow-[0_0_60px_hsl(0_0%_100%_/_0.08)] animate-fade-in"
    >
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
        <BarChart3 className="w-4 h-4 text-foreground/80" />
      </div>
      <div className="flex items-center gap-5 text-left">
        <Stat label="TODAY" value={today} />
        <div className="w-px h-8 bg-white/10" />
        <Stat label="WEEK" value={week} />
        <div className="w-px h-8 bg-white/10" />
        <Stat label="MONTH" value={month} />
      </div>
    </button>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-[9px] tracking-[0.2em] text-muted-foreground font-medium">{label}</span>
    <span className="text-sm font-medium text-foreground tabular-nums">{value}</span>
  </div>
);
