import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { getAnimeById, type AnimeData } from "@/lib/jikan";
import { supabase } from "@/integrations/supabase/client";
import CommentSection from "@/components/CommentSection";

const EMBED_SOURCES = [
  { name: "Server 1", getUrl: (title: string, ep: number) => `https://2anime.xyz/embed/${slugify(title)}-episode-${ep}` },
  { name: "Server 2", getUrl: (title: string, ep: number) => `https://embtaku.pro/streaming.php?id=${slugify(title)}-episode-${ep}` },
];

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const WatchAnime = () => {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const [anime, setAnime] = useState<AnimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    getAnimeById(Number(id))
      .then((res) => setAnime(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Track watch history
  useEffect(() => {
    if (!anime || !episode) return;
    const track = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("watch_history").upsert({
        user_id: user.id,
        anime_mal_id: anime.mal_id,
        anime_title: anime.title_english || anime.title,
        anime_image: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
        episode_number: Number(episode),
      }, { onConflict: "user_id,anime_mal_id,episode_number" });
    };
    track();
  }, [anime, episode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const title = anime ? (anime.title_english || anime.title) : "Anime";
  const totalEps = anime?.episodes || 12;
  const epNum = Number(episode);
  const embedUrl = anime ? EMBED_SOURCES[sourceIndex].getUrl(title, epNum) : "";

  const downloadSearchUrl = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(title + ` ${episode}`)}`;
  const bulkDownloadUrl = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(title)}`;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-5xl">
        <Link
          to={`/anime/${id}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {title}
        </Link>

        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          {title} - Episode {episode}
        </h1>

        {/* Server selector */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Source:</span>
          {EMBED_SOURCES.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setSourceIndex(i)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                i === sourceIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Video player */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary mb-4">
          <iframe
            src={embedUrl}
            title={`${title} Episode ${episode}`}
            allowFullScreen
            allow="autoplay; fullscreen"
            className="absolute inset-0 w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>

        {/* Download links */}
        <div className="flex flex-wrap gap-2 mb-6">
          <a
            href={downloadSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
          >
            <Download className="w-4 h-4" /> Download Episode {episode}
          </a>
          <a
            href={bulkDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
          >
            <Download className="w-4 h-4" /> Bulk Download
          </a>
          <a
            href={`https://myanimelist.net/anime/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> MAL
          </a>
        </div>

        {/* Episode selector */}
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Episodes</h2>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 mb-8">
          {Array.from({ length: totalEps }, (_, i) => i + 1).map((ep) => (
            <Link
              key={ep}
              to={`/watch/${id}/${ep}`}
              className={`h-10 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                epNum === ep
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {ep}
            </Link>
          ))}
        </div>

        <CommentSection contentType="anime" contentId={id!} />
      </div>
    </div>
  );
};

export default WatchAnime;
