import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Bookmark, Globe } from "lucide-react";
import { getMangaById, getMangaChapters, type MangaData, type ChapterData, mangaUtils } from "@/lib/mangadex";
import { supabase } from "@/integrations/supabase/client";
import CommentSection from "@/components/CommentSection";

const MANGA_PROVIDERS = [
  { id: "mangadex", name: "MangaDex", getReaderUrl: (mangaId: string, chapterId: string) => `/manga/${mangaId}/read/${chapterId}` },
  { id: "mangafire", name: "MangaFire", getExternalUrl: (title: string) => `https://mangafire.to/manga/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
  { id: "mangakakalot", name: "MangaKakalot", getExternalUrl: (title: string) => `https://mangakakalot.com/search/story/${encodeURIComponent(title)}` },
  { id: "comick", name: "ComicK", getExternalUrl: (title: string) => `https://comick.io/search?q=${encodeURIComponent(title)}` },
];

const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manga, setManga] = useState<MangaData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [continueChapterId, setContinueChapterId] = useState<string | null>(null);
  const [continueChapterNum, setContinueChapterNum] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("mangadex");

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    const load = async () => {
      try {
        const [mangaRes, chapRes] = await Promise.all([
          getMangaById(id),
          getMangaChapters(id, 200),
        ]);
        setManga(mangaRes.data);
        const readableChapters = (chapRes.data || []).filter(
          (ch: any) => !ch.attributes.externalUrl
        );
        setChapters(readableChapters);

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

            <div className="flex gap-3 mt-5 flex-wrap">
              {chapters.length > 0 && (
                <Link
                  to={`/manga/${id}/read/${chapters[0].id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <BookOpen className="w-4 h-4" /> Read Ch. 1
                </Link>
              )}
              {continueChapterId && (
                <Link
                  to={`/manga/${id}/read/${continueChapterId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors"
                >
                  <Bookmark className="w-4 h-4" /> Continue Ch. {continueChapterNum || "?"}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Provider selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-muted-foreground">Read on:</span>
          {MANGA_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProvider(p.id)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                selectedProvider === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* External provider links */}
        {selectedProvider !== "mangadex" && (
          <div className="glass rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-3">
              Read <span className="text-foreground font-medium">{title}</span> on {MANGA_PROVIDERS.find(p => p.id === selectedProvider)?.name}:
            </p>
            <a
              href={MANGA_PROVIDERS.find(p => p.id === selectedProvider)?.getExternalUrl?.(title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <Globe className="w-4 h-4" /> Open in {MANGA_PROVIDERS.find(p => p.id === selectedProvider)?.name}
            </a>
          </div>
        )}

        {/* MangaDex chapters */}
        {selectedProvider === "mangadex" && (
          <>
            <h2 className="text-xl font-display font-semibold text-foreground mb-4">Chapters ({chapters.length})</h2>
            <div className="grid gap-2 mb-8">
              {chapters.length === 0 ? (
                <div className="glass rounded-lg p-6 text-center">
                  <p className="text-muted-foreground text-sm mb-3">No readable English chapters on MangaDex.</p>
                  <p className="text-xs text-muted-foreground">Try another provider above (MangaFire, MangaKakalot, or ComicK).</p>
                </div>
              ) : (
                chapters.map((ch) => (
                  <Link
                    key={ch.id}
                    to={`/manga/${id}/read/${ch.id}`}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      ch.id === continueChapterId
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">
                        Ch. {ch.attributes.chapter || "?"}
                        {ch.attributes.title && ` - ${ch.attributes.title}`}
                      </span>
                      {ch.id === continueChapterId && (
                        <span className="text-xs text-primary font-medium">← Continue</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{ch.attributes.pages} pages</span>
                  </Link>
                ))
              )}
            </div>
          </>
        )}

        <CommentSection contentType="manga" contentId={id!} />
      </div>
    </div>
  );
};

export default MangaDetail;
