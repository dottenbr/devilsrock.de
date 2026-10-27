import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const env = (password = 'geheim') => ({
    CTF_PASSWORD: password,
    ASSETS: { fetch: async () => new Response('asset', { headers: { 'Cache-Control': 'public, max-age=3600' } }) },
});
const basic = (user, password) => 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
const get = (path, headers = {}) => new Request(`https://www.devilsrock.de${path}`, { headers });

test('protected CTF paths require the password', async () => {
    for (const path of ['/ctf2027', '/ctf2027/', '/ctf2027/ausschreibung.pdf', '/CTF2027/sponsoren/rewe.png']) {
        const response = await worker.fetch(get(path), env());
        assert.equal(response.status, 401, path);
        assert.match(response.headers.get('WWW-Authenticate'), /^Basic realm=/);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
});

test('wrong passwords and malformed headers are rejected', async () => {
    for (const auth of [basic('x', 'falsch'), basic('x', 'geheim2'), basic('x', 'gehei'), 'Basic !!!', 'Bearer geheim']) {
        assert.equal((await worker.fetch(get('/ctf2027/', { Authorization: auth }), env())).status, 401, auth);
    }
});

test('correct password with any user name serves the page privately', async () => {
    for (const user of ['', 'sponsor', 'Jürgen']) {
        const response = await worker.fetch(get('/ctf2027/', { Authorization: basic(user, 'geheim') }), env());
        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'asset');
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
    }
});

test('missing password configuration fails closed', async () => {
    for (const password of [undefined, '']) {
        const response = await worker.fetch(get('/ctf2027/', { Authorization: basic('x', '') }), env(password));
        assert.equal(response.status, 401);
    }
});

test('other pages and the short link stay public', async () => {
    assert.equal(await (await worker.fetch(get('/crew'), env())).text(), 'asset');
    assert.equal(await (await worker.fetch(get('/ctf20270'), env())).text(), 'asset');
    assert.equal((await worker.fetch(get('/ctf2026'), env())).status, 301);
});
