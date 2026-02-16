import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Vote, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchAnime, type AnimeData } from "@/lib/jikan";
import { toast } from "sonner";

interface VoteTally {
  anime_mal_id: number;
  anime_title: string;
  anime_image: string | null;
  vote_count: number;
}

const AnimeVoting = () => {
  const [user, setUser] = useState<any>(null);
  const [results, setResults] = useState<VoteTally[]>([]);
  const [myVote, setMyVote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AnimeData[]>([]);
  const [searching, setSearching] = useState(false);

  const weekStart = getWeekStart();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadVotes();
  }, []);

  const loadVotes = async () => {
    // Get all votes for this week
    const { data } = await supabase
      .from("anime_votes")
      .select("*")
      .eq("week_start", weekStart);

    if (data) {
      // Tally votes
      const tally: Record<number, VoteTally> = {};
      data.forEach((v: any) => {
        if (!tally[v.anime_mal_id]) {
          tally[v.anime_mal_id] = {
            anime_mal_id: v.anime_mal_id,
            anime_title: v.anime_title,
            anime_image: v.anime_image,
            vote_count: 0,
          };
        }
        tally[v.anime_mal_id].vote_count++;
      });
      setResults(Object.values(tally).sort((a, b) => b.vote_count - a.vote_count));
    }

    // Check user's vote
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: vote } = await supabase
        .from("anime_votes")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      setMyVote(vote);
    }

    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchAnime(searchQuery);
      setSearchResults(res.data.slice(0, 6));
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const handleVote = async (anime: AnimeData) => {
    if (!user) { toast.error("Sign in to vote"); return; }

    const voteData = {
      user_id: user.id,
      anime_mal_id: anime.mal_id,
      anime_title: anime.title_english || anime.title,
      anime_image: anime.images?.webp?.image_url || anime.images?.jpg?.image_url,
      week_start: weekStart,
    };

    if (myVote) {
      // Update existing vote
      const { error } = await supabase.from("anime_votes").update(voteData).eq("id", myVote.id);
      if (error) { toast.error("Failed to update vote"); return; }
    } else {
      const { error } = await supabase.from("anime_votes").insert(voteData);
      if (error) { toast.error("Failed to vote"); return; }
    }

    toast.success("Vote cast!");
    setSearchResults([]);
    setSearchQuery("");
    loadVotes();
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Anime of the Week</h1>
            <p className="text-sm text-muted-foreground">Week of {new Date(weekStart).toLocaleDateString()}</p>
          </div>
        </div>

        {/* My vote status */}
        {myVote && (
          <div className="glass rounded-lg p-3 mb-4 flex items-center gap-2 text-sm">
            <Vote className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Your vote:</span>
            <span className="text-foreground font-medium">{myVote.anime_title}</span>
            <span className="text-muted-foreground">(search below to change)</span>
          </div>
        )}

        {/* Search to vote */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime to vote for..."
              className="w-full h-12 pl-11 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="grid gap-2 mb-8">
            {searchResults.map((a) => (
              <div key={a.mal_id} className="glass rounded-lg p-3 flex items-center gap-3">
                <img src={a.images.webp.image_url} alt="" className="w-10 h-14 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title_english || a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.type} • {a.year || "?"}</p>
                </div>
                <button
                  onClick={() => handleVote(a)}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                >
                  Vote
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Current Standings</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />)}
          </div>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground text-sm">No votes yet this week. Be the first!</p>
        ) : (
          <div className="grid gap-2">
            {results.map((r, i) => (
              <Link
                key={r.anime_mal_id}
                to={`/anime/${r.anime_mal_id}`}
                className="glass rounded-lg p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                {r.anime_image && <img src={r.anime_image} alt="" className="w-10 h-14 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.anime_title}</p>
                </div>
                <span className="text-sm font-semibold text-primary">{r.vote_count} vote{r.vote_count !== 1 ? "s" : ""}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export default AnimeVoting;
