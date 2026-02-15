import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getAnimeById, type AnimeData } from "@/lib/jikan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CommentSection from "@/components/CommentSection";

const WatchAnime = () => {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const [anime, setAnime] = useState<AnimeData | null>(null);
  const [loading, setLoading] = useState(true);

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

        {/* Video player area */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary mb-6 flex items-center justify-center">
          {anime?.trailer?.youtube_id ? (
            <iframe
              src={`https://www.youtube.com/embed/${anime.trailer.youtube_id}?autoplay=0`}
              title={`${title} Episode ${episode}`}
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground text-lg mb-2">Video Player</p>
              <p className="text-muted-foreground text-sm">
                Free streaming sources are being loaded. Connect a streaming API for full episodes.
              </p>
            </div>
          )}
        </div>

        {/* Episode selector */}
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Episodes</h2>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 mb-8">
          {Array.from({ length: totalEps }, (_, i) => i + 1).map((ep) => (
            <Link
              key={ep}
              to={`/watch/${id}/${ep}`}
              className={`h-10 rounded-md flex items-center justify-center text-sm font-medium transition-colors ${
                Number(episode) === ep
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
