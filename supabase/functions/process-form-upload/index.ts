// supabase/functions/process-form-upload/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PUBLIC_CALL_PROMPT = `Ti si ekspert za analizu javnih poziva za projektne prijedloge u Bosni i Hercegovini.
Analiziraj priloženi dokument i vrati strukturiranu analizu u JSON formatu sa sljedećim poljima:
{
  "eligibility_criteria": ["kriterij 1", "kriterij 2"],
  "required_documents": ["dokument 1", "dokument 2"],
  "deadlines": {"prijava": "datum", "realizacija": "datum"},
  "budget_limits": {"min": broj, "max": broj, "currency": "KM"},
  "priority_areas": ["oblast 1", "oblast 2"],
  "recommended_program": "naziv programa",
  "raw_html_summary": "<h2>Sažetak javnog poziva</h2><p>...</p>"
}
Budi koncizan i precizan. Odgovaraj isključivo na bosanskom jeziku.`;

const APPLICATION_FORM_PROMPT = `Ti si ekspert za analizu obrazaca za projektne prijave.
Analiziraj priloženi dokument i vrati njegovu strukturu u JSON formatu sa sljedećim poljima:
{
  "form_language": "bs|en|hr",
  "form_title": "naziv obrasca",
  "sections": [{"key": "kljuc", "title_original": "naziv", "title_bs": "naziv na bs", "order": 0}],
  "color_scheme": {"header_bg": "#003366", "accent": "#0ea5e9"},
  "estimated_sections": 15
}
Budi koncizan i precizan.`;

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const token = authHeader.replace('Bearer ', '').trim();
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false }
        });

        const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const body = await req.json();
        const { pdf_base64, text_content, source } = body;

        if (!text_content && !pdf_base64) {
            return new Response(
                JSON.stringify({ error: 'Missing content' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const isPublicCall = source === 'public_call';
        const prompt = isPublicCall ? PUBLIC_CALL_PROMPT : APPLICATION_FORM_PROMPT;

        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        if (!lovableApiKey) {
            return new Response(
                JSON.stringify({ error: 'AI Gateway not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Determine if we have meaningful extracted text or need multimodal PDF input
        const hasUsableText = text_content && text_content.trim().length > 100;

        console.log(`[AI Gateway] source: ${source} | text: ${text_content?.length ?? 0} chars | hasUsableText: ${hasUsableText} | hasPDF: ${!!pdf_base64}`);

        type AiMessage =
            | { type: 'text'; text: string }
            | { type: 'image_url'; image_url: { url: string } };

        // Build messages array - use multimodal when text extraction failed
        const userContent: AiMessage[] = [];

        if (hasUsableText) {
            // Text extraction worked - send text only (faster, cheaper)
            userContent.push({
                type: 'text',
                text: `Analiziraj sljedeći dokument:\n\n${text_content.substring(0, 12000)}`
            });
        } else if (pdf_base64) {
            // Text extraction failed (scanned PDF) - send PDF as image to Gemini multimodal
            console.log('[AI Gateway] Using multimodal PDF input (scanned document detected)');
            userContent.push({
                type: 'text',
                text: 'Analiziraj sljedeći PDF dokument:'
            });
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:application/pdf;base64,${pdf_base64}`
                }
            });
        } else {
            userContent.push({
                type: 'text',
                text: 'Dokument nije dostupan za analizu.'
            });
        }

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lovableApiKey}`,
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: userContent }
                ],
                max_tokens: 4096,
                temperature: 0.3,
            }),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('[AI Gateway] Error:', aiResponse.status, errText.substring(0, 500));
            return new Response(
                JSON.stringify({ error: 'AI analysis failed', details: errText.substring(0, 200) }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const aiData = await aiResponse.json();
        const text = aiData.choices?.[0]?.message?.content ?? '';

        console.log('[AI Gateway] ✅ Success —', text.length, 'chars');

        // Parse JSON from response
        let parsed;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_html_summary: text };
        } catch {
            parsed = { raw_html_summary: text };
        }

        return new Response(
            JSON.stringify(parsed),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (caughtError: unknown) {
        const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError || 'Unknown error');
        console.error('[Error]', errorMessage);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
