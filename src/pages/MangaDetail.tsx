import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getMangaById, getMangaChapters, type MangaData, type ChapterData, mangaUtils } from "@/lib/mangadex";
import CommentSection from "@/components/CommentSection";

const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [manga, setManga] = useState<MangaData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    const load = async () => {
      try {
        const [mangaRes, chapRes] = await Promise.all([
          getMangaById(id),
          getMangaChapters(id),
        ]);
        setManga(mangaRes.data);
        setChapters(chapRes.data || []);
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
          <img src={cover} alt={title} className="w-48 rounded-lg shadow-lg border border-border flex-shrink-0" />
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
          </div>
        </div>

        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Chapters ({chapters.length})</h2>
        <div className="grid gap-2 mb-8">
          {chapters.length === 0 ? (
            <p className="text-muted-foreground text-sm">No English chapters available.</p>
          ) : (
            chapters.map((ch) => (
              <Link
                key={ch.id}
                to={`/manga/${id}/read/${ch.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    Ch. {ch.attributes.chapter || "?"}
                    {ch.attributes.title && ` - ${ch.attributes.title}`}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{ch.attributes.pages} pages</span>
              </Link>
            ))
          )}
        </div>

        <CommentSection contentType="manga" contentId={id!} />
      </div>
    </div>
  );
};

export default MangaDetail;
