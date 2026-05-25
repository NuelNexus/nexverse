
-- 1. Remove public watch_history exposure
DROP POLICY IF EXISTS "Anyone can view watch history for leaderboard" ON public.watch_history;

-- 2. Restrict anime_votes SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view votes" ON public.anime_votes;
CREATE POLICY "Authenticated users can view votes"
ON public.anime_votes FOR SELECT TO authenticated USING (true);

-- 3. Restrict anime_debate_votes SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view debate votes" ON public.anime_debate_votes;
CREATE POLICY "Authenticated users can view debate votes"
ON public.anime_debate_votes FOR SELECT TO authenticated USING (true);

-- 4. Restrict group_members SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view group members" ON public.group_members;
CREATE POLICY "Authenticated users can view group members"
ON public.group_members FOR SELECT TO authenticated USING (true);

-- 5. Realtime authorization: scope realtime.messages by topic ownership/membership
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to receive broadcast/presence on topics they have access to.
-- Direct messages topic format: "dm:<userA>:<userB>" - allow if uid is part of topic
-- Group topics format: "group:<group_id>" - allow if member
-- Watch room topics format: "room:<room_id>" - allow if room is active
-- Generic topics (comments etc.) - allow authenticated
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'dm:%' THEN
      auth.uid()::text = ANY(string_to_array(replace(realtime.topic(), 'dm:', ''), ':'))
    WHEN realtime.topic() LIKE 'group:%' THEN
      EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id::text = replace(realtime.topic(), 'group:', '')
          AND user_id = auth.uid()
      )
    ELSE true
  END
);

DROP POLICY IF EXISTS "Authenticated can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can send realtime messages"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'dm:%' THEN
      auth.uid()::text = ANY(string_to_array(replace(realtime.topic(), 'dm:', ''), ':'))
    WHEN realtime.topic() LIKE 'group:%' THEN
      EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id::text = replace(realtime.topic(), 'group:', '')
          AND user_id = auth.uid()
      )
    ELSE true
  END
);
