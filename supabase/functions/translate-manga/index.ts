import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LANG_CODES: Record<string, string> = {
  English: 'en', Spanish: 'es', French: 'fr', German: 'de', Portuguese: 'pt',
  Italian: 'it', Russian: 'ru', Chinese: 'zh-CN', Arabic: 'ar', Hindi: 'hi',
  Korean: 'ko', Japanese: 'ja', Turkish: 'tr', Indonesian: 'id', Thai: 'th',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLang = "English" } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(JSON.stringify({ error: "Missing texts array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit batch size
    if (texts.length > 100) {
      return new Response(JSON.stringify({ error: "Too many texts (max 100)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tl = LANG_CODES[targetLang] || 'en';
    const translations: string[] = [];

    for (const text of texts) {
      const trimmed = (text || '').trim();
      if (!trimmed || trimmed.length < 2) {
        translations.push('');
        continue;
      }

      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          translations.push(trimmed);
          continue;
        }

        const data = await res.json();
        const translated = data[0]?.map((s: any) => s[0]).filter(Boolean).join('') || trimmed;
        translations.push(translated);
      } catch {
        translations.push(trimmed);
      }
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-manga error:", e);
    return new Response(JSON.stringify({ error: e.message || "Translation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
