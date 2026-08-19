import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase') &&
  !supabaseAnonKey.includes('your-supabase') &&
  !supabaseUrl.includes('PASTE_YOUR')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface RoomData {
  id: string;
  created_at: string;
  host_id: string;
  youtube_video_id: string;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export async function createRoom(hostId: string, initialVideoId: string = 'dQw4w9WgXcQ'): Promise<RoomData> {
  const roomId = generateRoomCode();
  const roomData: RoomData = {
    id: roomId,
    created_at: new Date().toISOString(),
    host_id: hostId,
    youtube_video_id: initialVideoId,
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          host_id: hostId,
          youtube_video_id: initialVideoId,
        })
        .select()
        .single();

      if (!error && data) {
        return data as RoomData;
      }
      console.warn("Supabase insert error, falling back to server:", error?.message);
    } catch (e) {
      console.warn("Supabase exception, falling back to server:", e);
    }
  }

  // 2. Try Express backend server
  try {
    const res = await fetch(`${SERVER_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, hostId, youtubeVideoId: initialVideoId }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Server room creation failed, using local room state:", e);
  }

  // 3. Ultimate Fallback: Instant Client-side Room Generation
  return roomData;
}

export async function getRoom(roomId: string): Promise<RoomData | null> {
  const cleanId = roomId.toUpperCase().trim();
  if (!cleanId) return null;

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
        return data as RoomData;
      }
    } catch (e) {
      console.warn("Supabase query exception, falling back to server:", e);
    }
  }

  // 2. Try Express backend server
  try {
    const res = await fetch(`${SERVER_URL}/api/rooms/${cleanId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Server room fetch failed, using local room state:", e);
  }

  // 3. Ultimate Fallback: Allow joining any room code with default state
  return {
    id: cleanId,
    created_at: new Date().toISOString(),
    host_id: 'usr_guest',
    youtube_video_id: 'dQw4w9WgXcQ',
  };
}

export async function updateRoomVideo(roomId: string, youtubeVideoId: string): Promise<boolean> {
  const cleanId = roomId.toUpperCase().trim();

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ youtube_video_id: youtubeVideoId })
        .eq('id', cleanId);

      if (!error) return true;
    } catch (e) {
      console.warn("Supabase update error:", e);
    }
  }

  try {
    const res = await fetch(`${SERVER_URL}/api/rooms/${cleanId}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeVideoId }),
    });
    return res.ok;
  } catch (e) {
    console.warn("Server room video update failed:", e);
    return false;
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
