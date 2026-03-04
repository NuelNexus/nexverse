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
  // Track which source this chapter came from
  _source?: "mangadex" | "comick";
  _comickHid?: string;
}

function getCoverUrl(manga: MangaData): string {
  const cover = manga.relationships.find((r) => r.type === "cover_art");
  if (cover?.attributes?.fileName) {
    const originalUrl = `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`;
    return `${PROXY_BASE}?image=${encodeURIComponent(originalUrl)}`;
  }
  return "/placeholder.svg";
}

function getTitle(manga: MangaData): string {
  const t = manga.attributes.title;
  if (t.en) return t.en;
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

export async function getMangaChapters(id: string, limit = 50, offset = 0): Promise<{ data: ChapterData[]; source: string }> {
  // Try MangaDex English first
  try {
    const res = await proxyFetch(`/manga/${id}/feed`, {
      limit: String(limit),
      offset: String(offset),
      "translatedLanguage[]": "en",
      "order[chapter]": "asc",
      "includes[]": "scanlation_group",
    });
    const chs = (res.data || []).filter((c: ChapterData) => !c.attributes.externalUrl);
    if (chs.length > 0) {
      chs.forEach((c: ChapterData) => { c._source = "mangadex"; });
      return { data: chs, source: "mangadex" };
    }
  } catch (e) {
    console.warn("MangaDex EN chapters failed:", e);
  }

  // Fallback: ComicK
  try {
    const mangaRes = await proxyFetch(`/manga/${id}`, { "includes[]": ["cover_art", "author"] });
    const title = getTitle(mangaRes.data);
    const comickChapters = await fetchComickChapters(title);
    if (comickChapters.length > 0) {
      return { data: comickChapters, source: "comick" };
    }
  } catch (e) {
    console.warn("ComicK fallback failed:", e);
  }

  // Final fallback: MangaDex any language
  try {
    const res = await proxyFetch(`/manga/${id}/feed`, {
      limit: String(limit),
      offset: String(offset),
      "order[chapter]": "asc",
      "includes[]": "scanlation_group",
    });
    const chs = (res.data || []).filter((c: ChapterData) => !c.attributes.externalUrl);
    if (chs.length > 0) {
      chs.forEach((c: ChapterData) => { c._source = "mangadex"; });
      return { data: chs, source: "mangadex-all" };
    }
  } catch (e) {
    console.warn("MangaDex all-lang chapters failed:", e);
  }

  return { data: [], source: "none" };
}


// ComicK fallback source
async function fetchComickChapters(title: string): Promise<ChapterData[]> {
  const proxyUrl = new URL(PROXY_BASE);
  proxyUrl.searchParams.set("comick_search", title);
  const searchRes = await fetch(proxyUrl.toString());
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  if (!searchData.hid) return [];

  const chapUrl = new URL(PROXY_BASE);
  chapUrl.searchParams.set("comick_chapters", searchData.hid);
  const chapRes = await fetch(chapUrl.toString());
  if (!chapRes.ok) return [];
  const chapData = await chapRes.json();
  return chapData.chapters || [];
}

export async function getChapterPages(chapterId: string, source?: string, comickHid?: string): Promise<string[]> {
  if (source === "comick" && comickHid) {
    return getComickChapterPages(comickHid);
  }
  // Default MangaDex
  const data = await proxyFetch(`/at-home/server/${chapterId}`);
  const baseUrl = data.baseUrl;
  const hash = data.chapter?.hash;
  const pages = (data.chapter?.data || []) as string[];
  
  if (!baseUrl || !hash || pages.length === 0) {
    return [];
  }
  
  return pages.map((p: string) => {
    const originalUrl = `${baseUrl}/data/${hash}/${p}`;
    return `${PROXY_BASE}?image=${encodeURIComponent(originalUrl)}`;
  });
}

async function getComickChapterPages(comickHid: string): Promise<string[]> {
  const url = new URL(PROXY_BASE);
  url.searchParams.set("comick_pages", comickHid);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.pages || [];
}
