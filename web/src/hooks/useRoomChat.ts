"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

interface UseRoomChatProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
}

export function useRoomChat({ socket, roomId, userId }: UseRoomChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleHistory = (history: ChatMessage[]) => {
      setMessages(history);
    };

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleUsersCount = (count: number) => {
      setOnlineCount(count);
    };

    socket.on("chat-history", handleHistory);
    socket.on("chat-message", handleMessage);
    socket.on("room-users-count", handleUsersCount);

    return () => {
      socket.off("chat-history", handleHistory);
      socket.off("chat-message", handleMessage);
      socket.off("room-users-count", handleUsersCount);
    };
  }, [socket, roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !socket || !roomId) return;

      socket.emit("chat-send-message", {
        roomId,
        text: trimmed,
      });
    },
    [socket, roomId]
  );

  return {
    messages,
    onlineCount,
    sendMessage,
  };
}
