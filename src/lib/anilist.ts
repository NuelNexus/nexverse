// Map MAL ID to AniList ID using AniList GraphQL API
const ANILIST_GQL = "https://graphql.anilist.co";

let anilistCache: Record<number, number | null> = {};

export async function getAniListId(malId: number): Promise<number | null> {
  if (malId in anilistCache) return anilistCache[malId];

  try {
    const res = await fetch(ANILIST_GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query ($malId: Int) { Media(idMal: $malId, type: ANIME) { id } }`,
        variables: { malId },
      }),
    });
    const json = await res.json();
    const id = json?.data?.Media?.id ?? null;
    anilistCache[malId] = id;
    return id;
  } catch {
    anilistCache[malId] = null;
    return null;
  }
}
