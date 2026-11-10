// Static build for devilsrock.de
//
// The site is packaged as static assets and served by Cloudflare Workers.
// This script is run locally after editing a page or a component and the
// output is committed:
//
//   npm run build   - write shared head/nav/footer into every page, regenerate
//                     the icon sprite and sitemap.xml
//   npm run check   - fail if any generated file is out of date (used in CI)
//
// Pages mark the generated regions with comments:
//   <!-- @head --> ... <!-- /@head -->      (needs <title>, description, canonical above it)
//   <!-- @nav --> ... <!-- /@nav -->
//   <!-- @footer --> ... <!-- /@footer -->

import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://www.devilsrock.de';
const CHECK = process.argv.includes('--check');
const SKIP_DIRS = new Set(['dist', '.wrangler', '.git', 'node_modules', 'components', 'scripts', 'worker', 'assets', 'css', 'js', '.github']);

const stale = [];

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function findPages(dir = ROOT) {
    const pages = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) pages.push(...await findPages(join(dir, entry.name)));
        } else if (entry.name.endsWith('.html')) {
            pages.push(join(dir, entry.name));
        }
    }
    return pages.sort();
}

// Write a generated file, or record it as stale in --check mode
async function emit(path, content) {
    const current = await readFile(path, 'utf8').catch(() => null);
    if (current === content) return;
    if (CHECK) {
        stale.push(relative(ROOT, path));
    } else {
        await writeFile(path, content);
        console.log(`updated ${relative(ROOT, path)}`);
    }
}

function escapeAttr(value) {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function indent(html, prefix) {
    return html.trim().split('\n').map(line => (line ? prefix + line : line)).join('\n');
}

// Replace the content between <!-- @name --> and <!-- /@name -->, keeping the marker indentation
function fill(html, name, content) {
    const re = new RegExp(`([ \\t]*)<!-- @${name} -->[\\s\\S]*?<!-- /@${name} -->`);
    return html.replace(re, (_, pad) => `${pad}<!-- @${name} -->\n${indent(content, pad)}\n${pad}<!-- /@${name} -->`);
}

function pageMeta(html, file) {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    if (!title || !description) {
        throw new Error(`${relative(ROOT, file)}: <title> and <meta name="description"> are required for @head`);
    }
    return { title, description, canonical };
}

function renderHead({ title, description, canonical }, noindex) {
    const lines = [
        '<meta name="theme-color" content="#003947">',
        noindex ? '<meta name="robots" content="noindex">' : '',
        '<meta property="og:type" content="website">',
        '<meta property="og:locale" content="de_DE">',
        '<meta property="og:site_name" content="Devils Rock Trails">',
        `<meta property="og:title" content="${escapeAttr(title)}">`,
        `<meta property="og:description" content="${escapeAttr(description)}">`,
        canonical ? `<meta property="og:url" content="${canonical}">` : '',
        `<meta property="og:image" content="${SITE_URL}/assets/images/og-image.jpg">`,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Devils Rock Trails Logo vor einem Mountainbiker im Wald">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<link rel="icon" href="/assets/icons/favicon.ico" sizes="48x48">',
        '<link rel="icon" type="image/png" href="/assets/icons/icon-192.png" sizes="192x192">',
        '<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        '<link rel="preload" href="/assets/fonts/roboto-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="stylesheet" href="/css/fonts.css">',
        '<link rel="stylesheet" href="/css/base.css">',
        '<link rel="stylesheet" href="/css/components.css">',
        '<link rel="stylesheet" href="/css/layout.css">',
        '<link rel="stylesheet" href="/css/pages.css">',
    ];
    return lines.filter(Boolean).join('\n');
}

// URL path a page is served at ("/crew/index.html" -> "/crew")
function urlPath(file) {
    const rel = '/' + relative(ROOT, file).split('\\').join('/');
    return rel.replace(/\/index\.html$/, '') || '/';
}

function renderNav(template, path) {
    return template.replace(/<a href="([^"]+)">/g, (tag, href) => {
        const active = !href.includes('#') && href !== '/' && (path === href || path.startsWith(href + '/'));
        return active ? `<a href="${href}" aria-current="page">` : tag;
    });
}

async function buildSprite(files) {
    const used = new Set();
    for (const content of files) {
        for (const match of content.matchAll(/icons\.svg#([a-z0-9-]+)/g)) used.add(match[1]);
    }

    const svgRoot = join(ROOT, 'node_modules/@fortawesome/fontawesome-free/svgs');
    if (!await exists(svgRoot)) {
        console.warn('node_modules missing, skipping icon sprite (run npm install)');
        return;
    }

    const symbols = [];
    for (const name of [...used].sort()) {
        let svg = null;
        for (const style of ['solid', 'brands', 'regular']) {
            svg = await readFile(join(svgRoot, style, `${name}.svg`), 'utf8').catch(() => null);
            if (svg) break;
        }
        if (!svg) throw new Error(`Unknown icon "${name}" (Font Awesome 6 name expected)`);
        const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
        const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<!--[\s\S]*?-->/g, '');
        symbols.push(`<symbol id="${name}" viewBox="${viewBox}">${body}</symbol>`);
    }

    const sprite = [
        '<svg xmlns="http://www.w3.org/2000/svg">',
        '<!-- Generated by scripts/build.mjs. Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0) Copyright 2023 Fonticons, Inc. -->',
        ...symbols,
        '</svg>',
        '',
    ].join('\n');
    await emit(join(ROOT, 'assets/icons/icons.svg'), sprite);
}

async function main() {
    const nav = await readFile(join(ROOT, 'components/nav.html'), 'utf8');
    const footer = await readFile(join(ROOT, 'components/footer.html'), 'utf8');
    const pages = await findPages();
    const sitemap = [];
    const sources = [];

    for (const file of pages) {
        const original = await readFile(file, 'utf8');
        let html = original;
        const path = urlPath(file);
        const isRedirect = /http-equiv="refresh" content="0;/.test(html);
        const noindex = path === '/404.html';

        if (html.includes('<!-- @head -->')) html = fill(html, 'head', renderHead(pageMeta(html, file), noindex));
        if (html.includes('<!-- @nav -->')) html = fill(html, 'nav', renderNav(nav, path));
        if (html.includes('<!-- @footer -->')) html = fill(html, 'footer', footer);
        await emit(file, html);
        sources.push(html);

        const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
        if (canonical && !isRedirect && !noindex && canonical.startsWith(SITE_URL)) sitemap.push(canonical);
    }

    for (const dir of ['js']) {
        for (const name of await readdir(join(ROOT, dir))) {
            sources.push(await readFile(join(ROOT, dir, name), 'utf8'));
        }
    }
    await buildSprite(sources);

    const urls = [...new Set(sitemap)].sort().map(loc => `  <url><loc>${loc}</loc></url>`);
    await emit(join(ROOT, 'sitemap.xml'), [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
    ].join('\n'));

    if (CHECK && stale.length) {
        console.error(`Out of date, run "npm run build":\n  ${stale.join('\n  ')}`);
        process.exit(1);
    }
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
