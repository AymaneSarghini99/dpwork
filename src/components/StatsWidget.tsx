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
      className="group fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 glass rounded-2xl px-4 md:px-5 py-3.5 flex items-center gap-4 md:gap-5 transition-all duration-500 hover:scale-[1.01] hover:bg-white/[0.07] hover:shadow-[0_0_60px_hsl(0_0%_100%_/_0.08)] animate-fade-in"
    >
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
        <BarChart3 className="w-4 h-4 text-foreground/80" />
      </div>
      <div className="flex items-center justify-between md:justify-start flex-1 gap-3 md:gap-5 text-left">
        <Stat label="TODAY" value={today} />
        <div className="hidden md:block w-px h-8 bg-white/10" />
        <Stat className="hidden md:flex" label="WEEK" value={week} />
        <div className="hidden md:block w-px h-8 bg-white/10" />
        <Stat className="hidden md:flex" label="MONTH" value={month} />
      </div>
    </button>
  );
};

const Stat = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className={`flex flex-col ${className ?? ""}`}>
    <span className="text-[9px] tracking-[0.2em] text-muted-foreground font-medium">{label}</span>
    <span className="text-sm font-medium text-foreground tabular-nums">{value}</span>
  </div>
);
