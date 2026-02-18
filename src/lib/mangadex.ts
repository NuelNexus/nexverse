const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mangadex-proxy`;

export interface MangaData {
  id: string;
  attributes: {
    title: Record<string, string>;
    description: Record<string, string>;
    altTitles?: Record<string, string>[];
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
    externalUrl: string | null;
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
  // Prefer English title
  if (t.en) return t.en;
  // Check alt titles for English
  if (manga.attributes.altTitles) {
    for (const alt of manga.attributes.altTitles) {
      if (alt.en) return alt.en;
    }
  }
  return t["ja-ro"] || Object.values(t)[0] || "Untitled";
}

function getDescription(manga: MangaData): string {
  const d = manga.attributes.description;
  return d.en || Object.values(d)[0] || "";
}

export const mangaUtils = { getCoverUrl, getTitle, getDescription };

async function proxyFetch(path: string, params: Record<string, string | string[]> = {}) {
  const url = new URL(PROXY_BASE);
  url.searchParams.set("path", path);
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((val) => url.searchParams.append(k, val));
    } else {
      url.searchParams.append(k, v);
    }
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("MangaDex API error");
  return res.json();
}

export async function searchManga(query: string, limit = 20, offset = 0) {
  return proxyFetch("/manga", {
    title: query,
    limit: String(limit),
    offset: String(offset),
    "includes[]": ["cover_art", "author"],
    "contentRating[]": ["safe", "suggestive"],
    "availableTranslatedLanguage[]": "en",
    "order[relevance]": "desc",
  });
}

export async function getPopularManga(limit = 24) {
  return proxyFetch("/manga", {
    limit: String(limit),
    "includes[]": ["cover_art", "author"],
    "contentRating[]": ["safe", "suggestive"],
    "availableTranslatedLanguage[]": "en",
    "order[followedCount]": "desc",
  });
}

export async function getMangaById(id: string) {
  return proxyFetch(`/manga/${id}`, { "includes[]": ["cover_art", "author"] });
}

export async function getMangaChapters(id: string, limit = 50, offset = 0) {
  return proxyFetch(`/manga/${id}/feed`, {
    limit: String(limit),
    offset: String(offset),
    "translatedLanguage[]": "en",
    "order[chapter]": "asc",
    "includes[]": "scanlation_group",
  });
}

export async function getChapterPages(chapterId: string) {
  const data = await proxyFetch(`/at-home/server/${chapterId}`);
  const baseUrl = data.baseUrl;
  const hash = data.chapter.hash;
  const pages = data.chapter.data as string[];
  return pages.map((p: string) => `${baseUrl}/data/${hash}/${p}`);
}
