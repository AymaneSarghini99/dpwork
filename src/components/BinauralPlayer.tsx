import { useEffect, useRef, useState } from "react";
import { Headphones } from "lucide-react";

type Preset = {
  id: string;
  label: string;
  base: number; // Hz
  beat: number; // Hz difference
  desc: string;
};

const PRESETS: Preset[] = [
  { id: "off", label: "OFF", base: 0, beat: 0, desc: "Silent" },
  { id: "alpha", label: "ALPHA", base: 200, beat: 10, desc: "Relaxed focus · 10 Hz" },
  { id: "beta", label: "BETA", base: 220, beat: 18, desc: "Active focus · 18 Hz" },
  { id: "gamma", label: "GAMMA", base: 240, beat: 40, desc: "Deep flow · 40 Hz" },
  { id: "theta", label: "THETA", base: 180, beat: 6, desc: "Creative · 6 Hz" },
];

export const BinauralPlayer = () => {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("off");
  const [volume, setVolume] = useState(0.05);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ oscL: OscillatorNode; oscR: OscillatorNode; gain: GainNode } | null>(null);

  const stop = () => {
    if (nodesRef.current) {
      try {
        nodesRef.current.oscL.stop();
        nodesRef.current.oscR.stop();
      } catch {}
      nodesRef.current = null;
    }
  };

  const play = (p: Preset) => {
    stop();
    if (p.id === "off") return;
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current!;
    if (ctx.state === "suspended") ctx.resume();

    const merger = ctx.createChannelMerger(2);
    const gain = ctx.createGain();
    gain.gain.value = volume;

    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    oscL.type = "sine";
    oscR.type = "sine";
    oscL.frequency.value = p.base;
    oscR.frequency.value = p.base + p.beat;
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);
    merger.connect(gain).connect(ctx.destination);
    oscL.start();
    oscR.start();
    nodesRef.current = { oscL, oscR, gain };
  };

  useEffect(() => {
    if (nodesRef.current) {
      nodesRef.current.gain.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => () => stop(), []);

  const active = PRESETS.find((p) => p.id === activeId)!;

  return (
    <div className="fixed bottom-6 left-6 animate-fade-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`group glass rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-500 hover:scale-[1.02] hover:bg-white/[0.07] ${
          activeId !== "off" ? "shadow-[0_0_60px_hsl(0_0%_100%_/_0.08)]" : ""
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
            activeId !== "off"
              ? "bg-white/10 border-white/20"
              : "bg-white/5 border-white/10 group-hover:bg-white/10"
          }`}
        >
          <Headphones className="w-4 h-4 text-foreground/80" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[9px] tracking-[0.2em] text-muted-foreground font-medium">
            BINAURAL
          </span>
          <span className="text-sm font-medium text-foreground">{active.label}</span>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+0.75rem)] left-0 w-72 glass rounded-2xl p-4 bg-black/80 backdrop-blur-2xl border border-white/10 animate-scale-in origin-bottom-left">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-3">
            FOCUS BEATS
          </div>
          <div className="flex flex-col gap-1 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveId(p.id);
                  play(p);
                }}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                  activeId === p.id
                    ? "bg-white/10"
                    : "hover:bg-white/[0.05]"
                }`}
              >
                <span className="text-xs font-medium tracking-[0.2em]">{p.label}</span>
                <span className="text-[10px] text-muted-foreground">{p.desc}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-white/5 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground">VOLUME</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.round(volume * 200)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.005}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-white"
            />
            <p className="mt-3 text-[10px] text-muted-foreground/70 leading-relaxed">
              Use headphones for the binaural effect.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};