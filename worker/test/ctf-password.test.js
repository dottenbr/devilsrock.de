import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const env = {
    ASSETS: { fetch: async () => new Response('asset', { headers: { 'Cache-Control': 'public, max-age=3600' } }) },
};
const get = path => new Request(`https://www.devilsrock.de${path}`);

test('published CTF page and PDF are public without a password secret', async () => {
    for (const path of ['/ctf2027', '/ctf2027/', '/ctf2027/ausschreibung.pdf']) {
        const response = await worker.fetch(get(path), env);
        assert.equal(response.status, 200, path);
        assert.equal(await response.text(), 'asset');
        assert.equal(response.headers.get('WWW-Authenticate'), null);
        assert.equal(response.headers.get('X-Robots-Tag'), null);
        assert.equal(response.headers.get('Cache-Control'), 'public, max-age=3600');
    }
});

test('legacy CTF short link points to the public event', async () => {
    const response = await worker.fetch(get('/ctf2026'), env);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), 'https://www.devilsrock.de/ctf2027/');
});
