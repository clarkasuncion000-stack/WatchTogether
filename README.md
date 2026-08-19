# Watch Together — Synced Video + Webcam Chat

A room-based web application where multiple users can watch YouTube videos in sync (play, pause, seek mirrored across all participants) while video chatting via LiveKit and text chatting in real time via Socket.IO.

## Monorepo Layout

- `/web`: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `/server`: Express + Socket.IO + LiveKit Server SDK

## Environment Setup

### 1. Web Environment Variables (`/web/.env.local`)
Copy `/web/.env.example` to `/web/.env.local` and set:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
```

### 2. Server Environment Variables (`/server/.env`)
Copy `/server/.env.example` to `/server/.env` and set:
```env
PORT=4000
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Quick Start (Development)

1. **Install All Dependencies**:
   ```bash
   npm run install:all
   ```

2. **Start the Express + Socket.IO Server**:
   ```bash
   npm run dev:server
   ```
   Server runs at: `http://localhost:4000`

3. **Start the Next.js Frontend**:
   ```bash
   npm run dev:web
   ```
   Frontend runs at: `http://localhost:3000`

## Features & Tech Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Realtime Sync**: Socket.IO client & server relaying video player state (play, pause, seek)
- **Webcam & Audio**: LiveKit WebRTC SDK (`livekit-client`, `@livekit/components-react`, `livekit-server-sdk`)
- **Shared Video**: YouTube IFrame API
- **Database & Auth**: Supabase Postgres (Guest Sessions)
