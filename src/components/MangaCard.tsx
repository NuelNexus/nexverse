import { Link } from "react-router-dom";
import { type MangaData, mangaUtils } from "@/lib/mangadex";

interface MangaCardProps {
  manga: MangaData;
  index?: number;
}

const MangaCard = ({ manga, index = 0 }: MangaCardProps) => {
  const title = mangaUtils.getTitle(manga);
  const cover = mangaUtils.getCoverUrl(manga);
  const tags = manga.attributes.tags
    .filter((t) => t.attributes.group === "genre")
    .slice(0, 3)
    .map((t) => t.attributes.name.en || Object.values(t.attributes.name)[0]);

  return (
    <Link
      to={`/manga/${manga.id}`}
      className="group relative flex flex-col animate-fade-up"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
        <img
          src={cover}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {manga.attributes.status && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground text-xs font-medium backdrop-blur-sm capitalize">
            {manga.attributes.status}
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {tags.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {tags.join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
};

export default MangaCard;
