import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

interface RoomState {
  id: string;
  host_id: string;
  created_at: string;
  youtube_video_id: string;
}

interface VideoPlaybackState {
  youtubeVideoId: string;
  currentTime: number;
  isPlaying: boolean;
  lastUpdated: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

// Stores
const roomsStore = new Map<string, RoomState>();
const videoPlaybackStore = new Map<string, VideoPlaybackState>();
const chatMessagesStore = new Map<string, ChatMessage[]>();

// Pre-seed demo room
roomsStore.set('DEMO12', {
  id: 'DEMO12',
  host_id: 'usr_demo_host',
  created_at: new Date().toISOString(),
  youtube_video_id: 'dQw4w9WgXcQ',
});
videoPlaybackStore.set('DEMO12', {
  youtubeVideoId: 'dQw4w9WgXcQ',
  currentTime: 0,
  isPlaying: false,
  lastUpdated: Date.now(),
});
chatMessagesStore.set('DEMO12', [
  {
    id: 'msg_welcome',
    roomId: 'DEMO12',
    senderId: 'system',
    senderName: 'System Bot',
    text: 'Welcome to Room DEMO12! Realtime synced video, webcams, and chat are live.',
    timestamp: Date.now(),
    system: true,
  },
]);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'watch-together-server',
    activeRoomsCount: roomsStore.size,
    timestamp: new Date().toISOString(),
  });
});

// REST Endpoints
app.post('/api/rooms', (req, res) => {
  const { roomId, hostId, youtubeVideoId } = req.body;
  if (!roomId || !hostId) {
    return res.status(400).json({ error: 'Missing roomId or hostId' });
  }

  const cleanRoomId = roomId.toUpperCase().trim();
  const initialVideo = youtubeVideoId || 'dQw4w9WgXcQ';

  const roomData: RoomState = {
    id: cleanRoomId,
    host_id: hostId,
    created_at: new Date().toISOString(),
    youtube_video_id: initialVideo,
  };

  roomsStore.set(cleanRoomId, roomData);
  videoPlaybackStore.set(cleanRoomId, {
    youtubeVideoId: initialVideo,
    currentTime: 0,
    isPlaying: false,
    lastUpdated: Date.now(),
  });
  if (!chatMessagesStore.has(cleanRoomId)) {
    chatMessagesStore.set(cleanRoomId, [
      {
        id: `sys_init_${Date.now()}`,
        roomId: cleanRoomId,
        senderId: 'system',
        senderName: 'System Bot',
        text: `Room ${cleanRoomId} created. Share the code to invite friends!`,
        timestamp: Date.now(),
        system: true,
      },
    ]);
  }

  console.log(`[Server] Room created: ${cleanRoomId} with video ${initialVideo}`);
  return res.json(roomData);
});

app.get('/api/rooms/:roomId', (req, res) => {
  const cleanRoomId = req.params.roomId.toUpperCase().trim();
  const room = roomsStore.get(cleanRoomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  return res.json(room);
});

app.post('/api/rooms/:roomId/video', (req, res) => {
  const cleanRoomId = req.params.roomId.toUpperCase().trim();
  const { youtubeVideoId } = req.body;

  const room = roomsStore.get(cleanRoomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  room.youtube_video_id = youtubeVideoId;
  roomsStore.set(cleanRoomId, room);

  const playback = videoPlaybackStore.get(cleanRoomId) || {
    youtubeVideoId,
    currentTime: 0,
    isPlaying: false,
    lastUpdated: Date.now(),
  };
  playback.youtubeVideoId = youtubeVideoId;
  playback.currentTime = 0;
  playback.isPlaying = false;
  playback.lastUpdated = Date.now();
  videoPlaybackStore.set(cleanRoomId, playback);

  return res.json(room);
});

// LiveKit Access Token Endpoint
app.get('/api/livekit/token', async (req, res) => {
  try {
    const roomName = (req.query.room as string || '').toUpperCase().trim();
    const identity = (req.query.identity as string || '').trim();
    const name = (req.query.name as string || 'Guest').trim();

    if (!roomName || !identity) {
      return res.status(400).json({ error: 'Missing room or identity parameters' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretsecretsecretsecretsecretsecretsecret';
    const livekitUrl = process.env.LIVEKIT_URL || '';

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: '1d',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    console.log(`[LiveKit Token] Minted token for user ${name} (${identity}) in room ${roomName}`);

    return res.json({
      token,
      serverUrl: livekitUrl,
    });
  } catch (err: any) {
    console.error('[LiveKit Token Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to mint LiveKit access token' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Track socket to user metadata
interface SocketUserData {
  roomId: string;
  userId: string;
  displayName: string;
}
const socketUserMap = new Map<string, SocketUserData>();

// Socket.IO Room Video & Chat Logic
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Connected: ${socket.id}`);

  // Join Room
  socket.on('join-room', ({ roomId, userId, displayName }) => {
    const cleanRoomId = (roomId || '').toUpperCase().trim();
    socket.join(cleanRoomId);
    socketUserMap.set(socket.id, { roomId: cleanRoomId, userId, displayName });

    console.log(`[Socket.IO] User ${displayName} (${userId}) joined room ${cleanRoomId}`);

    // Send current playback state to the newly joined client
    let playback = videoPlaybackStore.get(cleanRoomId);
    if (!playback) {
      playback = {
        youtubeVideoId: 'dQw4w9WgXcQ',
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
      };
      videoPlaybackStore.set(cleanRoomId, playback);
    }

    let currentCalculatedTime = playback.currentTime;
    if (playback.isPlaying) {
      const elapsedSeconds = (Date.now() - playback.lastUpdated) / 1000;
      currentCalculatedTime += elapsedSeconds;
    }

    socket.emit('sync-state', {
      youtubeVideoId: playback.youtubeVideoId,
      currentTime: currentCalculatedTime,
      isPlaying: playback.isPlaying,
    });

    // Send chat message history
    let messages = chatMessagesStore.get(cleanRoomId);
    if (!messages) {
      messages = [];
      chatMessagesStore.set(cleanRoomId, messages);
    }
    socket.emit('chat-history', messages);

    // Broadcast system join notification
    const joinMsg: ChatMessage = {
      id: `sys_join_${socket.id}_${Date.now()}`,
      roomId: cleanRoomId,
      senderId: 'system',
      senderName: 'System',
      text: `${displayName} joined the party`,
      timestamp: Date.now(),
      system: true,
    };
    messages.push(joinMsg);
    io.in(cleanRoomId).emit('chat-message', joinMsg);
    io.in(cleanRoomId).emit('room-users-count', io.sockets.adapter.rooms.get(cleanRoomId)?.size || 1);
  });

  // Video Events Relay
  socket.on('video-play', ({ roomId, currentTime }) => {
    const cleanRoomId = (roomId || '').toUpperCase().trim();
    const playback = videoPlaybackStore.get(cleanRoomId);
    if (playback) {
      playback.isPlaying = true;
      playback.currentTime = currentTime;
      playback.lastUpdated = Date.now();
    }
    console.log(`[Sync] Room ${cleanRoomId} PLAY at ${currentTime}s`);
    socket.to(cleanRoomId).emit('video-play', { currentTime });
  });

  socket.on('video-pause', ({ roomId, currentTime }) => {
    const cleanRoomId = (roomId || '').toUpperCase().trim();
    const playback = videoPlaybackStore.get(cleanRoomId);
    if (playback) {
      playback.isPlaying = false;
      playback.currentTime = currentTime;
      playback.lastUpdated = Date.now();
    }
    console.log(`[Sync] Room ${cleanRoomId} PAUSE at ${currentTime}s`);
    socket.to(cleanRoomId).emit('video-pause', { currentTime });
  });

  socket.on('video-seek', ({ roomId, currentTime }) => {
    const cleanRoomId = (roomId || '').toUpperCase().trim();
    const playback = videoPlaybackStore.get(cleanRoomId);
    if (playback) {
      playback.currentTime = currentTime;
      playback.lastUpdated = Date.now();
    }
    console.log(`[Sync] Room ${cleanRoomId} SEEK to ${currentTime}s`);
    socket.to(cleanRoomId).emit('video-seek', { currentTime });
  });

  socket.on('video-change', ({ roomId, youtubeVideoId }) => {
    const cleanRoomId = (roomId || '').toUpperCase().trim();
    const playback = videoPlaybackStore.get(cleanRoomId) || {
      youtubeVideoId,
      currentTime: 0,
      isPlaying: false,
      lastUpdated: Date.now(),
    };
    playback.youtubeVideoId = youtubeVideoId;
    playback.currentTime = 0;
    playback.isPlaying = false;
    playback.lastUpdated = Date.now();
    videoPlaybackStore.set(cleanRoomId, playback);

    const room = roomsStore.get(cleanRoomId);
    if (room) {
      room.youtube_video_id = youtubeVideoId;
    }

    console.log(`[Sync] Room ${cleanRoomId} CHANGE VIDEO to ${youtubeVideoId}`);
    socket.to(cleanRoomId).emit('video-change', { youtubeVideoId });
  });

  // Chat Event Channel
  socket.on('chat-send-message', ({ roomId, text }) => {
    const cleanRoomId = (roomId || '').toUpperCase().trim();
    const userData = socketUserMap.get(socket.id);
    const cleanText = (text || '').trim();

    if (!cleanText || !userData) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId: cleanRoomId,
      senderId: userData.userId,
      senderName: userData.displayName,
      text: cleanText,
      timestamp: Date.now(),
    };

    let messages = chatMessagesStore.get(cleanRoomId);
    if (!messages) {
      messages = [];
      chatMessagesStore.set(cleanRoomId, messages);
    }
    messages.push(message);

    // Keep memory capped at last 100 messages
    if (messages.length > 100) {
      messages.shift();
    }

    console.log(`[Chat] Message in ${cleanRoomId} from ${userData.displayName}: "${cleanText}"`);
    io.in(cleanRoomId).emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    const userData = socketUserMap.get(socket.id);
    if (userData) {
      const { roomId, displayName } = userData;
      socketUserMap.delete(socket.id);

      const leaveMsg: ChatMessage = {
        id: `sys_leave_${socket.id}_${Date.now()}`,
        roomId,
        senderId: 'system',
        senderName: 'System',
        text: `${displayName} left the room`,
        timestamp: Date.now(),
        system: true,
      };

      const messages = chatMessagesStore.get(roomId);
      if (messages) messages.push(leaveMsg);

      io.in(roomId).emit('chat-message', leaveMsg);
      io.in(roomId).emit('room-users-count', io.sockets.adapter.rooms.get(roomId)?.size || 0);
    }
    console.log(`[Socket.IO] Disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Watch Together server listening on http://localhost:${PORT}`);
});
