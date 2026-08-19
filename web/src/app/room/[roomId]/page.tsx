"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Copy, 
  Check, 
  LogOut, 
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { getOrCreateSession, UserSession } from "@/lib/session";
import { getRoom, RoomData } from "@/lib/supabase";
import { useVideoSync } from "@/hooks/useVideoSync";
import { YouTubeSyncPlayer } from "@/components/YouTubeSyncPlayer";
import { LiveKitWebcamGrid } from "@/components/LiveKitWebcamGrid";
import { RoomChatSidebar } from "@/components/RoomChatSidebar";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params?.roomId as string || "").toUpperCase();

  const [session, setSession] = useState<UserSession | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const userSession = getOrCreateSession();
    setSession(userSession);

    if (!roomId) {
      setError("Invalid room code");
      setIsLoading(false);
      return;
    }

    async function fetchRoomDetails() {
      setIsLoading(true);
      try {
        const roomData = await getRoom(roomId);
        if (!roomData) {
          setError(`Room "${roomId}" not found. It may have expired or been removed.`);
        } else {
          setRoom(roomData);
        }
      } catch (err: any) {
        console.error("Failed to load room details:", err);
        setError("Error connecting to room. Please ensure the server is running.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoomDetails();
  }, [roomId]);

  // Video Sync Hook (Isolated)
  const {
    socket,
    syncState,
    setPlayerRef,
    emitPlay,
    emitPause,
    emitSeek,
    emitChangeVideo,
  } = useVideoSync({
    roomId,
    userId: session?.userId || "",
    displayName: session?.displayName || "Guest",
    initialVideoId: room?.youtube_video_id || "dQw4w9WgXcQ",
  });

  const handleCopyCode = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Entering Room {roomId}...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">Room Error</h2>
            <p className="text-sm text-slate-400">{error || "Could not load room specifications."}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-5 font-semibold text-sm transition"
          >
            <LogOut className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isHost = session?.userId === room.host_id;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col h-screen overflow-hidden">
      {/* Room Header Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-300 hover:text-white font-bold text-lg transition"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
              WT
            </div>
            <span className="hidden sm:inline">Watch Together</span>
          </Link>

          <div className="h-5 w-px bg-slate-800" />

          {/* Room Code & Copy */}
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1 text-sm font-mono">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Room:</span>
            <span className="font-bold text-indigo-400 tracking-wider">{roomId}</span>
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isHost && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
              Host
            </span>
          )}
        </div>

        {/* Right Nav: Session Info & Leave */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-200">{session?.displayName || "Guest"}</span>
          </div>

          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 rounded-xl px-3 py-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main Room Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left / Center Area: Video Player & LiveKit Webcam Grid */}
        <div className="lg:col-span-8 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* Real-Time Synced YouTube Player */}
          <YouTubeSyncPlayer
            videoId={syncState.youtubeVideoId}
            syncState={syncState}
            setPlayerRef={setPlayerRef}
            emitPlay={emitPlay}
            emitPause={emitPause}
            emitSeek={emitSeek}
            emitChangeVideo={emitChangeVideo}
          />

          {/* LiveKit Real-Time Webcams & Controls */}
          {session && (
            <LiveKitWebcamGrid
              roomId={roomId}
              userId={session.userId}
              displayName={session.displayName}
            />
          )}
        </div>

        {/* Right Sidebar: Realtime Chat */}
        {session && (
          <RoomChatSidebar
            socket={socket}
            roomId={roomId}
            userId={session.userId}
            displayName={session.displayName}
          />
        )}
      </div>
    </div>
  );
}
