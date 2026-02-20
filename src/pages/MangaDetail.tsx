import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Bookmark, Globe, X } from "lucide-react";
import { getMangaById, getMangaChapters, type MangaData, type ChapterData, mangaUtils } from "@/lib/mangadex";
import { supabase } from "@/integrations/supabase/client";
import CommentSection from "@/components/CommentSection";

const MANGA_PROVIDERS = [
  {
    id: "mangafire",
    name: "MangaFire",
    getEmbedUrl: (title: string) =>
      `https://mangafire.to/manga/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`,
  },
  {
    id: "comick",
    name: "ComicK",
    getEmbedUrl: (title: string) =>
      `https://comick.io/search?q=${encodeURIComponent(title)}`,
  },
  {
    id: "mangakakalot",
    name: "MangaKakalot",
    getEmbedUrl: (title: string) =>
      `https://mangakakalot.com/search/story/${encodeURIComponent(title)}`,
  },
  {
    id: "mangareader",
    name: "MangaReader",
    getEmbedUrl: (title: string) =>
      `https://mangareader.to/search?keyword=${encodeURIComponent(title)}`,
  },
];

const MangaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [manga, setManga] = useState<MangaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [continueChapterId, setContinueChapterId] = useState<string | null>(null);
  const [continueChapterNum, setContinueChapterNum] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("mangafire");
  const [showReader, setShowReader] = useState(false);

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

  const currentProvider = MANGA_PROVIDERS.find((p) => p.id === selectedProvider)!;
  const readerUrl = currentProvider.getEmbedUrl(title);

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

            <button
              onClick={() => setShowReader(true)}
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <BookOpen className="w-4 h-4" /> Read Now
            </button>
          </div>
        </div>

        {/* Provider selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-muted-foreground">Source:</span>
          {MANGA_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProvider(p.id);
                if (showReader) setShowReader(true); // refresh iframe
              }}
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

        {/* Embedded reader */}
        {showReader && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Reading on {currentProvider.name}
              </h2>
              <button
                onClick={() => setShowReader(false)}
                className="p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg overflow-hidden border border-border bg-secondary" style={{ height: "80vh" }}>
              <iframe
                src={readerUrl}
                title={`Read ${title} on ${currentProvider.name}`}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              If the reader doesn't load, try a different source above or{" "}
              <a href={readerUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                open in new tab
              </a>.
            </p>
          </div>
        )}

        {/* Quick links to all providers */}
        {!showReader && (
          <div className="glass rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-foreground mb-3">Read "{title}" on:</p>
            <div className="flex flex-wrap gap-2">
              {MANGA_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProvider(p.id);
                    setShowReader(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" /> {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <CommentSection contentType="manga" contentId={id!} />
      </div>
    </div>
  );
};

export default MangaDetail;
