import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Headphones, Link2, Music2, Square } from "lucide-react";
import { toast } from "sonner";

type Preset = {
  id: string;
  label: string;
  base: number; // Hz
  beat: number; // Hz difference
  desc: string;
};

const PRESETS: Preset[] = [
  { id: "off", label: "OFF", base: 0, beat: 0, desc: "Silent" },
  { id: "theta", label: "THETA", base: 200, beat: 6, desc: "6 Hz · relaxed creativity" },
  { id: "alpha", label: "ALPHA", base: 200, beat: 10, desc: "10 Hz · calm focus" },
  { id: "beta", label: "BETA", base: 220, beat: 18, desc: "18 Hz · alert focus" },
  { id: "gamma", label: "GAMMA", base: 240, beat: 40, desc: "40 Hz · high concentration" },
];

export const BinauralPlayer = () => {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("off");
  const [volume, setVolume] = useState(0.05);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.35);
  const [musicSource, setMusicSource] = useState<{
    kind: "audio" | "youtube";
    title: string;
    url: string;
    embedUrl?: string;
  } | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ oscL: OscillatorNode; oscR: OscillatorNode; gain: GainNode } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    if (nodesRef.current) {
      try {
        nodesRef.current.oscL.stop();
        nodesRef.current.oscR.stop();
      } catch {
        return;
      }
      nodesRef.current = null;
    }
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setMusicSource(null);
  };

  const parseYouTubeId = (value: string) => {
    try {
      const url = new URL(value);
      if (url.hostname.includes("youtube.com")) {
        return url.searchParams.get("v");
      }
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.split("/").filter(Boolean)[0] ?? null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const loadMusic = async () => {
    const raw = musicUrl.trim();
    if (!raw) {
      toast.error("Paste an audio or YouTube link first.");
      return;
    }

    const youtubeId = parseYouTubeId(raw);
    if (youtubeId) {
      stopMusic();
      setMusicSource({
        kind: "youtube",
        title: `YouTube video ${youtubeId}`,
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      });
      return;
    }

    try {
      stopMusic();
      const audio = new Audio(raw);
      audio.loop = true;
      audio.volume = musicVolume;
      audioRef.current = audio;
      await audio.play();
      let title = raw;
      try {
        title = new URL(raw, window.location.href).hostname.replace(/^www\./, "");
      } catch {
        title = raw.replace(/^.*\//, "");
      }
      setMusicSource({
        kind: "audio",
        title,
        url: raw,
      });
    } catch {
      stopMusic();
      toast.error("That link could not be played. Use a direct audio file or a real YouTube watch link.");
    }
  };

  const play = (p: Preset) => {
    stop();
    if (p.id === "off") return;
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  useEffect(
    () => () => {
      stop();
      stopMusic();
    },
    [],
  );

  const active = useMemo(() => PRESETS.find((p) => p.id === activeId) ?? PRESETS[0], [activeId]);

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto animate-fade-in z-30">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`group glass w-full md:w-auto rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-500 hover:scale-[1.01] hover:bg-white/[0.07] ${
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
        <div className="absolute bottom-[calc(100%+0.75rem)] left-0 w-full md:w-72 glass rounded-2xl p-4 bg-black/80 backdrop-blur-2xl border border-white/10 animate-scale-in origin-bottom-left">
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

          <div className="mt-4 border-t border-white/5 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground">MUSIC</span>
              {musicSource ? (
                <button
                  onClick={stopMusic}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Square className="w-3 h-3" />
                  STOP
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  placeholder="Paste audio file or YouTube link"
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-9 pr-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-white/20"
                />
              </div>
              <button
                onClick={loadMusic}
                className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-white text-black px-3 py-2 text-[10px] font-medium tracking-[0.2em] transition-colors hover:bg-white/90"
              >
                <Music2 className="w-3.5 h-3.5" />
                LOAD
              </button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground/70 leading-relaxed">
              Direct audio files play in-app. Real YouTube watch links open as an embedded player.
            </p>

            {musicSource?.kind === "youtube" && (
              <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/50">
                <iframe
                  className="aspect-video w-full"
                  src={`${musicSource.embedUrl}?rel=0&modestbranding=1`}
                  title={musicSource.title}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground border-t border-white/10">
                  <span className="truncate">{musicSource.title}</span>
                  <a
                    href={musicSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    OPEN
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {musicSource?.kind === "audio" && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between gap-3">
                <span className="truncate">Playing: {musicSource.title}</span>
                <span className="shrink-0">Audio</span>
              </div>
            )}

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-[0.3em] text-muted-foreground">MUSIC VOLUME</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full accent-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
