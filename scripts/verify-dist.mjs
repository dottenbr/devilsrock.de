// Post-build check for dist/ (runs after "astro build").
// Fails the build if
//   - a page or required file is missing
//   - an internal link or asset reference points to nothing
//   - sitemap.xml and the built pages disagree
//   - something that must stay private ends up in the published files
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://www.devilsrock.de';
const errors = [];

async function walk(dir) {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        files.push(...(entry.isDirectory() ? await walk(path) : [path]));
    }
    return files;
}

async function exists(path) {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

const files = (await walk(DIST)).map(file => relative(DIST, file).split(sep).join('/'));
const htmlFiles = files.filter(file => file.endsWith('.html'));

// 1. Required files
const required = [
    'index.html', '404.html', 'sitemap.xml', 'robots.txt', 'site.webmanifest', 'status.json',
    'crew/index.html', 'ctf2027/index.html', 'ctf2027/ausschreibung.pdf', 'community/index.html',
    'datenschutz/index.html', 'nutzungsbestimmungen/index.html', 'schaden-melden/index.html',
    'spenden/index.html', 'design/index.html', 'assets/images/og-image.jpg',
];
for (const file of required) {
    if (!files.includes(file)) errors.push(`missing ${file}`);
}

// 2. Nothing private or unconfirmed in the published files
const forbiddenPath = [/sponsor/i, /(^|\/)\.[^/]+$/, /^worker\//, /^drafts\//, /\.env/];
for (const file of files) {
    if (forbiddenPath.some(re => re.test(file))) errors.push(`must not be published: ${file}`);
}
const forbiddenText = [/dottenbr@me\.com/i, /sponsor/i, /fahrrad-rith\.svg|rewe\.svg|schneider-bau|kirner\.png/i];
for (const file of files.filter(f => /\.(html|xml|json|js|css|txt|webmanifest)$/.test(f))) {
    const text = await readFile(join(DIST, file), 'utf8');
    for (const re of forbiddenText) {
        if (re.test(text)) errors.push(`${file} contains ${re}`);
    }
}

// 3. Internal links and assets resolve
const status = JSON.parse(await readFile(join(DIST, 'status.json'), 'utf8'));
if (!['auto', 'open', 'closed'].includes(status.mode)) errors.push(`status.json: invalid mode "${status.mode}"`);

for (const page of htmlFiles) {
    const html = await readFile(join(DIST, page), 'utf8');
    const refs = [...html.matchAll(/\s(?:href|src|srcset|action)="([^"]+)"/g)]
        .flatMap(([, value]) => value.split(',').map(part => part.trim().split(/\s+/)[0]));
    for (const ref of refs) {
        let path = ref.startsWith(SITE) ? ref.slice(SITE.length) || '/' : ref;
        if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/api/')) continue;
        path = decodeURIComponent(path.split('#')[0].split('?')[0]);
        const target = path.endsWith('/') ? `${path}index.html` : path;
        if (!(await exists(join(DIST, target)))) errors.push(`${page}: broken link ${ref}`);
    }
}

// 4. Sitemap lists exactly the indexable pages
const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
const pages = htmlFiles.filter(file => file !== '404.html').map(file => `${SITE}/${file.replace(/index\.html$/, '')}`);
for (const page of pages) {
    if (!listed.has(page)) errors.push(`sitemap.xml is missing ${page}`);
}
for (const url of listed) {
    if (!pages.includes(url)) errors.push(`sitemap.xml lists ${url}, but there is no such page`);
}

if (errors.length) {
    console.error(`verify-dist: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`);
    process.exit(1);
}
console.log(`verify-dist: ${files.length} files, ${htmlFiles.length} pages, all links resolve`);
