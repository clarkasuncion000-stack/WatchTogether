-- Supabase SQL Migration for Watch Together

CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  host_id TEXT NOT NULL,
  youtube_video_id TEXT DEFAULT 'dQw4w9WgXcQ' NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for guest sessions
CREATE POLICY "Allow public read access to rooms"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to rooms"
  ON public.rooms FOR UPDATE
  USING (true);
