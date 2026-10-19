// Explicit allowlist: never upload repository files, Worker code or secrets.
import { cp, mkdir, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', '404.html', 'assets', 'css', 'js', 'crew', 'community', 'datenschutz', 'nutzungsbestimmungen', 'schaden-melden', 'spenden', 'pages', 'status.json', 'robots.txt', 'sitemap.xml', 'site.webmanifest']) {
    await cp(new URL(path, root), new URL(path, output), { recursive: true, filter: source => !source.split('/').pop().startsWith('.') });
}
console.log('Static website packaged in dist/');
