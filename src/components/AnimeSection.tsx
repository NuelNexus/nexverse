import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AnimeData } from "@/lib/jikan";
import AnimeCard from "./AnimeCard";

interface AnimeSectionProps {
  title: string;
  subtitle?: string;
  anime: AnimeData[];
  loading?: boolean;
}

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-[160px] md:w-[185px]">
    <div className="aspect-[3/4] rounded-lg bg-secondary animate-pulse" />
    <div className="mt-2 h-4 bg-secondary rounded w-3/4 animate-pulse" />
    <div className="mt-1 h-3 bg-secondary rounded w-1/2 animate-pulse" />
  </div>
);

const AnimeSection = ({ title, subtitle, anime, loading }: AnimeSectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="py-6">
      <div className="container">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-display font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-[max(1rem,calc((100vw-1400px)/2+1rem))]"
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : anime.map((a, i) => (
              <div key={a.mal_id} className="flex-shrink-0 w-[160px] md:w-[185px]">
                <AnimeCard anime={a} index={i} />
              </div>
            ))}
      </div>
    </section>
  );
};

export default AnimeSection;
