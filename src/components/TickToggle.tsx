import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface TickToggleProps {
  running: boolean;
  remaining: number;
}

export const TickToggle = ({ running, remaining }: TickToggleProps) => {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const noiseBufRef = useRef<AudioBuffer | null>(null);
  const altRef = useRef(false);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctx();
      // pre-build short noise buffer for the mechanical "click" body
      const ctx = ctxRef.current;
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        // exponentially decaying white noise = pluck/click
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
      }
      noiseBufRef.current = buf;
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const playVintageTick = () => {
    try {
      const ctx = ensureCtx();
      const t = ctx.currentTime;
      const isTick = !altRef.current; // alternate tick / tock
      altRef.current = !altRef.current;

      // master gain — very low
      const master = ctx.createGain();
      master.gain.value = 0.18;

      // band-pass filter to give it that wooden/metal vintage character
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = isTick ? 2200 : 1700;
      bp.Q.value = 6;

      // noise burst (the mechanical click body)
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBufRef.current!;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      noise.connect(noiseGain).connect(bp);

      // low resonant thunk (escapement body)
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = isTick ? 480 : 360;
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(0.12, t + 0.002);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(oscGain).connect(bp);

      bp.connect(master).connect(ctx.destination);

      noise.start(t);
      noise.stop(t + 0.06);
      osc.start(t);
      osc.stop(t + 0.07);
    } catch {
      return;
    }
  };

  // play tick whenever remaining changes while running
  useEffect(() => {
    if (!enabled || !running) return;
    if (remaining <= 0) return;
    playVintageTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running, enabled]);

  return (
    <button
      onClick={() => {
        setEnabled((e) => !e);
        ensureCtx();
      }}
      className={`glass rounded-full px-4 py-2 flex items-center gap-2 text-[10px] tracking-[0.3em] transition-all duration-300 hover:bg-white/[0.08] ${
        enabled ? "text-foreground" : "text-muted-foreground"
      }`}
      aria-label="Toggle ticking sound"
      title={enabled ? "Vintage ticking on" : "Vintage ticking off"}
    >
      {enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      <span>{enabled ? "TICK ON" : "TICK OFF"}</span>
    </button>
  );
};
