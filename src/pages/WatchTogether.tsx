import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAnimeById, type AnimeData } from "@/lib/jikan";
import { getAniListId } from "@/lib/anilist";
import { toast } from "sonner";

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const EMBED_SOURCES = [
  { name: "VidSrc", getUrl: (anilistId: number | null, ep: number) => anilistId ? `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/0` : null },
  { name: "AutoEmbed", getUrl: (_: any, ep: number, title: string) => `https://anime.autoembed.cc/embed/${slugify(title)}-episode-${ep}` },
];

interface RoomMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  username?: string;
}

const WatchTogether = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [anime, setAnime] = useState<AnimeData | null>(null);
  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sourceIndex, setSourceIndex] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const { data: roomData } = await supabase
        .from("watch_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!roomData) { navigate("/watch-together"); return; }
      setRoom(roomData);

      const [animeRes, alId] = await Promise.all([
        getAnimeById(roomData.anime_mal_id),
        getAniListId(roomData.anime_mal_id),
      ]);
      setAnime(animeRes.data);
      setAnilistId(alId);

      // Load messages
      const { data: msgs } = await supabase
        .from("watch_room_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (msgs) {
        // Fetch usernames
        const userIds = [...new Set(msgs.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.username]));
        setMessages(msgs.map(m => ({ ...m, username: profileMap[m.user_id] || "User" })));
      }

      setLoading(false);
    };
    load();
  }, [roomId]);

  // Realtime messages
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "watch_room_messages",
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const msg = payload.new as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", msg.user_id)
          .single();
        setMessages(prev => [...prev, { ...msg, username: profile?.username || "User" }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || !roomId) return;
    await supabase.from("watch_room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      body: newMsg.trim(),
    });
    setNewMsg("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const title = anime ? (anime.title_english || anime.title) : room?.anime_title || "Anime";
  const ep = room?.episode || 1;

  const availableSources = EMBED_SOURCES.filter(s => s.getUrl(anilistId, ep, title) !== null);
  const currentSource = availableSources[sourceIndex] || availableSources[0];
  const embedUrl = currentSource ? currentSource.getUrl(anilistId, ep, title) || "" : "";

  return (
    <div className="fixed inset-0 top-16 flex flex-col lg:flex-row bg-background">
      {/* Video area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-3 flex items-center gap-3 border-b border-border">
          <Link to="/watch-together" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{title} - Episode {ep}</h1>
            <p className="text-xs text-muted-foreground">Watch Together Room</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {availableSources.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setSourceIndex(i)}
                className={`px-2 py-1 text-xs rounded-md ${
                  i === sourceIndex ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-black">
          <iframe
            src={embedUrl}
            title={title}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media"
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="w-full lg:w-80 flex flex-col border-l border-border h-64 lg:h-auto">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Chat</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.user_id === user?.id ? "items-end" : "items-start"}`}>
              <span className="text-xs text-muted-foreground mb-0.5">{m.username}</span>
              <div className={`px-3 py-1.5 rounded-2xl text-sm max-w-[80%] ${
                m.user_id === user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {m.body}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="p-3 border-t border-border flex gap-2"
        >
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder={user ? "Type a message..." : "Sign in to chat"}
            disabled={!user}
            className="flex-1 h-9 px-3 rounded-full bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!user || !newMsg.trim()}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default WatchTogether;
