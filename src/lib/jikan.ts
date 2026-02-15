const JIKAN_BASE = "https://api.jikan.moe/v4";

export interface AnimeData {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  synopsis: string | null;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  episodes: number | null;
  status: string | null;
  rating: string | null;
  type: string | null;
  source: string | null;
  duration: string | null;
  year: number | null;
  season: string | null;
  studios: { mal_id: number; name: string }[];
  genres: { mal_id: number; name: string }[];
  themes: { mal_id: number; name: string }[];
  trailer: { youtube_id: string | null } | null;
}

export interface JikanResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;

async function jikanFetch<T>(endpoint: string): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, 350 - (now - lastRequest));
  if (wait > 0) await delay(wait);
  lastRequest = Date.now();

  const res = await fetch(`${JIKAN_BASE}${endpoint}`);
  if (res.status === 429) {
    await delay(1000);
    return jikanFetch(endpoint);
  }
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  return res.json();
}

export async function getTopAnime(page = 1, filter?: string) {
  const f = filter ? `&filter=${filter}` : "";
  return jikanFetch<JikanResponse<AnimeData[]>>(`/top/anime?page=${page}${f}`);
}

export async function getSeasonNow(page = 1) {
  return jikanFetch<JikanResponse<AnimeData[]>>(`/seasons/now?page=${page}`);
}

export async function searchAnime(query: string, page = 1) {
  return jikanFetch<JikanResponse<AnimeData[]>>(
    `/anime?q=${encodeURIComponent(query)}&page=${page}&sfw=true`
  );
}

export async function getAnimeById(id: number) {
  return jikanFetch<JikanResponse<AnimeData>>(`/anime/${id}/full`);
}

export async function getAnimeCharacters(id: number) {
  return jikanFetch<JikanResponse<any[]>>(`/anime/${id}/characters`);
}

export async function getAnimeRecommendations(id: number) {
  return jikanFetch<JikanResponse<any[]>>(`/anime/${id}/recommendations`);
}

export async function getRecentAnimeRecommendations() {
  return jikanFetch<JikanResponse<any[]>>(`/recommendations/anime`);
}
