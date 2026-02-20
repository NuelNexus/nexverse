import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Calendar, Clock, Film, ArrowLeft, Play, ExternalLink } from "lucide-react";
import { getAnimeById, getAnimeRecommendations, type AnimeData } from "@/lib/jikan";
import AnimeCard from "@/components/AnimeCard";
import CommentSection from "@/components/CommentSection";

function extractYoutubeId(anime: AnimeData): string | null {
  if (anime.trailer?.youtube_id) return anime.trailer.youtube_id;
  // Jikan sometimes has youtube_id as null but embed_url contains the ID
  const embedUrl = (anime.trailer as any)?.embed_url || (anime.trailer as any)?.url;
  if (embedUrl) {
    const match = embedUrl.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }
  return null;
}

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<AnimeData | null>(null);
  const [recs, setRecs] = useState<AnimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    window.scrollTo(0, 0);

    const load = async () => {
      try {
        const [animeRes, recsRes] = await Promise.all([
          getAnimeById(Number(id)),
          getAnimeRecommendations(Number(id)).catch(() => ({ data: [] })),
        ]);
        setAnime(animeRes.data);
        setRecs(
          (recsRes.data || []).slice(0, 12).map((r: any) => r.entry)
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <div className="h-[50vh] bg-secondary animate-pulse" />
        <div className="container py-8 space-y-4">
          <div className="h-8 bg-secondary rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-secondary rounded w-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Anime not found.</p>
      </div>
    );
  }

  const youtubeId = extractYoutubeId(anime);

  const details = [
    { icon: Star, label: "Score", value: anime.score?.toFixed(1) },
    { icon: Film, label: "Episodes", value: anime.episodes },
    { icon: Calendar, label: "Year", value: anime.year },
    { icon: Clock, label: "Duration", value: anime.duration },
  ].filter((d) => d.value);

  const totalEps = anime.episodes || 12;

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img src={anime.images.webp.large_image_url} alt={anime.title} className="absolute inset-0 w-full h-full object-cover blur-sm scale-105" />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

        <div className="relative container h-full flex items-end pb-8">
          <Link to="/" className="absolute top-20 left-4 md:left-[max(1rem,calc((100vw-1400px)/2+1rem))] flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="flex gap-6 items-end">
            <img src={anime.images.webp.large_image_url} alt={anime.title} className="hidden md:block w-48 rounded-lg shadow-2xl border border-border" />
            <div className="animate-fade-up">
              <div className="flex flex-wrap gap-2 mb-3">
                {anime.genres?.map((g) => (
                  <span key={g.mal_id} className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-xs font-medium">{g.name}</span>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{anime.title_english || anime.title}</h1>
              {anime.title_japanese && <p className="text-sm text-muted-foreground mt-1">{anime.title_japanese}</p>}

              <div className="flex flex-wrap gap-4 mt-4">
                {details.map((d) => (
                  <div key={d.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <d.icon className="w-4 h-4 text-primary" />
                    <span className="text-foreground font-medium">{d.value}</span>
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>

              <Link
                to={`/watch/${id}/1`}
                className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity glow-primary"
              >
                <Play className="w-4 h-4 fill-current" /> Watch Episode 1
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {youtubeId && (
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-3">Trailer</h2>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                  title="Trailer"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">Synopsis</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{anime.synopsis || "No synopsis available."}</p>
          </div>

          {/* Episode list */}
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">Episodes</h2>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {Array.from({ length: totalEps }, (_, i) => i + 1).map((ep) => (
                <Link
                  key={ep}
                  to={`/watch/${id}/${ep}`}
                  className="h-10 rounded-md bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {ep}
                </Link>
              ))}
            </div>
          </div>

          {recs.length > 0 && (
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">Recommendations</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {recs.map((r, i) => (
                  <AnimeCard key={r.mal_id} anime={r} index={i} />
                ))}
              </div>
            </div>
          )}

          <CommentSection contentType="anime" contentId={id!} />
        </div>

        <div className="space-y-4">
          <div className="glass rounded-lg p-4 space-y-3">
            <h3 className="font-display font-semibold text-foreground text-sm">Information</h3>
            <InfoRow label="Status" value={anime.status} />
            <InfoRow label="Type" value={anime.type} />
            <InfoRow label="Source" value={anime.source} />
            <InfoRow label="Rating" value={anime.rating} />
            <InfoRow label="Studios" value={anime.studios?.map((s) => s.name).join(", ")} />
            <InfoRow label="Season" value={anime.season ? `${anime.season} ${anime.year}` : null} />
            {anime.members && <InfoRow label="Members" value={anime.members.toLocaleString()} />}
          </div>

          <a
            href={`https://myanimelist.net/anime/${anime.mal_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> View on MyAnimeList
          </a>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
};

export default AnimeDetail;
