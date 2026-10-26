// Devils Rock Trails form handler
//
// POST /api/schaden-melden  (multipart/form-data)
//   fields: name, contact, location, description, photos (0-3 images), website (honeypot)
//
// Sends the report by email via Cloudflare Email Sending. Nothing is stored.
// Requests from fetch() (Accept: application/json) get JSON back; plain form
// posts (no JavaScript) are redirected back to the page with #gesendet / #fehler.

import { community } from './community.js';

const MAX_PHOTOS = 3;
// Email Sending caps a message at 5 MiB including attachments. Attachments are
// base64-encoded in the message (+33%), so keep the raw photo budget well below.
const PHOTO_BUDGET_BYTES = 3.3 * 1024 * 1024;
const LIMITS = { name: 100, contact: 200, location: 300, description: 5000 };
const PAGE_URL = 'https://www.devilsrock.de/schaden-melden/';
// Short links that point to a page under a different path
const REDIRECTS = { '/ctf2026': '/ctf2027' };

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.hostname === 'devilsrock.de') {
            url.hostname = 'www.devilsrock.de';
            return Response.redirect(url.toString(), 308);
        }

        const redirect = REDIRECTS[url.pathname.replace(/\/$/, '').toLowerCase()];
        if (redirect) {
            url.pathname = redirect;
            return Response.redirect(url.toString(), 301);
        }

        if (url.pathname === '/api/community') return community(request, env);

        if (url.pathname !== '/api/schaden-melden') {
            if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
            return json({ ok: false, error: 'Nicht gefunden.' }, 404);
        }
        if (request.method !== 'POST') {
            return json({ ok: false, error: 'Nur POST erlaubt.' }, 405, { Allow: 'POST' });
        }

        const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
        const reply = (status, body) => wantsJson
            ? json(body, status)
            : Response.redirect(`${PAGE_URL}${body.ok ? '#gesendet' : '#fehler'}`, 303);

        const allowed = env.ALLOWED_ORIGINS.split(',');
        const origin = request.headers.get('Origin');
        if (origin && !allowed.includes(origin)) {
            return reply(403, { ok: false, error: 'Ungültige Herkunft.' });
        }

        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const { success } = await env.REPORT_LIMITER.limit({ key: ip });
        if (!success) {
            return reply(429, { ok: false, error: 'Zu viele Meldungen in kurzer Zeit. Bitte versuche es in einer Minute erneut.' });
        }

        let form;
        try {
            form = await request.formData();
        } catch {
            return reply(400, { ok: false, error: 'Das Formular konnte nicht gelesen werden.' });
        }

        // Honeypot: real visitors never see or fill this field
        if (field(form, 'website')) {
            return reply(200, { ok: true });
        }

        const report = {};
        for (const [key, max] of Object.entries(LIMITS)) {
            report[key] = field(form, key).slice(0, max);
        }
        if (!report.name || !report.contact || !report.location || !report.description) {
            return reply(400, { ok: false, error: 'Bitte fülle alle Pflichtfelder aus.' });
        }

        const { attachments, skipped } = await collectPhotos(form);

        const subject = `Schadenmeldung: ${report.location}`.replace(/[\r\n]+/g, ' ').slice(0, 150);
        const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.contact) ? report.contact : undefined;

        const lines = [
            `Name: ${report.name}`,
            `Kontakt: ${report.contact}`,
            `Ort/Abschnitt: ${report.location}`,
            '',
            'Beschreibung:',
            report.description,
            '',
            `Fotos: ${attachments.length}`,
            ...(skipped.length ? [`Nicht angehängt (zu groß oder kein Bild): ${skipped.join(', ')}`] : []),
        ];

        try {
            await env.EMAIL.send({
                to: env.REPORT_TO,
                from: { email: env.REPORT_FROM, name: 'Devils Rock Trails' },
                ...(replyTo ? { replyTo } : {}),
                subject,
                text: lines.join('\n'),
                html: renderHtml(report, attachments.length, skipped),
                ...(attachments.length ? { attachments } : {}),
            });
        } catch (error) {
            console.error('Email send failed', error);
            return reply(502, { ok: false, error: 'Die Meldung konnte nicht versendet werden.' });
        }

        return reply(200, { ok: true, photos: attachments.length, skipped });
    },
};

function field(form, name) {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : '';
}

async function collectPhotos(form) {
    const attachments = [];
    const skipped = [];
    let budget = PHOTO_BUDGET_BYTES;

    const files = form.getAll('photos').filter(file => typeof file === 'object' && file.size > 0);
    for (const [index, file] of files.entries()) {
        const name = safeFilename(file.name, index);
        if (index >= MAX_PHOTOS || !file.type.startsWith('image/') || file.size > budget) {
            skipped.push(name);
            continue;
        }
        budget -= file.size;
        attachments.push({
            content: await file.arrayBuffer(),
            filename: name,
            type: file.type,
            disposition: 'attachment',
        });
    }
    return { attachments, skipped };
}

function safeFilename(name, index) {
    const cleaned = (name || '').replace(/[^\w.\-]+/g, '_').slice(-80);
    return cleaned || `foto-${index + 1}.jpg`;
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderHtml(report, photoCount, skipped) {
    const row = (label, value) => `<tr><th align="left" valign="top" style="padding:4px 12px 4px 0">${label}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
    return `<!doctype html><html><body style="font-family:sans-serif;color:#003947">
<h2 style="margin:0 0 12px">Neue Schadenmeldung</h2>
<table cellspacing="0" cellpadding="0">
${row('Name', report.name)}
${row('Kontakt', report.contact)}
${row('Ort/Abschnitt', report.location)}
${row('Fotos', String(photoCount))}
${skipped.length ? row('Nicht angehängt', skipped.join(', ')) : ''}
</table>
<h3 style="margin:16px 0 8px">Beschreibung</h3>
<p style="white-space:pre-wrap;margin:0">${escapeHtml(report.description)}</p>
</body></html>`;
}

function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
    });
}
