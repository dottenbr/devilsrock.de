// @ts-check
import { defineConfig } from 'astro/config';

// Static build. Cloudflare Workers serves dist/ (see worker/wrangler.jsonc).
// Pages are emitted as /name/index.html, Cloudflare answers /name with a
// redirect to /name/, so all internal links and canonicals use the slash.
export default defineConfig({
    site: 'https://www.devilsrock.de',
    trailingSlash: 'always',
    build: {
        format: 'directory',
        inlineStylesheets: 'auto',
    },
    devToolbar: { enabled: false },
});
