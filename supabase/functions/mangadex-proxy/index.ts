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

    // Image proxy mode – stream an image from MangaDex CDN
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

    // API proxy mode
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
