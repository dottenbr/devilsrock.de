import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { community } from '../src/community.js';
import worker from '../src/index.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = () => ({
    TURNSTILE_SITE_KEY: 'public-key', TURNSTILE_SECRET: 'private-secret',
    WHATSAPP_INVITE_URL: 'https://chat.whatsapp.com/test-invitation',
    ALLOWED_ORIGINS: 'https://www.devilsrock.de,https://devilsrock.de',
    COMMUNITY_LIMITER: { limit: async () => ({ success: true }) },
});
const request = (token = 'valid-token', headers = {}) => new Request('https://www.devilsrock.de/api/community', {
    method: 'POST', headers: { Origin: 'https://www.devilsrock.de', 'CF-Connecting-IP': '192.0.2.1', ...headers },
    body: new URLSearchParams({ 'cf-turnstile-response': token }),
});
const valid = { success: true, action: 'community', hostname: 'www.devilsrock.de' };
const denyFetch = () => { throw new Error('Siteverify must not be called'); };

test('configuration exposes only the public sitekey; secrets never appear', async () => {
    const response = await community(new Request('https://www.devilsrock.de/api/community'), env());
    assert.deepEqual(await response.json(), { sitekey: 'public-key' });
    assert.match(response.headers.get('Cache-Control'), /no-store/);
});
test('missing configuration fails closed', async () => {
    for (const key of ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET', 'WHATSAPP_INVITE_URL', 'COMMUNITY_LIMITER']) {
        const config = env(); delete config[key];
        assert.equal((await community(request(), config)).status, 503);
    }
});
test('only POST with allowed Origin can attempt verification', async () => {
    globalThis.fetch = denyFetch;
    for (const origin of ['', 'https://attacker.example']) {
        assert.equal((await community(request('token', { Origin: origin }), env())).status, 403);
    }
    const r = await community(new Request('https://www.devilsrock.de/api/community', { method: 'PUT' }), env());
    assert.equal(r.status, 405);
});
test('missing, oversized tokens and bodies never reach Siteverify', async () => {
    globalThis.fetch = denyFetch;
    for (const token of ['', 'a'.repeat(2049)]) {
        const r = await community(request(token), env());
        assert.equal(r.headers.get('Location'), 'https://www.devilsrock.de/community/#fehler');
    }
    assert.equal((await community(request('a'.repeat(5000)), env())).status, 413);
});
test('rate limit blocks before verification and does not disclose invitation', async () => {
    globalThis.fetch = denyFetch;
    const config = env(); config.COMMUNITY_LIMITER.limit = async () => ({ success: false });
    const r = await community(request(), config);
    assert.equal(r.headers.get('Location'), 'https://www.devilsrock.de/community/#limit');
});
test('only verified tokens with matching hostname and action reveal invitation', async () => {
    for (const result of [{ ...valid, success: false }, { ...valid, hostname: 'attacker.example' }, { ...valid, action: 'login' }, { success: true }]) {
        globalThis.fetch = async () => Response.json(result);
        const r = await community(request(), env());
        assert.equal(r.headers.get('Location'), 'https://www.devilsrock.de/community/#fehler');
    }
    globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
        assert.deepEqual(JSON.parse(options.body), { secret: 'private-secret', response: 'valid-token', remoteip: '192.0.2.1' });
        return Response.json(valid);
    };
    const r = await community(request(), env());
    assert.equal(r.status, 303);
    assert.equal(r.headers.get('Location'), env().WHATSAPP_INVITE_URL);
    assert.equal(r.headers.get('Referrer-Policy'), 'no-referrer');
    assert.match(r.headers.get('Cache-Control'), /no-store/);
});
test('replayed tokens are revalidated and rejected when Siteverify rejects them', async () => {
    let calls = 0;
    globalThis.fetch = async () => Response.json(++calls === 1 ? valid : { success: false, 'error-codes': ['timeout-or-duplicate'] });
    assert.equal((await community(request(), env())).headers.get('Location'), env().WHATSAPP_INVITE_URL);
    assert.equal((await community(request(), env())).headers.get('Location'), 'https://www.devilsrock.de/community/#fehler');
    assert.equal(calls, 2);
});
test('verification network and response failures fail closed', async () => {
    for (const mock of [async () => { throw new Error('network'); }, async () => new Response('', { status: 503 }), async () => new Response('not json')]) {
        globalThis.fetch = mock;
        assert.equal((await community(request(), env())).headers.get('Location'), 'https://www.devilsrock.de/community/#fehler');
    }
});
test('invitation configuration cannot redirect outside WhatsApp', async () => {
    globalThis.fetch = async () => Response.json(valid);
    const config = env(); config.WHATSAPP_INVITE_URL = 'https://attacker.example/';
    assert.equal((await community(request(), config)).headers.get('Location'), 'https://www.devilsrock.de/community/#fehler');
});
test('routing preserves asset URLs, canonical redirect, API 404 and damage handler', async () => {
    const config = { ...env(), ASSETS: { fetch: async () => new Response('asset') } };
    assert.equal(await (await worker.fetch(new Request('https://www.devilsrock.de/crew'), config)).text(), 'asset');
    const redirect = await worker.fetch(new Request('https://devilsrock.de/crew?x=1'), config);
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('Location'), 'https://www.devilsrock.de/crew?x=1');
    assert.equal((await worker.fetch(new Request('https://www.devilsrock.de/api/unknown'), config)).status, 404);
    assert.equal((await worker.fetch(new Request('https://www.devilsrock.de/api/schaden-melden'), config)).status, 405);
});
