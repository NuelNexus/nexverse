import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { searchManga, getPopularManga, type MangaData, mangaUtils } from "@/lib/mangadex";
import MangaCard from "@/components/MangaCard";

const MangaBrowse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<MangaData[]>([]);
  const [loading, setLoading] = useState(true);

  const performSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = q.trim() ? await searchManga(q) : await getPopularManga();
      setResults(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(query);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
    performSearch(query);
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Browse Manga</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search manga..."
              className="w-full h-12 pl-11 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>
        </form>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] rounded-lg bg-secondary animate-pulse" />
                <div className="mt-2 h-4 bg-secondary rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((m, i) => (
              <MangaCard key={m.id} manga={m} index={i} />
            ))}
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No manga found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MangaBrowse;
