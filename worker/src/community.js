const HEADERS = {
    'Cache-Control': 'no-store, private',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
};
const PAGE = 'https://www.devilsrock.de/community/';

export async function community(request, env) {
    const reply = (error, status) => new Response(JSON.stringify({ error }), {
        status, headers: { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
    });
    const fail = (reason) => new Response(null, {
        status: 303, headers: { ...HEADERS, Location: `${PAGE}#${reason}` },
    });
    if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, POST' } });
    }
    // Fail closed if any production configuration is missing.
    if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET || !env.WHATSAPP_INVITE_URL || !env.COMMUNITY_LIMITER) {
        return reply('Die Community ist gerade nicht erreichbar. Bitte versuche es später erneut.', 503);
    }
    if (request.method === 'GET') {
        return new Response(JSON.stringify({ sitekey: env.TURNSTILE_SITE_KEY }), {
            headers: { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        });
    }
    const origin = request.headers.get('Origin');
    if (!origin || !env.ALLOWED_ORIGINS.split(',').includes(origin)) return reply('Ungültige Herkunft.', 403);
    const ip = request.headers.get('CF-Connecting-IP');
    try {
        const limit = await env.COMMUNITY_LIMITER.limit({ key: ip || 'unknown' });
        if (!limit.success) return fail('limit');
        // Bound the request body even when Content-Length is absent or forged.
        const reader = request.body?.getReader();
        if (!reader) return fail('fehler');
        const chunks = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 4096) { await reader.cancel(); return reply('Anfrage zu groß.', 413); }
            chunks.push(value);
        }
        if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return reply('Ungültiges Format.', 415);
        const body = await new Blob(chunks).text();
        const token = new URLSearchParams(body).get('cf-turnstile-response');
        if (!token || token.length > 2048) return fail('fehler');
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, ...(ip ? { remoteip: ip } : {}) }),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return fail('fehler');
        const result = await response.json();
        if (result.success !== true || result.action !== 'community' || result.hostname !== new URL(origin).hostname) return fail('fehler');
        const invite = new URL(env.WHATSAPP_INVITE_URL);
        if (invite.origin !== 'https://chat.whatsapp.com' || invite.username || invite.password) return fail('fehler');
        return new Response(null, { status: 303, headers: { ...HEADERS, Location: invite.href } });
    } catch {
        // Never log tokens, secrets or the invitation URL.
        return fail('fehler');
    }
}
