
-- Daily anime debates
CREATE TABLE public.anime_debates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_a_image TEXT,
  option_b_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 day')
);

ALTER TABLE public.anime_debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view debates" ON public.anime_debates FOR SELECT USING (true);

-- Debate votes
CREATE TABLE public.anime_debate_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES public.anime_debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('a', 'b')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(debate_id, user_id)
);

ALTER TABLE public.anime_debate_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view debate votes" ON public.anime_debate_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can vote on debates" ON public.anime_debate_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debate vote" ON public.anime_debate_votes FOR UPDATE USING (auth.uid() = user_id);

-- Watch together rooms
CREATE TABLE public.watch_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  anime_mal_id INTEGER NOT NULL,
  anime_title TEXT NOT NULL,
  anime_image TEXT,
  episode INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rooms" ON public.watch_rooms FOR SELECT USING (is_active = true);
CREATE POLICY "Auth users can create rooms" ON public.watch_rooms FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update rooms" ON public.watch_rooms FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete rooms" ON public.watch_rooms FOR DELETE USING (auth.uid() = created_by);

-- Watch room messages (chat during watch)
CREATE TABLE public.watch_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.watch_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room messages" ON public.watch_room_messages FOR SELECT USING (true);
CREATE POLICY "Auth users can send room messages" ON public.watch_room_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for watch rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_rooms;
