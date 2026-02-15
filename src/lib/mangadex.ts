const MANGADEX_BASE = "https://api.mangadex.org";

export interface MangaData {
  id: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    status: string;
    year: number | null;
    contentRating: string;
    tags: { id: string; attributes: { name: Record<string, string>; group: string } }[];
    lastChapter: string | null;
  };
  relationships: { id: string; type: string; attributes?: any }[];
}

export interface ChapterData {
  id: string;
  attributes: {
    title: string | null;
    chapter: string | null;
    volume: string | null;
    pages: number;
    translatedLanguage: string;
    publishAt: string;
  };
}

function getCoverUrl(manga: MangaData): string {
  const cover = manga.relationships.find((r) => r.type === "cover_art");
  if (cover?.attributes?.fileName) {
    return `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`;
  }
  return "/placeholder.svg";
}

function getTitle(manga: MangaData): string {
  const t = manga.attributes.title;
  return t.en || t["ja-ro"] || Object.values(t)[0] || "Untitled";
}

function getDescription(manga: MangaData): string {
  const d = manga.attributes.description;
  return d.en || Object.values(d)[0] || "";
}

export const mangaUtils = { getCoverUrl, getTitle, getDescription };

export async function searchManga(query: string, limit = 20, offset = 0) {
  const params = new URLSearchParams({
    title: query,
    limit: String(limit),
    offset: String(offset),
    "includes[]": "cover_art",
    "contentRating[]": "safe",
    "order[relevance]": "desc",
  });
  const res = await fetch(`${MANGADEX_BASE}/manga?${params}`);
  if (!res.ok) throw new Error("MangaDex API error");
  return res.json();
}

export async function getPopularManga(limit = 20) {
  const params = new URLSearchParams({
    limit: String(limit),
    "includes[]": "cover_art",
    "contentRating[]": "safe",
    "order[followedCount]": "desc",
  });
  const res = await fetch(`${MANGADEX_BASE}/manga?${params}`);
  if (!res.ok) throw new Error("MangaDex API error");
  return res.json();
}

export async function getMangaById(id: string) {
  const params = new URLSearchParams({ "includes[]": "cover_art" });
  const res = await fetch(`${MANGADEX_BASE}/manga/${id}?${params}`);
  if (!res.ok) throw new Error("MangaDex API error");
  return res.json();
}

export async function getMangaChapters(id: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    "translatedLanguage[]": "en",
    "order[chapter]": "asc",
  });
  const res = await fetch(`${MANGADEX_BASE}/manga/${id}/feed?${params}`);
  if (!res.ok) throw new Error("MangaDex API error");
  return res.json();
}

export async function getChapterPages(chapterId: string) {
  const res = await fetch(`${MANGADEX_BASE}/at-home/server/${chapterId}`);
  if (!res.ok) throw new Error("MangaDex API error");
  const data = await res.json();
  const baseUrl = data.baseUrl;
  const hash = data.chapter.hash;
  const pages = data.chapter.data as string[];
  return pages.map((p: string) => `${baseUrl}/data/${hash}/${p}`);
}
