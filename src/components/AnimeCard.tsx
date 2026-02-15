import { Link } from "react-router-dom";
import type { AnimeData } from "@/lib/jikan";

interface AnimeCardProps {
  anime: AnimeData;
  index?: number;
}

const AnimeCard = ({ anime, index = 0 }: AnimeCardProps) => {
  return (
    <Link
      to={`/anime/${anime.mal_id}`}
      className="group relative flex flex-col animate-fade-up"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
        <img
          src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {anime.score && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-xs font-bold">
            {anime.score.toFixed(1)}
          </div>
        )}

        {anime.type && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground text-xs font-medium backdrop-blur-sm">
            {anime.type}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {anime.episodes && (
            <p className="text-xs text-muted-foreground">{anime.episodes} Episodes</p>
          )}
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {anime.title_english || anime.title}
        </h3>
        {anime.genres?.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {anime.genres.map((g) => g.name).join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
};

export default AnimeCard;
