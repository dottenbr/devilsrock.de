import type { APIRoute } from 'astro';

// Every indexable page. The build (scripts/verify-dist.mjs) fails if a page
// exists in dist/ but is missing here, or the other way round.
export const PAGES = [
    '/',
    '/community/',
    '/crew/',
    '/ctf2027/',
    '/datenschutz/',
    '/design/',
    '/nutzungsbestimmungen/',
    '/schaden-melden/',
    '/spenden/',
];

export const GET: APIRoute = ({ site }) => {
    const urls = PAGES.map(path => `  <url><loc>${new URL(path, site).href}</loc></url>`);
    const body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
    return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
