import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return new Response(
            JSON.stringify({ error: 'Supabase environment variables are missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!RESEND_API_KEY) {
        return new Response(
            JSON.stringify({ error: 'Email service not configured. Please add RESEND_API_KEY.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized request. Authorization token is missing.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const token = authHeader.replace('Bearer ', '').trim();
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized request. Invalid authentication token.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const body = await req.json().catch(() => null);
        const { recipient_email, recipient_name, project_title, message, pdf_storage_path } = body ?? {};

        if (!recipient_email || !project_title) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields. recipient_email and project_title are required.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let attachments = [];
        if (pdf_storage_path) {
            const { data: pdfData, error: storageError } = await supabase.storage
                .from('generated-pdfs')
                .download(pdf_storage_path);

            if (storageError) {
                return new Response(
                    JSON.stringify({ error: 'Unable to download PDF attachment from storage.' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            if (pdfData) {
                const buffer = await pdfData.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                attachments = [{
                    filename: `${project_title.replace(/\s+/g, '_')}_prijedlog.pdf`,
                    content: base64,
                }];
            }
        }

        const emailHtml = `<!DOCTYPE html>
<html lang="bs">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;">
  <div style="background:#003366;padding:28px 24px;border-radius:10px 10px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;">ECO SCUBA</h1>
    <p style="color:#94b4d4;margin:6px 0 0;font-size:13px;">Klub vodenih sportova „S.C.U.B.A." | Sarajevo</p>
  </div>
  <div style="background:white;padding:32px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#1a1a2e;font-size:15px;">Poštovani/a <strong>${recipient_name ?? 'partner'}</strong>,</p>
    <p style="color:#334155;line-height:1.6;">U prilogu se nalazi projektni prijedlog: <strong>${project_title}</strong></p>
    ${message ? `<p style="color:#334155;line-height:1.6;background:#f1f5f9;padding:14px;border-radius:6px;">${message}</p>` : ''}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">KVS „S.C.U.B.A." | Trg grada Prato 24, 71000 Sarajevo | +387 62 332 082</p>
  </div>
</body>
</html>`;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'ECO SCUBA <noreply@ecoscuba.ba>',
                to: [recipient_email],
                subject: `Projektni prijedlog: ${project_title}`,
                html: emailHtml,
                attachments,
            }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = result.error || result.message || response.statusText || 'Email provider failure';
            const status = response.status === 429 ? 429 : response.status === 401 ? 401 : 500;
            return new Response(
                JSON.stringify({ error: message }),
                { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, id: result.id ?? null }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown email error';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
