import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Film, Tv } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  anime_count: number;
  total_episodes: number;
}

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .limit(50);
      if (!error && data) {
        setEntries(data as LeaderboardEntry[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const getMedal = (i: number) => {
    if (i === 0) return "text-yellow-400";
    if (i === 1) return "text-gray-400";
    if (i === 2) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold text-foreground">Leaderboard</h1>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No watch data yet. Start watching anime to appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div
                key={entry.user_id}
                className="flex items-center gap-4 p-4 rounded-lg glass animate-fade-up"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              >
                <span className={`text-2xl font-display font-bold w-8 text-center ${getMedal(i)}`}>
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-sm">{entry.username?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{entry.username}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Tv className="w-4 h-4 text-primary" />
                    <span className="text-foreground font-medium">{entry.anime_count}</span> anime
                  </div>
                  <div className="flex items-center gap-1">
                    <Film className="w-4 h-4 text-accent" />
                    <span className="text-foreground font-medium">{entry.total_episodes}</span> eps
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
