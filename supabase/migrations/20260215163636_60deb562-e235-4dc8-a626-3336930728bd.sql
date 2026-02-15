
-- Fix: Recreate leaderboard view with SECURITY INVOKER (default, safe)
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard 
WITH (security_invoker = true)
AS
SELECT 
  wh.user_id,
  p.username,
  p.avatar_url,
  COUNT(DISTINCT wh.anime_mal_id) AS anime_count,
  COUNT(*) AS total_episodes
FROM public.watch_history wh
JOIN public.profiles p ON p.id = wh.user_id
GROUP BY wh.user_id, p.username, p.avatar_url
ORDER BY anime_count DESC, total_episodes DESC;

-- The leaderboard needs watch_history to be publicly readable for the view
CREATE POLICY "Anyone can view watch history for leaderboard" ON public.watch_history FOR SELECT USING (true);
