import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Headphones, Link2, Music2, Square } from "lucide-react";
import { toast } from "sonner";
import { PlaylistWidget } from "@/components/PlaylistWidget";

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => {
        destroy: () => void;
        setVolume: (volume: number) => void;
        playVideo: () => void;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

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
  const [musicPos, setMusicPos] = useState({ x: 16, y: 16 });
  const [musicWidgetVisible, setMusicWidgetVisible] = useState(true);
  const [musicSource, setMusicSource] = useState<{
    kind: "audio" | "youtube";
    title: string;
    url: string;
    videoId?: string;
    embedUrl?: string;
  } | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ oscL: OscillatorNode; oscR: OscillatorNode; gain: GainNode } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubePlayerRef = useRef<ReturnType<Window["YT"] extends { Player: infer P } ? P : never> | null>(null);
  const youtubeApiPromiseRef = useRef<Promise<void> | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dragging: boolean; offsetX: number; offsetY: number } | null>(null);
  const musicCardRef = useRef<HTMLDivElement | null>(null);
  const originalMusicPosRef = useRef({ x: 16, y: 16 });
  const volumeRef = useRef(volume);
  const openTimeoutRef = useRef<number | null>(null);

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
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.destroy();
      youtubePlayerRef.current = null;
    }
    setMusicSource(null);
    setMusicWidgetVisible(true);
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
        videoId: youtubeId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      });
      setMusicWidgetVisible(true);
      setMusicPos(originalMusicPosRef.current);
      return;
    }

    try {
      stopMusic();
      const audio = new Audio(raw);
      audio.loop = true;
      audio.volume = volume;
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
      setMusicWidgetVisible(true);
      setMusicPos(originalMusicPosRef.current);
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
    volumeRef.current = volume;
    if (nodesRef.current) {
      nodesRef.current.gain.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(Math.round(volume * 100));
    }
  }, [volume]);

  useEffect(
    () => () => {
      stop();
      stopMusic();
      if (openTimeoutRef.current !== null) {
        window.clearTimeout(openTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const scheduleClose = () => {
      if (openTimeoutRef.current !== null) {
        window.clearTimeout(openTimeoutRef.current);
      }
      openTimeoutRef.current = window.setTimeout(() => {
        setOpen(false);
        openTimeoutRef.current = null;
      }, 8000);
    };

    scheduleClose();
    return () => {
      if (openTimeoutRef.current !== null) {
        window.clearTimeout(openTimeoutRef.current);
      }
      openTimeoutRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!musicSource?.kind) return;
    const clampPosition = () => {
      const width = musicCardRef.current?.offsetWidth ?? 360;
      const height = musicCardRef.current?.offsetHeight ?? 360;
      const maxX = Math.max(16, window.innerWidth - width - 16);
      const maxY = Math.max(16, window.innerHeight - height - 16);
      setMusicPos((p) => ({
        x: Math.min(Math.max(16, p.x), maxX),
        y: Math.min(Math.max(16, p.y), maxY),
      }));
    };
    clampPosition();
    window.addEventListener("resize", clampPosition);
    return () => window.removeEventListener("resize", clampPosition);
  }, [musicSource?.kind]);

  useEffect(() => {
    if (musicSource?.kind !== "youtube" || !musicSource.videoId || !youtubeContainerRef.current) return;

    let cancelled = false;

    const ensureYouTubeApi = async () => {
      if (window.YT?.Player) return;
      if (youtubeApiPromiseRef.current) {
        await youtubeApiPromiseRef.current;
        return;
      }

      youtubeApiPromiseRef.current = new Promise<void>((resolve) => {
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          previousReady?.();
          resolve();
        };

        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
      });

      await youtubeApiPromiseRef.current;
    };

    const mountPlayer = async () => {
      await ensureYouTubeApi();
      if (cancelled || !youtubeContainerRef.current || !window.YT?.Player) return;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: musicSource.videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: { setVolume: (v: number) => void; playVideo: () => void } }) => {
            event.target.setVolume(Math.round(volumeRef.current * 100));
            event.target.playVideo();
          },
        },
      });
    };

    void mountPlayer();

    return () => {
      cancelled = true;
    };
  }, [musicSource?.kind, musicSource?.videoId]);

  const resetOpenTimeout = () => {
    if (!open) return;
    if (openTimeoutRef.current !== null) {
      window.clearTimeout(openTimeoutRef.current);
    }
    openTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      openTimeoutRef.current = null;
    }, 8000);
  };

  const active = useMemo(() => PRESETS.find((p) => p.id === activeId) ?? PRESETS[0], [activeId]);

  const startMusicDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!musicCardRef.current) return;
    const rect = musicCardRef.current.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onMusicDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current?.dragging || !musicCardRef.current) return;
    const width = musicCardRef.current.offsetWidth;
    const height = musicCardRef.current.offsetHeight;
    const maxX = Math.max(16, window.innerWidth - width - 16);
    const maxY = Math.max(16, window.innerHeight - height - 16);
    setMusicPos({
      x: Math.min(Math.max(16, e.clientX - dragRef.current.offsetX), maxX),
      y: Math.min(Math.max(16, e.clientY - dragRef.current.offsetY), maxY),
    });
  };

  const stopMusicDrag = () => {
    if (dragRef.current) {
      dragRef.current.dragging = false;
    }
  };

  const toggleMusicWidget = () => {
    setMusicWidgetVisible((visible) => !visible);
  };

  const restoreMusicWidget = () => {
    setMusicWidgetVisible(true);
    setMusicPos(originalMusicPosRef.current);
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto animate-fade-in z-30">
      {musicSource?.kind === "youtube" && musicSource.embedUrl ? (
        <div
          ref={musicCardRef}
          className={`fixed z-40 overflow-hidden rounded-2xl glass border border-white/10 bg-black/75 backdrop-blur-2xl shadow-[0_0_60px_hsl(0_0%_0%_/_0.4)] ${
            musicWidgetVisible ? "w-[min(340px,calc(100vw-1.5rem))]" : "w-[min(128px,calc(100vw-1.5rem))]"
          }`}
          style={{ left: musicPos.x, top: musicPos.y }}
        >
          <div
            className="flex items-center gap-1.5 px-2.5 py-2 cursor-grab active:cursor-grabbing"
            onPointerDown={startMusicDrag}
            onPointerMove={onMusicDrag}
            onPointerUp={stopMusicDrag}
            onPointerCancel={stopMusicDrag}
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                stopMusic();
              }}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-transparent"
              aria-label="Close video"
              title="Close"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_0_1px_hsl(0_0%_100%_/_0.08)_inset]" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleMusicWidget();
              }}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-transparent"
              aria-label={musicWidgetVisible ? "Hide video widget" : "Show video widget"}
              title={musicWidgetVisible ? "Hide" : "Show"}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_0_1px_hsl(0_0%_100%_/_0.08)_inset]" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                restoreMusicWidget();
              }}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-transparent"
              aria-label="Restore video widget"
              title="Restore"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_0_1px_hsl(0_0%_100%_/_0.08)_inset]" />
            </button>
          </div>
          <div
            className={`border-t border-white/10 transition-all duration-300 ${
              musicWidgetVisible ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
            }`}
          >
            <div className="relative aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`${musicSource.embedUrl}?rel=0&modestbranding=1`}
                title={musicSource.title}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}

      {musicSource?.kind === "audio" ? (
        <div
          ref={musicCardRef}
          className={`fixed z-40 rounded-2xl glass border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between gap-3 backdrop-blur-2xl shadow-[0_0_60px_hsl(0_0%_0%_/_0.2)] cursor-grab active:cursor-grabbing transition-all duration-300 ${
            musicWidgetVisible ? "w-[min(220px,calc(100vw-1.5rem))]" : "w-[min(128px,calc(100vw-1.5rem))]"
          }`}
          style={{ left: musicPos.x, top: musicPos.y }}
          onPointerDown={startMusicDrag}
          onPointerMove={onMusicDrag}
          onPointerUp={stopMusicDrag}
          onPointerCancel={stopMusicDrag}
        >
          <div
            className={`flex min-w-0 items-center gap-3 transition-all duration-300 ${
              musicWidgetVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="truncate">Playing: {musicSource.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMusicWidget}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
              aria-label={musicWidgetVisible ? "Hide audio widget" : "Show audio widget"}
              title={musicWidgetVisible ? "Hide widget" : "Show widget"}
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={stopMusic}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
              aria-label="Stop audio"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((o) => !o)}
        className={`group glass w-full md:w-auto rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-500 hover:scale-[1.01] hover:bg-white/[0.07] ${
          activeId !== "off" || open ? "shadow-[0_0_60px_hsl(0_0%_100%_/_0.08)]" : ""
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
          <span className="flex items-center gap-2 text-[9px] tracking-[0.2em] text-muted-foreground font-medium">
            BINAURAL
            {open ? <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_hsl(0_0%_100%_/_0.8)]" /> : null}
          </span>
          <span className="text-sm font-medium text-foreground">{active.label}</span>
        </div>
      </button>

      <div
        className={`absolute bottom-[calc(100%+0.75rem)] left-0 right-0 md:right-auto md:w-72 glass rounded-2xl p-4 bg-black/80 backdrop-blur-2xl border border-white/10 origin-bottom-left transition-all duration-300 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100 shadow-[0_0_50px_hsl(0_0%_0%_/_0.35)]"
            : "pointer-events-none translate-y-2 scale-95 opacity-0 shadow-none"
        }`}
        aria-hidden={!open}
        onPointerDownCapture={resetOpenTimeout}
        onPointerMoveCapture={resetOpenTimeout}
        onFocusCapture={resetOpenTimeout}
        onClickCapture={resetOpenTimeout}
        onKeyDownCapture={resetOpenTimeout}
      >
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
                activeId === p.id ? "bg-white/10" : "hover:bg-white/[0.05]"
              }`}
            >
              <span className="text-xs font-medium tracking-[0.2em]">{p.label}</span>
              <span className="text-[10px] text-muted-foreground">{p.desc}</span>
            </button>
          ))}
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
        </div>

        <div className="mt-4 border-t border-white/5 pt-3">
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

    </div>

    <PlaylistWidget />
    </>
  );
};
