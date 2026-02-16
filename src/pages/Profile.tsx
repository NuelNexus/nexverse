import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Edit3, Save, Film, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      const { data: history } = await supabase.from("watch_history")
        .select("*")
        .eq("user_id", user.id)
        .order("watched_at", { ascending: false })
        .limit(20);
      setWatchHistory(history || []);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const uniqueAnime = new Set(watchHistory.map((w) => w.anime_mal_id)).size;
  const totalEps = watchHistory.length;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-3xl">
        {/* Profile header */}
        <div className="glass rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
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

        {/* Watch history */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Recent Watch History</h2>
        {watchHistory.length === 0 ? (
          <p className="text-muted-foreground text-sm">No watch history yet.</p>
        ) : (
          <div className="grid gap-2">
            {watchHistory.map((w) => (
              <div key={w.id} className="glass rounded-lg p-3 flex items-center gap-3">
                {w.anime_image && (
                  <img src={w.anime_image} alt="" className="w-12 h-16 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{w.anime_title}</p>
                  <p className="text-xs text-muted-foreground">
                    Episode {w.episode_number} • {new Date(w.watched_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
