"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseVideoSyncProps {
  roomId: string;
  userId: string;
  displayName: string;
  initialVideoId?: string;
}

export interface VideoSyncState {
  youtubeVideoId: string;
  currentTime: number;
  isPlaying: boolean;
  isConnected: boolean;
}

export function useVideoSync({
  roomId,
  userId,
  displayName,
  initialVideoId = "dQw4w9WgXcQ",
}: UseVideoSyncProps) {
  const socketRef = useRef<Socket | null>(null);
  const playerRef = useRef<any>(null);

  const [syncState, setSyncState] = useState<VideoSyncState>({
    youtubeVideoId: initialVideoId,
    currentTime: 0,
    isPlaying: false,
    isConnected: false,
  });

  // Guard flag to prevent feedback loops when player state changes due to remote socket event
  const isRemoteChangeRef = useRef<boolean>(false);
  const remoteChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flagRemoteChange = useCallback(() => {
    isRemoteChangeRef.current = true;
    if (remoteChangeTimeoutRef.current) {
      clearTimeout(remoteChangeTimeoutRef.current);
    }
    remoteChangeTimeoutRef.current = setTimeout(() => {
      isRemoteChangeRef.current = false;
    }, 1200); // 1.2s guard window for YT IFrame state propagation
  }, []);

  const setPlayerRef = useCallback((player: any) => {
    playerRef.current = player;
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!roomId || !userId) return;

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
    const socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[useVideoSync] Connected to Socket server:", socket.id);
      setSyncState((prev) => ({ ...prev, isConnected: true }));
      socket.emit("join-room", { roomId, userId, displayName });
    });

    socket.on("disconnect", () => {
      console.log("[useVideoSync] Disconnected from Socket server");
      setSyncState((prev) => ({ ...prev, isConnected: false }));
    });

    // Remote sync handlers
    socket.on("sync-state", ({ youtubeVideoId, currentTime, isPlaying }) => {
      console.log("[useVideoSync] Remote sync-state:", { youtubeVideoId, currentTime, isPlaying });
      flagRemoteChange();
      setSyncState({
        youtubeVideoId,
        currentTime,
        isPlaying,
        isConnected: true,
      });

      const player = playerRef.current;
      if (player && typeof player.seekTo === "function") {
        if (currentTime > 0) player.seekTo(currentTime, true);
        if (isPlaying && typeof player.playVideo === "function") {
          player.playVideo();
        } else if (!isPlaying && typeof player.pauseVideo === "function") {
          player.pauseVideo();
        }
      }
    });

    socket.on("video-play", ({ currentTime }) => {
      console.log("[useVideoSync] Remote video-play at", currentTime);
      flagRemoteChange();
      setSyncState((prev) => ({ ...prev, isPlaying: true, currentTime }));

      const player = playerRef.current;
      if (player && typeof player.playVideo === "function") {
        const timeDiff = Math.abs((player.getCurrentTime?.() || 0) - currentTime);
        if (timeDiff > 1.5 && typeof player.seekTo === "function") {
          player.seekTo(currentTime, true);
        }
        player.playVideo();
      }
    });

    socket.on("video-pause", ({ currentTime }) => {
      console.log("[useVideoSync] Remote video-pause at", currentTime);
      flagRemoteChange();
      setSyncState((prev) => ({ ...prev, isPlaying: false, currentTime }));

      const player = playerRef.current;
      if (player && typeof player.pauseVideo === "function") {
        const timeDiff = Math.abs((player.getCurrentTime?.() || 0) - currentTime);
        if (timeDiff > 1.5 && typeof player.seekTo === "function") {
          player.seekTo(currentTime, true);
        }
        player.pauseVideo();
      }
    });

    socket.on("video-seek", ({ currentTime }) => {
      console.log("[useVideoSync] Remote video-seek to", currentTime);
      flagRemoteChange();
      setSyncState((prev) => ({ ...prev, currentTime }));

      const player = playerRef.current;
      if (player && typeof player.seekTo === "function") {
        player.seekTo(currentTime, true);
      }
    });

    socket.on("video-change", ({ youtubeVideoId }) => {
      console.log("[useVideoSync] Remote video-change to", youtubeVideoId);
      flagRemoteChange();
      setSyncState((prev) => ({
        ...prev,
        youtubeVideoId,
        currentTime: 0,
        isPlaying: false,
      }));

      const player = playerRef.current;
      if (player && typeof player.loadVideoById === "function") {
        player.loadVideoById(youtubeVideoId);
      }
    });

    return () => {
      if (remoteChangeTimeoutRef.current) clearTimeout(remoteChangeTimeoutRef.current);
      socket.disconnect();
    };
  }, [roomId, userId, displayName, flagRemoteChange]);

  // Local Emitters (guarded against feedback loops)
  const emitPlay = useCallback(
    (currentTime: number) => {
      if (isRemoteChangeRef.current) return;
      console.log("[useVideoSync] Local emitPlay at", currentTime);
      socketRef.current?.emit("video-play", { roomId, currentTime });
      setSyncState((prev) => ({ ...prev, isPlaying: true, currentTime }));
    },
    [roomId]
  );

  const emitPause = useCallback(
    (currentTime: number) => {
      if (isRemoteChangeRef.current) return;
      console.log("[useVideoSync] Local emitPause at", currentTime);
      socketRef.current?.emit("video-pause", { roomId, currentTime });
      setSyncState((prev) => ({ ...prev, isPlaying: false, currentTime }));
    },
    [roomId]
  );

  const emitSeek = useCallback(
    (currentTime: number) => {
      if (isRemoteChangeRef.current) return;
      console.log("[useVideoSync] Local emitSeek to", currentTime);
      socketRef.current?.emit("video-seek", { roomId, currentTime });
      setSyncState((prev) => ({ ...prev, currentTime }));
    },
    [roomId]
  );

  const emitChangeVideo = useCallback(
    (newVideoId: string) => {
      console.log("[useVideoSync] Local emitChangeVideo to", newVideoId);
      socketRef.current?.emit("video-change", { roomId, youtubeVideoId: newVideoId });
      setSyncState((prev) => ({
        ...prev,
        youtubeVideoId: newVideoId,
        currentTime: 0,
        isPlaying: false,
      }));
    },
    [roomId]
  );

  return {
    socket: socketRef.current,
    syncState,
    setPlayerRef,
    emitPlay,
    emitPause,
    emitSeek,
    emitChangeVideo,
  };
}
