import { useEffect, useRef, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import type { TrainingProgram } from '@/data/programA';
import { useTrainingCycle } from '@/hooks/useTrainingCycle';
import type { ProgramOverride } from '@/lib/trainingCycle';
import { toast } from 'sonner';

export const TrainingCycleWidget = () => {
  const { ready, cycleInfo, activeProgram, programOverride, saveProgramMode } =
    useTrainingCycle();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const mode = programOverride ?? 'auto';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const selectMode = async (override: ProgramOverride) => {
    try {
      await saveProgramMode(override);
      setOpen(false);
      toast.success(
        override ? `Program ${override}` : 'Auto · 3-week cycle'
      );
    } catch {
      toast.error('Could not save program');
    }
  };

  if (!ready) return null;

  return (
    <div ref={rootRef} className="fixed bottom-6 right-6 z-40 animate-fade-in">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-white/[0.08] transition-colors shadow-lg border border-white/10"
        aria-label={`Training program ${activeProgram}, ${cycleInfo.label}`}
        title={cycleInfo.label}
      >
        <Dumbbell className="w-5 h-5 text-foreground" />
        <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center leading-none">
          {activeProgram}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-[min(220px,calc(100vw-3rem))] glass rounded-2xl border border-white/10 p-3 shadow-xl animate-fade-in">
          <p className="text-[9px] tracking-[0.25em] text-muted-foreground uppercase mb-1">
            Training
          </p>
          <p className="text-sm font-medium text-foreground mb-2">
            {cycleInfo.label}
          </p>

          <div className="flex rounded-lg bg-black/25 p-0.5 border border-white/5 mb-2">
            {(
              [
                { value: 'auto' as const, label: 'Auto' },
                { value: 'A' as const, label: 'A' },
                { value: 'B' as const, label: 'B' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => void selectMode(value === 'auto' ? null : value)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                  mode === value
                    ? 'bg-white/15 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground mb-2 leading-snug">
            {activeProgram === 'A'
              ? 'Hypertrophy · runs · swim'
              : 'CrossFit · longevity'}
          </p>

        </div>
      )}
    </div>
  );
};
