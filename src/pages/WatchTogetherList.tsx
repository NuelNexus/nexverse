import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, Loader2, Search, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchAnime, type AnimeData } from "@/lib/jikan";
import { toast } from "sonner";

const WatchTogetherList = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AnimeData[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeData | null>(null);
  const [episode, setEpisode] = useState(1);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadRooms();
  }, []);

  const loadRooms = async () => {
    const { data } = await supabase
      .from("watch_rooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setRooms(data || []);
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchAnime(searchQuery);
      setSearchResults(res.data.slice(0, 6));
    } catch { /* */ }
    setSearching(false);
  };

  const createRoom = async () => {
    if (!user) { toast.error("Sign in to create a room"); return; }
    if (!selectedAnime) return;

    const { data, error } = await supabase.from("watch_rooms").insert({
      created_by: user.id,
      anime_mal_id: selectedAnime.mal_id,
      anime_title: selectedAnime.title_english || selectedAnime.title,
      anime_image: selectedAnime.images?.webp?.image_url || selectedAnime.images?.jpg?.image_url,
      episode,
    }).select().single();

    if (error) { toast.error("Failed to create room"); return; }
    navigate(`/watch-together/${data.id}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tv className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Watch Together</h1>
              <p className="text-sm text-muted-foreground">Join a room or create one to watch anime with friends</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Room
          </button>
        </div>

        {/* Create room form */}
        {showCreate && (
          <div className="glass rounded-xl p-5 mb-6 space-y-4">
            <h3 className="font-semibold text-foreground">Create Watch Room</h3>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search anime..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </form>

            {searchResults.length > 0 && !selectedAnime && (
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {searchResults.map((a) => (
                  <button
                    key={a.mal_id}
                    onClick={() => { setSelectedAnime(a); setSearchResults([]); }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-left"
                  >
                    <img src={a.images.webp.image_url} alt="" className="w-8 h-12 rounded object-cover" />
                    <span className="text-sm text-foreground truncate">{a.title_english || a.title}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedAnime && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <img src={selectedAnime.images.webp.image_url} alt="" className="w-10 h-14 rounded object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{selectedAnime.title_english || selectedAnime.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="text-xs text-muted-foreground">Episode:</label>
                    <input
                      type="number"
                      min={1}
                      max={selectedAnime.episodes || 9999}
                      value={episode}
                      onChange={(e) => setEpisode(Number(e.target.value))}
                      className="w-16 h-7 px-2 rounded bg-background text-foreground text-xs border border-border"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnime(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Change
                </button>
              </div>
            )}

            {selectedAnime && (
              <button
                onClick={createRoom}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
              >
                Create Room
              </button>
            )}
          </div>
        )}

        {/* Room list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No active rooms. Create one to start watching!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room) => (
              <Link
                key={room.id}
                to={`/watch-together/${room.id}`}
                className="glass rounded-lg p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors"
              >
                {room.anime_image && (
                  <img src={room.anime_image} alt="" className="w-12 h-16 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{room.anime_title}</p>
                  <p className="text-xs text-muted-foreground">Episode {room.episode}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Users className="w-3.5 h-3.5" />
                  Live
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchTogetherList;
