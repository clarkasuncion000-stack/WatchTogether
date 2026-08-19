"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Video, Users, Shuffle, ArrowRight, Play, Film, ShieldCheck } from "lucide-react";
import { getOrCreateSession, updateDisplayName, UserSession } from "@/lib/session";
import { createRoom, getRoom } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [joinCode, setJoinCode] = useState<string>("");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [isLoadingCreate, setIsLoadingCreate] = useState<boolean>(false);
  const [isLoadingJoin, setIsLoadingJoin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const activeSession = getOrCreateSession();
    setSession(activeSession);
    setDisplayName(activeSession.displayName);
  }, []);

  const handleRandomizeName = () => {
    const updated = updateDisplayName("");
    setSession(updated);
    setDisplayName(updated.displayName);
  };

  const handleSaveName = (newName: string) => {
    setDisplayName(newName);
    if (session) {
      updateDisplayName(newName);
    }
  };

  const extractYoutubeId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (trimmed.length === 11 && !trimmed.includes('/')) {
      return trimmed;
    }
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : 'dQw4w9WgXcQ';
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setIsLoadingCreate(true);
    setErrorMessage(null);

    try {
      const videoId = extractYoutubeId(youtubeUrl);
      const room = await createRoom(session.userId, videoId);
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      console.error("Failed to create room:", err);
      setErrorMessage(err.message || "Could not create room. Please try again.");
    } finally {
      setIsLoadingCreate(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsLoadingJoin(true);
    setErrorMessage(null);

    const cleanCode = joinCode.trim().toUpperCase();

    try {
      const room = await getRoom(cleanCode);
      if (!room) {
        setErrorMessage(`Room "${cleanCode}" does not exist. Try DEMO12 or create a new room.`);
        setIsLoadingJoin(false);
        return;
      }
      router.push(`/room/${cleanCode}`);
    } catch (err: any) {
      console.error("Failed to join room:", err);
      setErrorMessage("Could not join room. Please check the code and server connection.");
    } finally {
      setIsLoadingJoin(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative z-10 max-w-4xl w-full space-y-8 text-center">
        {/* Badge & Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Synced Video & Webcam Room</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Watch Together in Real-Time
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Sync YouTube playback frame-for-frame while seeing and chatting with friends over live video. No sign-up required.
          </p>
        </div>

        {/* Guest Session Customizer Bar */}
        <div className="max-w-md mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-2 text-left">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Guest Identity
            </span>
            <span className="text-slate-500">Auto-saved</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => handleSaveName(e.target.value)}
              placeholder="Your display name"
              className="flex-1 bg-slate-950/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="button"
              onClick={handleRandomizeName}
              title="Randomize Display Name"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="max-w-md mx-auto p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Actions Grid: Create vs Join */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
          {/* Create Room Card */}
          <div className="relative group rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl hover:border-indigo-500/40 transition duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Create a Room</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Start a new synced session and invite friends with a code.
                </p>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Initial YouTube Video URL / ID (Optional)
                  </label>
                  <div className="relative">
                    <Film className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="e.g. https://youtu.be/..."
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingCreate}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 px-4 font-semibold text-sm shadow-lg shadow-indigo-600/20 transition active:scale-[0.99]"
                >
                  {isLoadingCreate ? (
                    <span>Creating Room...</span>
                  ) : (
                    <>
                      <span>Create Room</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="relative group rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl hover:border-purple-500/40 transition duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Join Existing Room</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Enter a 6-character room code to join an active party.
                </p>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DEMO12"
                    maxLength={10}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono tracking-widest text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoadingJoin || !joinCode.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-3 px-4 font-semibold text-sm shadow-lg shadow-purple-600/20 transition active:scale-[0.99]"
                >
                  {isLoadingJoin ? (
                    <span>Joining Room...</span>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Join Room</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
