import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { getChapterPages } from "@/lib/mangadex";

const MangaReader = () => {
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>();
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    setCurrentPage(0);
    getChapterPages(chapterId)
      .then(setPages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [chapterId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
      if (e.key === "ArrowLeft") setCurrentPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pages.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="fixed top-16 left-0 right-0 z-40 glass">
        <div className="container flex items-center justify-between h-12">
          <Link
            to={`/manga/${mangaId}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-sm text-foreground font-medium">
            Page {currentPage + 1} / {pages.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              disabled={currentPage === 0}
              className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, pages.length - 1))}
              disabled={currentPage === pages.length - 1}
              className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-14 flex justify-center min-h-[calc(100vh-7rem)]">
        {pages[currentPage] && (
          <img
            src={pages[currentPage]}
            alt={`Page ${currentPage + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
          />
        )}
      </div>
    </div>
  );
};

export default MangaReader;
