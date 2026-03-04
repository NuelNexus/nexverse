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
    const { imageUrl, targetLang = "English" } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Missing imageUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch the image and convert to base64 for the vision model
    const imgRes = await fetch(imageUrl, {
      headers: { "User-Agent": "NexusVerse/1.0", "Referer": "https://mangadex.org/" },
    });
    if (!imgRes.ok) throw new Error("Failed to fetch image");

    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a manga/comic translator. Given a manga page image, extract ALL visible text (speech bubbles, narration boxes, sound effects, signs) and translate them to ${targetLang}. 

Format your response as a clear, readable translation:
- Number each speech bubble/text block
- Show the original text followed by the translation
- Include sound effects with [SFX] prefix
- Preserve the reading order (right to left for manga, top to bottom)
- If there's no text visible, say "No text found on this page."

Keep translations natural and convey the tone/emotion of the original.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Translate all text in this manga page to ${targetLang}. Extract every speech bubble, narration box, and sound effect.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${contentType};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again in a moment" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error("AI translation failed");
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content || "Translation unavailable.";

    return new Response(JSON.stringify({ translation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-manga error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
