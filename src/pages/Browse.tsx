import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { searchAnime, getTopAnime, type AnimeData } from "@/lib/jikan";
import { supabase } from "@/integrations/supabase/client";
import AnimeCard from "@/components/AnimeCard";
import { toast } from "sonner";

async function aiAnimeSearch(description: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-anime", {
      body: { action: "search", description },
    });
    if (error) throw error;
    return data?.titles || [];
  } catch (e: any) {
    console.error("AI search error:", e);
    toast.error(e?.message || "AI search failed");
    return [];
  }
}

const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const performSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = q.trim() ? await searchAnime(q) : await getTopAnime(1);
      setResults(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const performAiSearch = useCallback(async (description: string) => {
    if (!description.trim()) return;
    setAiLoading(true);
    setLoading(true);
    try {
      const titles = await aiAnimeSearch(description);
      if (titles.length === 0) {
        setResults([]);
        return;
      }
      const allResults: AnimeData[] = [];
      const seen = new Set<number>();
      for (const title of titles.slice(0, 6)) {
        try {
          const res = await searchAnime(title);
          for (const anime of res.data.slice(0, 3)) {
            if (!seen.has(anime.mal_id)) {
              seen.add(anime.mal_id);
              allResults.push(anime);
            }
          }
        } catch { /* skip */ }
      }
      setResults(allResults);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(query);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
    if (aiMode) {
      performAiSearch(query);
    } else {
      performSearch(query);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Browse Anime</h1>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setAiMode(false)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              !aiMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Search className="w-3.5 h-3.5 inline mr-1.5" />
            Title Search
          </button>
          <button
            onClick={() => setAiMode(true)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              aiMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
            AI Search
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative max-w-xl">
            {aiMode ? (
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={aiMode ? "Describe what you want... e.g. 'overpowered hero in a magic school'" : "Search anime by title..."}
              className="w-full h-12 pl-11 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>
          {aiMode && (
            <p className="text-xs text-muted-foreground mt-2 ml-1">
              Powered by Gemini 2.5 — describe a mood, plot, or genre and get personalized recommendations
            </p>
          )}
        </form>

        {(loading || aiLoading) ? (
          <div>
            {aiLoading && (
              <div className="flex items-center gap-2 mb-4 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is finding anime matching your description...
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[3/4] rounded-lg bg-secondary animate-pulse" />
                  <div className="mt-2 h-4 bg-secondary rounded w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((a, i) => (
              <AnimeCard key={a.mal_id} anime={a} index={i} />
            ))}
          </div>
        )}

        {!loading && !aiLoading && results.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No results found. Try a different search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
