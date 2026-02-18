import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Loader2, Play } from "lucide-react";
import { getAnimeById, type AnimeData } from "@/lib/jikan";
import { getAniListId } from "@/lib/anilist";
import { supabase } from "@/integrations/supabase/client";
import CommentSection from "@/components/CommentSection";

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface EmbedSource {
  name: string;
  getUrl: (ctx: { title: string; ep: number; malId: number; anilistId: number | null }) => string | null;
}

const EMBED_SOURCES: EmbedSource[] = [
  {
    name: "VidSrc",
    getUrl: ({ anilistId, ep }) =>
      anilistId ? `https://vidsrc.icu/embed/anime/${anilistId}/${ep}/0` : null,
  },
  {
    name: "AutoEmbed",
    getUrl: ({ title, ep }) =>
      `https://anime.autoembed.cc/embed/${slugify(title)}-episode-${ep}`,
  },
  {
    name: "EmbedsTo",
    getUrl: ({ anilistId, ep }) =>
      anilistId ? `https://player.smashy.stream/anime/${anilistId}/${ep}` : null,
  },
  {
    name: "2Anime",
    getUrl: ({ title, ep }) =>
      `https://2anime.xyz/embed/${slugify(title)}-episode-${ep}`,
  },
  {
    name: "GogoAnime",
    getUrl: ({ title, ep }) =>
      `https://embtaku.pro/streaming.php?id=${slugify(title)}-episode-${ep}`,
  },
];

const WatchAnime = () => {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<AnimeData | null>(null);
  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const autoplay = localStorage.getItem("nexus-autoplay") === "true";

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const load = async () => {
      try {
        const [animeRes, alId] = await Promise.all([
          getAnimeById(Number(id)),
          getAniListId(Number(id)),
        ]);
        setAnime(animeRes.data);
        setAnilistId(alId);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
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

  // Reset iframe error when source changes
  useEffect(() => {
    setIframeError(false);
  }, [sourceIndex]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const title = anime ? (anime.title_english || anime.title) : "Anime";
  const totalEps = anime?.episodes || 12;
  const epNum = Number(episode);

  const availableSources = EMBED_SOURCES.filter((s) =>
    s.getUrl({ title, ep: epNum, malId: Number(id), anilistId }) !== null
  );

  const currentSource = availableSources[sourceIndex] || availableSources[0];
  const embedUrl = currentSource
    ? currentSource.getUrl({ title, ep: epNum, malId: Number(id), anilistId }) || ""
    : "";

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
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Server:</span>
          {availableSources.map((s, i) => (
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

        {availableSources.length === 0 && (
          <div className="aspect-video rounded-lg bg-secondary flex items-center justify-center mb-4">
            <p className="text-muted-foreground text-sm">No servers available for this anime. Try a different title.</p>
          </div>
        )}

        {/* Video player */}
        {availableSources.length > 0 && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary mb-2">
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={`${title} Episode ${episode}`}
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media"
              className="absolute inset-0 w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">
            If a server doesn't load, try switching to another one above.
          </p>
          {autoplay && epNum < totalEps && (
            <Link
              to={`/watch/${id}/${epNum + 1}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <Play className="w-3.5 h-3.5" /> Next Episode
            </Link>
          )}
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
