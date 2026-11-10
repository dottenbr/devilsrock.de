import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('short links redirect permanently to their page', async () => {
    for (const path of ['/ctf2026', '/ctf2026/', '/CTF2026']) {
        const response = await worker.fetch(new Request(`https://www.devilsrock.de${path}?utm=flyer`), {});
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('Location'), 'https://www.devilsrock.de/ctf2027/?utm=flyer');
    }
});

test('old /pages/ URLs redirect permanently to the new pages', async () => {
    const cases = {
        '/pages/design.html': '/design/',
        '/pages/design': '/design/',
        '/pages/nutzungsbestimmungen.html': '/nutzungsbestimmungen/',
        '/Pages/Nutzungsbestimmungen.html': '/nutzungsbestimmungen/',
    };
    for (const [path, target] of Object.entries(cases)) {
        const response = await worker.fetch(new Request(`https://www.devilsrock.de${path}`), {});
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('Location'), `https://www.devilsrock.de${target}`);
    }
});
