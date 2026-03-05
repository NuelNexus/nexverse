import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronUp, Loader2, Languages, X, ChevronDown } from "lucide-react";
import { getChapterPages, getMangaById, getMangaChapters, mangaUtils, type MangaData, type ChapterData } from "@/lib/mangadex";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-manga`;

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese",
  "Italian", "Russian", "Chinese", "Arabic", "Hindi",
  "Korean", "Japanese", "Turkish", "Indonesian", "Thai",
];

const MangaReader = () => {
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source") || "mangadex";
  const comickHid = searchParams.get("hid") || undefined;
  const navigate = useNavigate();
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [manga, setManga] = useState<MangaData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [chapterSource, setChapterSource] = useState(source);
  const [currentChapter, setCurrentChapter] = useState<ChapterData | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Translation state
  const [translateMode, setTranslateMode] = useState(false);
  const [targetLang, setTargetLang] = useState("English");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [translations, setTranslations] = useState<Record<number, Array<{text: string; x: number; y: number; w: number; h: number}>>>({});
  const [translating, setTranslating] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!mangaId) return;
    getMangaById(mangaId).then((res) => setManga(res.data)).catch(console.error);
    getMangaChapters(mangaId, 200).then((res) => {
      setChapters(res.data);
      setChapterSource(res.source);
    }).catch(console.error);
  }, [mangaId]);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    setPages([]);
    setTranslations({});
    setTranslating({});
    topRef.current?.scrollIntoView();

    const ch = chapters.find((c) => c.id === chapterId);
    const useSource = ch?._source || source;
    const useHid = ch?._comickHid || comickHid;

    getChapterPages(chapterId, useSource, useHid)
      .then(setPages)
      .catch(() => toast.error("Failed to load chapter pages"))
      .finally(() => setLoading(false));
  }, [chapterId, chapters, source, comickHid]);

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

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const translatePage = useCallback(async (pageIndex: number): Promise<boolean> => {
    if (translations[pageIndex] || translating[pageIndex]) return true;
    setTranslating((prev) => ({ ...prev, [pageIndex]: true }));

    try {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(TRANSLATE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageUrl: pages[pageIndex], targetLang }),
        });

        if (res.status === 429) {
          const delayMs = Math.pow(2, attempt) * 1500 + Math.floor(Math.random() * 500);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Translation failed");
        }

        const data = await res.json();
        setTranslations((prev) => ({ ...prev, [pageIndex]: data.blocks || [] }));
        return true;
      }

      lastError = new Error("Rate limited, please try again in a moment");
      throw lastError;
    } catch (e: any) {
      toast.error(`Page ${pageIndex + 1}: ${e.message || "Translation failed"}`);
      return false;
    } finally {
      setTranslating((prev) => ({ ...prev, [pageIndex]: false }));
    }
  }, [pages, targetLang, translations, translating]);

  const autoTranslateInProgressRef = useRef(false);

  // Auto-translate all pages sequentially with stronger spacing
  const translateAllPages = useCallback(async () => {
    if (autoTranslateInProgressRef.current) return;
    autoTranslateInProgressRef.current = true;

    try {
      for (let i = 0; i < pages.length; i++) {
        if (!translations[i] && !translating[i]) {
          await translatePage(i);
          if (i < pages.length - 1) {
            await new Promise((r) => setTimeout(r, 2500));
          }
        }
      }
    } finally {
      autoTranslateInProgressRef.current = false;
    }
  }, [pages, translations, translating, translatePage]);

  // Auto-translate once per chapter/language selection
  const [autoTranslateTriggered, setAutoTranslateTriggered] = useState(false);
  useEffect(() => {
    if (translateMode && !showLangPicker && pages.length > 0 && !autoTranslateTriggered) {
      setAutoTranslateTriggered(true);
      void translateAllPages();
    }

    if (!translateMode) {
      setAutoTranslateTriggered(false);
      autoTranslateInProgressRef.current = false;
    }
  }, [translateMode, showLangPicker, pages.length, autoTranslateTriggered, translateAllPages]);

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  const title = manga ? mangaUtils.getTitle(manga) : "Manga";
  const chapterLabel = currentChapter?.attributes.chapter
    ? `Ch. ${currentChapter.attributes.chapter}`
    : "Chapter";

  const buildChapterUrl = (ch: ChapterData) => {
    const isComick = ch._source === "comick";
    return `/manga/${mangaId}/read/${ch.id}${isComick ? `?source=comick&hid=${ch._comickHid}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-background" ref={topRef}>
      {/* Sticky header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-3xl flex items-center justify-between h-14 gap-2">
          <Link
            to={`/manga/${mangaId}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{title}</span>
          </Link>
          <span className="text-sm font-medium text-foreground flex-shrink-0">{chapterLabel}</span>
          <div className="flex items-center gap-2">
            {/* Translate toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  if (!translateMode) {
                    setTranslateMode(true);
                    setShowLangPicker(true);
                  } else {
                    setTranslateMode(false);
                    setShowLangPicker(false);
                    setTranslations({});
                  }
                }}
                className={`flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium transition-colors ${
                  translateMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
                title="Toggle translation"
              >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">{translateMode ? targetLang : "Translate"}</span>
              </button>

              {/* Language picker dropdown */}
              {showLangPicker && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setTargetLang(lang);
                          setShowLangPicker(false);
                          setTranslations({});
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          targetLang === lang
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-foreground hover:bg-accent"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <select
              value={chapterId}
              onChange={(e) => {
                const ch = chapters.find(c => c.id === e.target.value);
                if (ch) navigate(buildChapterUrl(ch));
              }}
              className="h-8 px-2 rounded-md bg-secondary text-foreground text-xs border-none focus:outline-none max-w-[120px]"
            >
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Ch. {ch.attributes.chapter || "?"} {ch.attributes.title ? `- ${ch.attributes.title}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pages */}
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
              <div key={i} className="w-full relative group">
                <div className="relative max-w-[800px] mx-auto">
                  <img
                    src={src}
                    alt={`Page ${i + 1}`}
                    className="w-full select-none"
                    loading={i < 3 ? "eager" : "lazy"}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.retried) {
                        img.dataset.retried = "1";
                        img.src = src;
                      }
                    }}
                  />

                  {/* Translation overlays on individual text areas */}
                  {translateMode && translations[i] && translations[i].map((block, bi) => (
                    <div
                      key={bi}
                      className="absolute flex items-center justify-center pointer-events-none"
                      style={{
                        left: `${block.x - block.w / 2}%`,
                        top: `${block.y - block.h / 2}%`,
                        width: `${block.w}%`,
                        height: `${block.h}%`,
                      }}
                    >
                      <div className="bg-white rounded px-1 py-0.5 w-full h-full flex items-center justify-center overflow-hidden shadow-md">
                        <span className="text-black text-[clamp(6px,1.2vw,13px)] leading-tight text-center font-medium" style={{ wordBreak: 'break-word' }}>
                          {block.text}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Translating spinner overlay */}
                  {translateMode && translating[i] && !translations[i] && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                        <span className="text-white text-xs font-medium">Translating page {i + 1}...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chapter navigation */}
        {!loading && (
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 mt-8 gap-4">
            {prevChapter ? (
              <Link
                to={buildChapterUrl(prevChapter)}
                className="flex-1 py-3 text-center rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                ← Previous Chapter
              </Link>
            ) : <div className="flex-1" />}
            {nextChapter ? (
              <Link
                to={buildChapterUrl(nextChapter)}
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
