import { Link } from "react-router-dom";
import { Play, Star } from "lucide-react";
import type { AnimeData } from "@/lib/jikan";

interface HeroBannerProps {
  anime: AnimeData | null;
}

const HeroBanner = ({ anime }: HeroBannerProps) => {
  if (!anime) {
    return (
      <div className="relative w-full h-[70vh] min-h-[500px] bg-secondary animate-pulse" />
    );
  }

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      <img
        src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
        alt={anime.title}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />

      <div className="relative container h-full flex items-end pb-16 md:pb-20">
        <div className="max-w-xl animate-fade-up">
          <div className="flex items-center gap-3 mb-3">
            {anime.score && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 text-primary text-sm font-semibold">
                <Star className="w-3.5 h-3.5 fill-primary" />
                {anime.score.toFixed(1)}
              </div>
            )}
            {anime.type && (
              <span className="px-2 py-1 rounded-md bg-secondary/60 text-secondary-foreground text-xs font-medium backdrop-blur-sm">
                {anime.type}
              </span>
            )}
            {anime.episodes && (
              <span className="text-xs text-muted-foreground">{anime.episodes} Episodes</span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight">
            {anime.title_english || anime.title}
          </h1>

          {anime.synopsis && (
            <p className="mt-3 text-sm md:text-base text-muted-foreground line-clamp-3 leading-relaxed">
              {anime.synopsis}
            </p>
          )}

          <div className="flex items-center gap-3 mt-6">
            <Link
              to={`/anime/${anime.mal_id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity glow-primary"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </Link>
            <Link
              to={`/anime/${anime.mal_id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
            >
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
