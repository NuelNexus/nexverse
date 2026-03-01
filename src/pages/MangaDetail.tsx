import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getMangaById, getMangaChapters, type MangaData, type ChapterData, mangaUtils } from "@/lib/mangadex";
import { supabase } from "@/integrations/supabase/client";
import CommentSection from "@/components/CommentSection";

const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [manga, setManga] = useState<MangaData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [continueChapterId, setContinueChapterId] = useState<string | null>(null);
  const [continueChapterNum, setContinueChapterNum] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    const load = async () => {
      try {
        const mangaRes = await getMangaById(id);
        setManga(mangaRes.data);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: progress } = await supabase
            .from("manga_reading_progress")
            .select("chapter_id, chapter_number")
            .eq("user_id", user.id)
            .eq("manga_id", id)
            .single();
          if (progress) {
            setContinueChapterId(progress.chapter_id);
            setContinueChapterNum(progress.chapter_number);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Load chapters
    setChaptersLoading(true);
    getMangaChapters(id, 200)
      .then((res) => {
        const chs = (res.data || []).filter((c: ChapterData) => !c.attributes.externalUrl);
        setChapters(chs);
      })
      .catch(console.error)
      .finally(() => setChaptersLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <div className="h-[40vh] bg-secondary animate-pulse" />
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Manga not found.</p>
      </div>
    );
  }

  const title = mangaUtils.getTitle(manga);
  const description = mangaUtils.getDescription(manga);
  const cover = mangaUtils.getCoverUrl(manga);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container">
        <Link to="/manga" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Manga
        </Link>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <img
            src={cover}
            alt={title}
            className="w-48 rounded-lg shadow-lg border border-border flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{title}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {manga.attributes.tags
                .filter((t) => t.attributes.group === "genre")
                .slice(0, 6)
                .map((t) => (
                  <span key={t.id} className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-xs font-medium">
                    {t.attributes.name.en || Object.values(t.attributes.name)[0]}
                  </span>
                ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed line-clamp-6">{description}</p>
            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
              <span>Status: <span className="text-foreground capitalize">{manga.attributes.status}</span></span>
              {manga.attributes.year && <span>Year: <span className="text-foreground">{manga.attributes.year}</span></span>}
            </div>

            {continueChapterId && (
              <Link
                to={`/manga/${id}/read/${continueChapterId}`}
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <BookOpen className="w-4 h-4" /> Continue Ch. {continueChapterNum || "?"}
              </Link>
            )}
          </div>
        </div>

        {/* Chapter List */}
        <div className="mb-8">
          <h2 className="text-xl font-display font-bold text-foreground mb-4">
            Chapters ({chapters.length})
          </h2>
          {chaptersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-secondary animate-pulse" />
              ))}
            </div>
          ) : chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No English chapters available.</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto rounded-lg border border-border">
              {chapters.map((ch) => (
                <Link
                  key={ch.id}
                  to={`/manga/${id}/read/${ch.id}`}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-primary/10 transition-colors ${
                    ch.id === continueChapterId ? "bg-primary/15 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Ch. {ch.attributes.chapter || "?"}
                      </span>
                      {ch.attributes.title && (
                        <span className="text-sm text-muted-foreground ml-2">
                          — {ch.attributes.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(ch.attributes.publishAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <CommentSection contentType="manga" contentId={id!} />
      </div>
    </div>
  );
};

export default MangaDetail;
