"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Film, Link2, Check, Radio } from "lucide-react";
import { VideoSyncState } from "@/hooks/useVideoSync";

interface YouTubeSyncPlayerProps {
  videoId: string;
  syncState: VideoSyncState;
  setPlayerRef: (player: any) => void;
  emitPlay: (currentTime: number) => void;
  emitPause: (currentTime: number) => void;
  emitSeek: (currentTime: number) => void;
  emitChangeVideo: (newVideoId: string) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export function YouTubeSyncPlayer({
  videoId,
  syncState,
  setPlayerRef,
  emitPlay,
  emitPause,
  emitSeek,
  emitChangeVideo,
}: YouTubeSyncPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const [inputUrl, setInputUrl] = useState<string>("");
  const [isUrlSaved, setIsUrlSaved] = useState<boolean>(false);
  const [isApiReady, setIsApiReady] = useState<boolean>(false);

  const lastTrackedTimeRef = useRef<number>(0);
  const seekCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to extract 11-char YouTube ID
  const extractVideoId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (trimmed.length === 11 && !trimmed.includes("/")) {
      return trimmed;
    }
    const match = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : trimmed;
  };

  // Load YouTube IFrame API script dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      console.log("[YouTubePlayer] YT IFrame API ready");
      setIsApiReady(true);
    };
  }, []);

  // Initialize YT.Player instance once API is ready
  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    // Destroy existing player instance if re-initializing
    if (playerInstanceRef.current) {
      try {
        playerInstanceRef.current.destroy();
      } catch (e) {
        console.warn("Error destroying previous YT player:", e);
      }
    }

    const player = new window.YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId: videoId || "dQw4w9WgXcQ",
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: (event: any) => {
          console.log("[YouTubePlayer] Player ready");
          playerInstanceRef.current = event.target;
          setPlayerRef(event.target);

          // If sync state has initial position/play state, apply it
          if (syncState.currentTime > 0) {
            event.target.seekTo(syncState.currentTime, true);
          }
          if (syncState.isPlaying) {
            event.target.playVideo();
          }
        },
        onStateChange: (event: any) => {
          const playerState = event.data;
          const currTime = player.getCurrentTime ? player.getCurrentTime() : 0;

          // 1: PLAYING
          if (playerState === window.YT.PlayerState.PLAYING) {
            emitPlay(currTime);
          }
          // 2: PAUSED
          else if (playerState === window.YT.PlayerState.PAUSED) {
            emitPause(currTime);
          }
        },
      },
    });

    // Periodic check to detect manual user seek / timeline scrubbing
    seekCheckIntervalRef.current = setInterval(() => {
      if (playerInstanceRef.current && typeof playerInstanceRef.current.getCurrentTime === "function") {
        const currentTime = playerInstanceRef.current.getCurrentTime();
        const diff = Math.abs(currentTime - lastTrackedTimeRef.current);
        // If jump is greater than 2 seconds (excluding normal 1s playback progression)
        if (diff > 2.2 && playerInstanceRef.current.getPlayerState() !== window.YT.PlayerState.BUFFERING) {
          console.log("[YouTubePlayer] Detected seek jump from", lastTrackedTimeRef.current, "to", currentTime);
          emitSeek(currentTime);
        }
        lastTrackedTimeRef.current = currentTime;
      }
    }, 1000);

    return () => {
      if (seekCheckIntervalRef.current) clearInterval(seekCheckIntervalRef.current);
    };
  }, [isApiReady, videoId]);

  // Load new video when syncState.youtubeVideoId changes remotely
  useEffect(() => {
    if (playerInstanceRef.current && typeof playerInstanceRef.current.loadVideoById === "function") {
      const currentLoadedId = playerInstanceRef.current.getVideoData?.()?.video_id;
      if (currentLoadedId !== syncState.youtubeVideoId) {
        console.log("[YouTubePlayer] Loading new video from syncState:", syncState.youtubeVideoId);
        playerInstanceRef.current.loadVideoById(syncState.youtubeVideoId);
      }
    }
  }, [syncState.youtubeVideoId]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const newId = extractVideoId(inputUrl);
    emitChangeVideo(newId);
    setInputUrl("");
    setIsUrlSaved(true);
    setTimeout(() => setIsUrlSaved(false), 2000);
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Top Bar: Change Video Form & Connection Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 backdrop-blur-xl">
        <form onSubmit={handleUrlSubmit} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube Link or Video ID to change for everyone..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={!inputUrl.trim()}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl px-3.5 py-2 text-xs font-semibold shadow-md transition shrink-0"
          >
            {isUrlSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Changed!</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5" />
                <span>Load Video</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-end gap-2 px-2 text-xs font-medium border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          <Radio className={`w-3.5 h-3.5 ${syncState.isConnected ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
          <span className={syncState.isConnected ? "text-emerald-400" : "text-rose-400"}>
            {syncState.isConnected ? "Synced Live" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
