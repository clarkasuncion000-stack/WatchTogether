"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, Users, Sparkles } from "lucide-react";
import { ChatMessage, useRoomChat } from "@/hooks/useRoomChat";
import { Socket } from "socket.io-client";

interface RoomChatSidebarProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  displayName: string;
}

export function RoomChatSidebar({ socket, roomId, userId, displayName }: RoomChatSidebarProps) {
  const { messages, onlineCount, sendMessage } = useRoomChat({ socket, roomId, userId });
  const [inputText, setInputText] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText);
    setInputText("");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-800/80 bg-slate-900/40 p-4 flex flex-col justify-between h-full min-h-[350px]">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          Room Chat
        </span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-xs text-slate-300 font-medium">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{onlineCount} Online</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 my-3 space-y-3 overflow-y-auto pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-500">
            <Sparkles className="w-6 h-6 text-indigo-500/40" />
            <p className="text-xs">No messages yet. Say hi to the party!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isLocal = msg.senderId === userId;
            const isSystem = msg.system || msg.senderId === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-300 backdrop-blur-md">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1 ${isLocal ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500 font-medium">
                  <span>{isLocal ? "You" : msg.senderName}</span>
                  <span>•</span>
                  <span>{formatTime(msg.timestamp)}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs font-normal leading-relaxed shadow-md ${
                    isLocal
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md transition active:scale-95 shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
