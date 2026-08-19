import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase') &&
  !supabaseAnonKey.includes('your-supabase')
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

  // Fallback to Express backend server
  const res = await fetch(`${SERVER_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, hostId, youtubeVideoId: initialVideoId }),
  });

  if (!res.ok) {
    throw new Error('Failed to create room on server');
  }

  return res.json();
}

export async function getRoom(roomId: string): Promise<RoomData | null> {
  const cleanId = roomId.toUpperCase().trim();

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

  // Fallback to Express backend server
  try {
    const res = await fetch(`${SERVER_URL}/api/rooms/${cleanId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Server room fetch failed:", e);
  }

  return null;
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

  // Fallback to Express backend server
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
