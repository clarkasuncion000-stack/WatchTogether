"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Users, AlertTriangle } from "lucide-react";
import { ParticipantInfo, useLiveKitRoom } from "@/hooks/useLiveKitRoom";

interface LiveKitWebcamGridProps {
  roomId: string;
  userId: string;
  displayName: string;
}

function ParticipantTile({ participant }: { participant: ParticipantInfo }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (participant.videoTrack && videoRef.current) {
      participant.videoTrack.attach(videoRef.current);
      return () => {
        participant.videoTrack?.detach();
      };
    }
  }, [participant.videoTrack]);

  useEffect(() => {
    if (participant.audioTrack && audioRef.current && !participant.isLocal) {
      participant.audioTrack.attach(audioRef.current);
      return () => {
        participant.audioTrack?.detach();
      };
    }
  }, [participant.audioTrack, participant.isLocal]);

  const initials = (participant.name || "P").slice(0, 2).toUpperCase();

  return (
    <div className="relative group bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-lg">
      {/* Video Track Element */}
      {participant.videoTrack && !participant.isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        /* Avatar Fallback */
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-extrabold text-white text-base shadow-md">
            {initials}
          </div>
          <span className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">
            {participant.name} {participant.isLocal && "(You)"}
          </span>
        </div>
      )}

      {/* Audio Element for Remote Participants */}
      {!participant.isLocal && <audio ref={audioRef} autoPlay />}

      {/* Name Overlay Banner */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] font-medium text-slate-200">
        <span className="truncate max-w-[100px]">
          {participant.name} {participant.isLocal && "(You)"}
        </span>
        <div className="flex items-center gap-1.5">
          {participant.isMicMuted ? (
            <MicOff className="w-3 h-3 text-rose-400" />
          ) : (
            <Mic className="w-3 h-3 text-emerald-400" />
          )}
          {participant.isCameraOff && (
            <VideoOff className="w-3 h-3 text-amber-400" />
          )}
        </div>
      </div>
    </div>
  );
}

export function LiveKitWebcamGrid({ roomId, userId, displayName }: LiveKitWebcamGridProps) {
  const {
    participants,
    isMicMuted,
    isCameraOff,
    isConnecting,
    isConnected,
    error,
    toggleMicrophone,
    toggleCamera,
  } = useLiveKitRoom({ roomId, userId, displayName });

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 flex flex-col justify-between space-y-4 shadow-xl backdrop-blur-xl">
      {/* Grid Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1 border-b border-slate-800/60 pb-2">
        <span className="flex items-center gap-1.5 text-slate-200">
          <VideoIcon className="w-4 h-4 text-indigo-400" />
          Webcam Party
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-slate-400">
            <Users className="w-3.5 h-3.5" />
            {participants.length || 1} Connected
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-400 animate-pulse"
                : isConnecting
                ? "bg-amber-400 animate-ping"
                : "bg-slate-500"
            }`}
          />
        </div>
      </div>

      {/* LiveKit Connection Error / Unconfigured Notice */}
      {error && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>LiveKit WebRTC is unconfigured or offline. Local participant avatar mode is active.</span>
        </div>
      )}

      {/* Participant Video Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-h-[140px]">
        {participants.length > 0 ? (
          participants.map((p) => <ParticipantTile key={p.identity} participant={p} />)
        ) : (
          /* Default Local Fallback Tile */
          <ParticipantTile
            participant={{
              identity: userId,
              name: displayName,
              isLocal: true,
              isMicMuted,
              isCameraOff,
            }}
          />
        )}
      </div>

      {/* Local User Media Control Bar */}
      <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-800/60">
        <button
          onClick={toggleMicrophone}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-md ${
            isMicMuted
              ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
        >
          {isMicMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          <span>{isMicMuted ? "Unmute Mic" : "Mute Mic"}</span>
        </button>

        <button
          onClick={toggleCamera}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-md ${
            isCameraOff
              ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          }`}
        >
          {isCameraOff ? <VideoOff className="w-4 h-4 text-amber-400" /> : <VideoIcon className="w-4 h-4 text-indigo-400" />}
          <span>{isCameraOff ? "Turn On Camera" : "Turn Off Camera"}</span>
        </button>
      </div>
    </div>
  );
}
