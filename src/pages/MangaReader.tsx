import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronUp, Bookmark, Loader2 } from "lucide-react";
import { getChapterPages, getMangaById, getMangaChapters, mangaUtils, type MangaData, type ChapterData } from "@/lib/mangadex";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MangaReader = () => {
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [manga, setManga] = useState<MangaData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [currentChapter, setCurrentChapter] = useState<ChapterData | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mangaId) return;
    getMangaById(mangaId).then((res) => setManga(res.data)).catch(console.error);
    getMangaChapters(mangaId, 200).then((res) => {
      const chs = (res.data || []).filter((c: ChapterData) => !c.attributes.externalUrl);
      setChapters(chs);
    }).catch(console.error);
  }, [mangaId]);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    setPages([]);
    topRef.current?.scrollIntoView();
    getChapterPages(chapterId)
      .then(setPages)
      .catch(() => toast.error("Failed to load chapter pages"))
      .finally(() => setLoading(false));
  }, [chapterId]);

  useEffect(() => {
    if (chapters.length && chapterId) {
      setCurrentChapter(chapters.find((c) => c.id === chapterId) || null);
    }
  }, [chapters, chapterId]);

  // Save reading progress
  useEffect(() => {
    if (!manga || !chapterId || !currentChapter) return;
    const save = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const title = mangaUtils.getTitle(manga);
      const cover = mangaUtils.getCoverUrl(manga);
      await supabase.from("manga_reading_progress").upsert({
        user_id: user.id,
        manga_id: mangaId!,
        manga_title: title,
        manga_cover_url: cover,
        chapter_id: chapterId,
        chapter_number: currentChapter.attributes.chapter || "?",
        page_number: 0,
      }, { onConflict: "user_id,manga_id" });
    };
    save();
  }, [manga, chapterId, currentChapter]);

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  const title = manga ? mangaUtils.getTitle(manga) : "Manga";
  const chapterLabel = currentChapter?.attributes.chapter
    ? `Ch. ${currentChapter.attributes.chapter}`
    : "Chapter";

  return (
    <div className="min-h-screen bg-background" ref={topRef}>
      {/* Sticky header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-3xl flex items-center justify-between h-14">
          <Link
            to={`/manga/${mangaId}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> {title}
          </Link>
          <span className="text-sm font-medium text-foreground">{chapterLabel}</span>
          <select
            value={chapterId}
            onChange={(e) => navigate(`/manga/${mangaId}/read/${e.target.value}`)}
            className="h-8 px-2 rounded-md bg-secondary text-foreground text-xs border-none focus:outline-none"
          >
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Ch. {ch.attributes.chapter || "?"} {ch.attributes.title ? `- ${ch.attributes.title}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pages - vertical scroll */}
      <div className="pt-14 pb-20">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground text-sm">No pages available for this chapter.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            {pages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Page ${i + 1}`}
                className="w-full max-w-[800px] select-none"
                loading={i < 3 ? "eager" : "lazy"}
              />
            ))}
          </div>
        )}

        {/* Navigation between chapters */}
        {!loading && (
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 mt-8 gap-4">
            {prevChapter ? (
              <Link
                to={`/manga/${mangaId}/read/${prevChapter.id}`}
                className="flex-1 py-3 text-center rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                ← Previous Chapter
              </Link>
            ) : <div className="flex-1" />}
            {nextChapter ? (
              <Link
                to={`/manga/${mangaId}/read/${nextChapter.id}`}
                className="flex-1 py-3 text-center rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Next Chapter →
              </Link>
            ) : <div className="flex-1" />}
          </div>
        )}
      </div>

      {/* Back to top */}
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 z-50"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default MangaReader;
