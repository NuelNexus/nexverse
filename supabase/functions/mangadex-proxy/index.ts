import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const imageUrl = url.searchParams.get("image");
    const comickSearch = url.searchParams.get("comick_search");
    const comickChapters = url.searchParams.get("comick_chapters");
    const comickPages = url.searchParams.get("comick_pages");

    // Image proxy mode
    if (imageUrl) {
      const res = await fetch(imageUrl, {
        headers: { "User-Agent": "NexusVerse/1.0", "Referer": "https://mangadex.org/" },
      });
      if (!res.ok) {
        return new Response("Image fetch failed", { status: res.status, headers: corsHeaders });
      }
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const body = await res.arrayBuffer();
      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // ComicK search – find manga by title and return its hid
    if (comickSearch) {
      // Try multiple ComicK API domains as they change frequently
      const comickDomains = ["https://api.comick.fun", "https://api.comick.io"];
      let searchResult = null;
      for (const domain of comickDomains) {
        try {
          const res = await fetch(`${domain}/v1.0/search?q=${encodeURIComponent(comickSearch)}&limit=5&tachiyomi=true`, {
            headers: { "User-Agent": "NexusVerse/1.0" },
          });
          if (res.ok) {
            const results = await res.json();
            if (results?.length) {
              searchResult = results[0];
              break;
            }
          }
        } catch (e) {
          console.warn(`ComicK domain ${domain} failed:`, e.message);
        }
      }
      if (!searchResult) {
        return new Response(JSON.stringify({ hid: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ hid: searchResult.hid, slug: searchResult.slug, title: searchResult.title || searchResult.slug }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ComicK chapters – get English chapters for a manga
    if (comickChapters) {
      const comickDomains = ["https://api.comick.fun", "https://api.comick.io"];
      for (const domain of comickDomains) {
        try {
          const res = await fetch(`${domain}/comic/${comickChapters}/chapters?lang=en&limit=200&chap-order=1`, {
            headers: { "User-Agent": "NexusVerse/1.0" },
          });
          if (!res.ok) continue;
          const data = await res.json();
          const chapters = (data.chapters || []).map((ch: any) => ({
            id: `comick-${ch.hid}`,
            _source: "comick",
            _comickHid: ch.hid,
            attributes: {
              title: ch.title || null,
              chapter: ch.chap || null,
              volume: ch.vol || null,
              pages: 0,
              translatedLanguage: "en",
              publishAt: ch.created_at || ch.updated_at || new Date().toISOString(),
              externalUrl: null,
            },
          }));
          return new Response(JSON.stringify({ chapters }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.warn(`ComicK chapters from ${domain} failed:`, e.message);
        }
      }
      return new Response(JSON.stringify({ chapters: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ComicK chapter pages
    if (comickPages) {
      const comickDomains = ["https://api.comick.fun", "https://api.comick.io"];
      for (const domain of comickDomains) {
        try {
          const res = await fetch(`${domain}/chapter/${comickPages}?tachiyomi=true`, {
            headers: { "User-Agent": "NexusVerse/1.0" },
          });
          if (!res.ok) continue;
          const data = await res.json();
          const pages = (data.chapter?.images || data.chapter?.md_images || []).map((img: any) => img.url || `https://meo.comick.pictures/${img.b2key}`);
          return new Response(JSON.stringify({ pages }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.warn(`ComicK pages from ${domain} failed:`, e.message);
        }
      }
      return new Response(JSON.stringify({ pages: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MangaDex API proxy mode
    if (!path) {
      return new Response(JSON.stringify({ error: "Missing path param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mdUrl = new URL(`https://api.mangadex.org${path}`);
    url.searchParams.forEach((v, k) => {
      if (k !== "path" && k !== "image") {
        mdUrl.searchParams.append(k, v);
      }
    });

    console.log("Proxying to:", mdUrl.toString());

    const res = await fetch(mdUrl.toString(), {
      headers: { "User-Agent": "NexusVerse/1.0" },
    });
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
