import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Play, List, X, Square, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  youtubeUrl: string;
  embedUrl?: string;
}

const DEFAULT_PLAYLIST: Video[] = [
  {
    id: "1",
    title: "Focus Music",
    youtubeId: "jfKfPfyJRdk",
    youtubeUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  },
  {
    id: "2", 
    title: "Study Sounds",
    youtubeId: "lFcSrYw-ARY",
    youtubeUrl: "https://www.youtube.com/watch?v=lFcSrYw-ARY"
  },
  {
    id: "3",
    title: "Deep Work",
    youtubeId: "5qap5aO4i9A",
    youtubeUrl: "https://www.youtube.com/watch?v=5qap5aO4i9A"
  }
];

export const PlaylistWidget = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [playlist] = useState<Video[]>(DEFAULT_PLAYLIST);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [videoWidgetVisible, setVideoWidgetVisible] = useState(true);
  const [videoPos, setVideoPos] = useState({ x: 16, y: 16 });
  const [volume, setVolume] = useState(0.05);
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const videoCardRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeApiPromiseRef = useRef<Promise<void> | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dragging: boolean; offsetX: number; offsetY: number } | null>(null);
  const volumeRef = useRef(volume);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPosition({
        x: deltaX,
        y: deltaY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    setIsDragging(true);
    e.preventDefault();
  };

  const parseYouTubeId = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v");
      }
      if (urlObj.hostname.includes("youtu.be")) {
        return urlObj.pathname.split("/").filter(Boolean)[0] ?? null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const playVideo = (video: Video) => {
    const youtubeId = parseYouTubeId(video.youtubeUrl);
    if (!youtubeId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    stopVideo();
    setCurrentVideo({
      ...video,
      youtubeId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`
    });
    setVideoWidgetVisible(true);
    setVideoPos({ x: 16, y: 16 });
  };

  const stopVideo = () => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.destroy();
      youtubePlayerRef.current = null;
    }
    setCurrentVideo(null);
    setVideoWidgetVisible(true);
  };

  const startVideoDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!videoCardRef.current) return;
    const rect = videoCardRef.current.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onVideoDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current?.dragging || !videoCardRef.current) return;
    const width = videoCardRef.current.offsetWidth;
    const height = videoCardRef.current.offsetHeight;
    const maxX = Math.max(16, window.innerWidth - width - 16);
    const maxY = Math.max(16, window.innerHeight - height - 16);
    setVideoPos({
      x: Math.min(Math.max(16, e.clientX - dragRef.current.offsetX), maxX),
      y: Math.min(Math.max(16, e.clientY - dragRef.current.offsetY), maxY),
    });
  };

  const stopVideoDrag = () => {
    if (dragRef.current) {
      dragRef.current.dragging = false;
    }
  };

  const toggleVideoWidget = () => {
    setVideoWidgetVisible((visible) => !visible);
  };

  const restoreVideoWidget = () => {
    setVideoWidgetVisible(true);
    setVideoPos({ x: 16, y: 16 });
  };

  useEffect(() => {
    volumeRef.current = volume;
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(Math.round(volume * 100));
    }
  }, [volume]);

  useEffect(() => {
    if (!currentVideo?.youtubeId || !youtubeContainerRef.current) return;

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
        videoId: currentVideo.youtubeId,
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
  }, [currentVideo?.youtubeId]);

  useEffect(() => {
    if (!currentVideo?.embedUrl) return;
    const clampPosition = () => {
      const width = videoCardRef.current?.offsetWidth ?? 360;
      const height = videoCardRef.current?.offsetHeight ?? 360;
      const maxX = Math.max(16, window.innerWidth - width - 16);
      const maxY = Math.max(16, window.innerHeight - height - 16);
      setVideoPos((p) => ({
        x: Math.min(Math.max(16, p.x), maxX),
        y: Math.min(Math.max(16, p.y), maxY),
      }));
    };
    clampPosition();
    window.addEventListener("resize", clampPosition);
    return () => window.removeEventListener("resize", clampPosition);
  }, [currentVideo?.embedUrl]);

  return (
    <>
      {false && currentVideo?.embedUrl ? (
        <div
          ref={videoCardRef}
          className={`fixed z-40 overflow-hidden rounded-2xl glass border border-white/10 bg-black/75 backdrop-blur-2xl shadow-[0_0_60px_hsl(0_0%_0%_/_0.4)] ${
            videoWidgetVisible ? "w-[min(340px,calc(100vw-1.5rem))]" : "w-[min(128px,calc(100vw-1.5rem))]"
          }`}
          style={{ left: videoPos.x, top: videoPos.y }}
        >
          <div
            className="flex items-center gap-1.5 px-2.5 py-2 cursor-grab active:cursor-grabbing"
            onPointerDown={startVideoDrag}
            onPointerMove={onVideoDrag}
            onPointerUp={stopVideoDrag}
            onPointerCancel={stopVideoDrag}
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                stopVideo();
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
                toggleVideoWidget();
              }}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-transparent"
              aria-label={videoWidgetVisible ? "Hide video widget" : "Show video widget"}
              title={videoWidgetVisible ? "Hide" : "Show"}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_0_1px_hsl(0_0%_100%_/_0.08)_inset]" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                restoreVideoWidget();
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
              videoWidgetVisible ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
            }`}
          >
            <div className="relative aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`${currentVideo.embedUrl}?rel=0&modestbranding=1`}
                title={currentVideo.title}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}

      <div 
        ref={widgetRef}
        className={`hidden fixed bottom-6 left-[calc(4rem+100px)] md:left-[calc(6rem+120px)] z-30 animate-fade-in ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`group glass w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 hover:scale-[1.01] hover:bg-white/[0.07] ${
            currentVideo ? "shadow-[0_0_60px_hsl(0_0%_100%_/_0.08)]" : ""
          }`}
        >
          <List className="w-4 h-4 text-foreground/80" />
        </button>

        <div
          className={`absolute bottom-[calc(100%+0.75rem)] right-0 md:right-auto md:w-72 glass rounded-2xl p-4 bg-black/80 backdrop-blur-2xl border border-white/10 origin-bottom-right transition-all duration-300 ease-out ${
            isExpanded
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100 shadow-[0_0_50px_hsl(0_0%_0%_/_0.35)]"
              : "pointer-events-none translate-y-2 scale-95 opacity-0 shadow-none"
          }`}
          aria-hidden={!isExpanded}
        >
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-3">
            FOCUS VIDEOS
          </div>
          <div className="flex flex-col gap-1 mb-4">
            {playlist.map((video) => (
              <button
                key={video.id}
                onClick={() => playVideo(video)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                  currentVideo?.id === video.id ? "bg-white/10" : "hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium tracking-[0.2em]">{video.title}</span>
                </div>
                {currentVideo?.id === video.id && (
                  <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_12px_hsl(0_0%_100%_/_0.8)]" />
                )}
              </button>
            ))}
          </div>

          {currentVideo && (
            <div className="mt-4 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-[0.3em] text-muted-foreground">NOW PLAYING</span>
                <button
                  onClick={stopVideo}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Square className="w-3 h-3" />
                  STOP
                </button>
              </div>
              <div className="text-xs text-foreground font-medium">
                {currentVideo.title}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
