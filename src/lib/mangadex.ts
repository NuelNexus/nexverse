const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mangadex-proxy`;

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

async function proxyFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(PROXY_BASE);
  url.searchParams.set("path", path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("MangaDex API error");
  return res.json();
}

export async function searchManga(query: string, limit = 20, offset = 0) {
  return proxyFetch("/manga", {
    title: query,
    limit: String(limit),
    offset: String(offset),
    "includes[]": "cover_art",
    "contentRating[]": "safe",
    "order[relevance]": "desc",
  });
}

export async function getPopularManga(limit = 20) {
  return proxyFetch("/manga", {
    limit: String(limit),
    "includes[]": "cover_art",
    "contentRating[]": "safe",
    "order[followedCount]": "desc",
  });
}

export async function getMangaById(id: string) {
  return proxyFetch(`/manga/${id}`, { "includes[]": "cover_art" });
}

export async function getMangaChapters(id: string, limit = 50, offset = 0) {
  return proxyFetch(`/manga/${id}/feed`, {
    limit: String(limit),
    offset: String(offset),
    "translatedLanguage[]": "en",
    "order[chapter]": "asc",
  });
}

export async function getChapterPages(chapterId: string) {
  const data = await proxyFetch(`/at-home/server/${chapterId}`);
  const baseUrl = data.baseUrl;
  const hash = data.chapter.hash;
  const pages = data.chapter.data as string[];
  return pages.map((p: string) => `${baseUrl}/data/${hash}/${p}`);
}
