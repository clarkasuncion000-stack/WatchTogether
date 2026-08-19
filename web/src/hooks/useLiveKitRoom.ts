"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  Participant,
  LocalParticipant,
  Track,
  TrackPublication,
  RemoteTrackPublication,
  RemoteTrack,
} from "livekit-client";

interface UseLiveKitRoomProps {
  roomId: string;
  userId: string;
  displayName: string;
}

export interface ParticipantInfo {
  identity: string;
  name: string;
  isLocal: boolean;
  audioTrack?: Track;
  videoTrack?: Track;
  isMicMuted: boolean;
  isCameraOff: boolean;
}

export function useLiveKitRoom({ roomId, userId, displayName }: UseLiveKitRoomProps) {
  const roomRef = useRef<Room | null>(null);

  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateParticipantsState = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const list: ParticipantInfo[] = [];

    // Helper to map LiveKit Participant to ParticipantInfo
    const mapParticipant = (p: Participant, isLocal: boolean): ParticipantInfo => {
      let audioTrack: Track | undefined;
      let videoTrack: Track | undefined;
      let micMuted = true;
      let cameraOff = true;

      p.trackPublications.forEach((pub) => {
        if (pub.kind === Track.Kind.Audio) {
          if (pub.track) audioTrack = pub.track;
          micMuted = pub.isMuted;
        }
        if (pub.kind === Track.Kind.Video) {
          if (pub.track) videoTrack = pub.track;
          cameraOff = pub.isMuted;
        }
      });

      return {
        identity: p.identity,
        name: p.name || p.identity,
        isLocal,
        audioTrack,
        videoTrack,
        isMicMuted: micMuted,
        isCameraOff: cameraOff,
      };
    };

    // Add local participant
    if (room.localParticipant) {
      list.push(mapParticipant(room.localParticipant, true));
    }

    // Add remote participants
    room.remoteParticipants.forEach((rp) => {
      list.push(mapParticipant(rp, false));
    });

    setParticipants(list);
  }, []);

  useEffect(() => {
    if (!roomId || !userId) return;

    let isMounted = true;
    setIsConnecting(true);
    setError(null);

    async function connectToLiveKit() {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
        const tokenRes = await fetch(
          `${serverUrl}/api/livekit/token?room=${encodeURIComponent(roomId)}&identity=${encodeURIComponent(userId)}&name=${encodeURIComponent(displayName)}`
        );

        if (!tokenRes.ok) {
          throw new Error("Failed to obtain LiveKit token from server");
        }

        const { token, serverUrl: envLiveKitUrl } = await tokenRes.json();
        const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || envLiveKitUrl;

        if (!livekitUrl || livekitUrl.includes("your-livekit-server-url")) {
          throw new Error("LiveKit URL is not configured in .env.local");
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        // Register LiveKit Event Listeners
        room.on(RoomEvent.Connected, async () => {
          if (!isMounted) return;
          console.log("[LiveKit] Connected to room:", room.name);
          setIsConnected(true);
          setIsConnecting(false);

          // Enable local camera and microphone by default
          try {
            await room.localParticipant.enableCameraAndMicrophone();
          } catch (e) {
            console.warn("[LiveKit] Could not auto-enable camera/mic:", e);
          }
          updateParticipantsState();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (!isMounted) return;
          console.log("[LiveKit] Disconnected from room");
          setIsConnected(false);
          setParticipants([]);
        });

        room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log("[LiveKit] Remote participant joined:", participant.identity);
          updateParticipantsState();
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log("[LiveKit] Remote participant left:", participant.identity);
          updateParticipantsState();
        });

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          console.log("[LiveKit] Track subscribed:", track.kind, "from", participant.identity);
          updateParticipantsState();
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          console.log("[LiveKit] Track unsubscribed:", track.kind, "from", participant.identity);
          updateParticipantsState();
        });

        room.on(RoomEvent.TrackMuted, () => updateParticipantsState());
        room.on(RoomEvent.TrackUnmuted, () => updateParticipantsState());

        // Connect to LiveKit server
        await room.connect(livekitUrl, token);
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("[LiveKit Connection Error]:", err.message || err);
        setError(err.message || "LiveKit connection failed");
        setIsConnecting(false);
        setIsConnected(false);
      }
    }

    connectToLiveKit();

    return () => {
      isMounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomId, userId, displayName, updateParticipantsState]);

  // Local Controls
  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;

    try {
      const nextState = !isMicMuted;
      await room.localParticipant.setMicrophoneEnabled(!nextState);
      setIsMicMuted(nextState);
      updateParticipantsState();
    } catch (e) {
      console.error("Failed to toggle microphone:", e);
    }
  }, [isMicMuted, updateParticipantsState]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;

    try {
      const nextState = !isCameraOff;
      await room.localParticipant.setCameraEnabled(!nextState);
      setIsCameraOff(nextState);
      updateParticipantsState();
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  }, [isCameraOff, updateParticipantsState]);

  return {
    room: roomRef.current,
    participants,
    isMicMuted,
    isCameraOff,
    isConnecting,
    isConnected,
    error,
    toggleMicrophone,
    toggleCamera,
  };
}
