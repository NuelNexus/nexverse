import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Edit3, Save, Film, Clock, Play, Trophy, BookOpen, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RANKS = [
  { min: 0, label: "Newbie", color: "text-muted-foreground" },
  { min: 5, label: "Casual", color: "text-secondary-foreground" },
  { min: 20, label: "Enthusiast", color: "text-primary" },
  { min: 50, label: "Otaku", color: "text-primary" },
  { min: 100, label: "Weeb Lord", color: "text-accent" },
  { min: 200, label: "Anime Sage", color: "text-accent" },
  { min: 500, label: "Legendary", color: "text-destructive" },
];

function getRank(animeCount: number) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (animeCount >= r.min) rank = r;
  }
  return rank;
}

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [mangaProgress, setMangaProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoplay, setAutoplay] = useState(() => {
    return localStorage.getItem("nexus-autoplay") === "true";
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) {
        setProfile(prof);
        setUsername(prof.username);
        setBio(prof.bio || "");
        setAvatarUrl(prof.avatar_url || "");
      }

      const [historyRes, mangaRes] = await Promise.all([
        supabase.from("watch_history")
          .select("*")
          .eq("user_id", user.id)
          .order("watched_at", { ascending: false })
          .limit(20),
        supabase.from("manga_reading_progress")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

      setWatchHistory(historyRes.data || []);
      setMangaProgress(mangaRes.data || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      username: username.trim(),
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    }).eq("id", user.id);

    if (error) { toast.error("Failed to update profile"); return; }
    toast.success("Profile updated!");
    setEditing(false);
    setProfile({ ...profile, username, bio, avatar_url: avatarUrl });
  };

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    localStorage.setItem("nexus-autoplay", String(next));
    toast.success(next ? "Autoplay enabled" : "Autoplay disabled");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const uniqueAnime = new Set(watchHistory.map((w) => w.anime_mal_id)).size;
  const totalEps = watchHistory.length;
  const rank = getRank(uniqueAnime);

  // Get the most recent episode per anime for "continue watching"
  const continueWatching: Record<number, any> = {};
  watchHistory.forEach((w) => {
    if (!continueWatching[w.anime_mal_id]) {
      continueWatching[w.anime_mal_id] = w;
    }
  });
  const continueList = Object.values(continueWatching).slice(0, 6);

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-3xl">
        {/* Profile header */}
        <div className="glass rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/30">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Username</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Avatar URL</label>
                    <input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-9 px-3 rounded-md bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                      <Save className="w-3 h-3" /> Save
                    </button>
                    <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-display font-bold text-foreground">{profile?.username}</h1>
                    <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Rank badge */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Trophy className={`w-4 h-4 ${rank.color}`} />
                    <span className={`text-sm font-semibold ${rank.color}`}>{rank.label}</span>
                  </div>
                  {profile?.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Film className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{uniqueAnime}</span>
                      <span className="text-muted-foreground">anime</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{totalEps}</span>
                      <span className="text-muted-foreground">episodes</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="glass rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Autoplay next episode</span>
            </div>
            <button onClick={toggleAutoplay} className="text-primary">
              {autoplay ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Continue Watching */}
        {continueList.length > 0 && (
          <>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">Continue Watching</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {continueList.map((w) => (
                <Link
                  key={w.anime_mal_id}
                  to={`/watch/${w.anime_mal_id}/${(w.episode_number || 0) + 1}`}
                  className="glass rounded-lg overflow-hidden group hover:ring-1 hover:ring-primary/30 transition-all"
                >
                  {w.anime_image && (
                    <div className="relative aspect-video overflow-hidden">
                      <img src={w.anime_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-sm font-medium text-foreground truncate">{w.anime_title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Continue Ep. {(w.episode_number || 0) + 1}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Continue Reading Manga */}
        {mangaProgress.length > 0 && (
          <>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">Continue Reading</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {mangaProgress.map((m) => (
                <Link
                  key={m.id}
                  to={`/manga/${m.manga_id}/read/${m.chapter_id}`}
                  className="glass rounded-lg overflow-hidden group hover:ring-1 hover:ring-primary/30 transition-all"
                >
                  {m.manga_cover_url && (
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img src={m.manga_cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <BookOpen className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-sm font-medium text-foreground truncate">{m.manga_title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ch. {m.chapter_number || "?"} • Page {m.page_number}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Watch history */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Recent Watch History</h2>
        {watchHistory.length === 0 ? (
          <p className="text-muted-foreground text-sm">No watch history yet.</p>
        ) : (
          <div className="grid gap-2">
            {watchHistory.map((w) => (
              <Link key={w.id} to={`/watch/${w.anime_mal_id}/${w.episode_number}`} className="glass rounded-lg p-3 flex items-center gap-3 hover:ring-1 hover:ring-primary/20 transition-all">
                {w.anime_image && (
                  <img src={w.anime_image} alt="" className="w-12 h-16 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{w.anime_title}</p>
                  <p className="text-xs text-muted-foreground">
                    Episode {w.episode_number} • {new Date(w.watched_at).toLocaleDateString()}
                  </p>
                </div>
                <Play className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
