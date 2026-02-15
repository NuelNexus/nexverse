import { useEffect, useState } from "react";
import { getTopAnime, getSeasonNow, type AnimeData } from "@/lib/jikan";
import HeroBanner from "@/components/HeroBanner";
import AnimeSection from "@/components/AnimeSection";

const Index = () => {
  const [hero, setHero] = useState<AnimeData | null>(null);
  const [trending, setTrending] = useState<AnimeData[]>([]);
  const [popular, setPopular] = useState<AnimeData[]>([]);
  const [seasonal, setSeasonal] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [trendRes, popRes, seasonRes] = await Promise.all([
          getTopAnime(1, "airing"),
          getTopAnime(1, "bypopularity"),
          getSeasonNow(1),
        ]);

        setTrending(trendRes.data);
        setPopular(popRes.data);
        setSeasonal(seasonRes.data);

        if (trendRes.data.length > 0) {
          setHero(trendRes.data[0]);
        }
      } catch (e) {
        console.error("Failed to load anime data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <HeroBanner anime={hero} />

      <div className="-mt-10 relative z-10">
        <AnimeSection
          title="Trending Now"
          subtitle="Currently airing top-rated shows"
          anime={trending}
          loading={loading}
        />
        <AnimeSection
          title="This Season"
          subtitle="New releases this season"
          anime={seasonal}
          loading={loading}
        />
        <AnimeSection
          title="Most Popular"
          subtitle="All-time fan favorites"
          anime={popular}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Index;
