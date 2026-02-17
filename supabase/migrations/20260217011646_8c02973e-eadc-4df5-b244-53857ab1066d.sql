
CREATE TABLE public.manga_reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  manga_id TEXT NOT NULL,
  manga_title TEXT NOT NULL,
  manga_cover_url TEXT,
  chapter_id TEXT NOT NULL,
  chapter_number TEXT,
  page_number INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, manga_id)
);

ALTER TABLE public.manga_reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading progress" ON public.manga_reading_progress
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress" ON public.manga_reading_progress
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress" ON public.manga_reading_progress
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress" ON public.manga_reading_progress
FOR DELETE USING (auth.uid() = user_id);
