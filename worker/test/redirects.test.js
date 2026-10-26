import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('short links redirect permanently to their page', async () => {
    for (const path of ['/ctf2026', '/ctf2026/', '/CTF2026']) {
        const response = await worker.fetch(new Request(`https://www.devilsrock.de${path}?utm=flyer`), {});
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('Location'), 'https://www.devilsrock.de/ctf2027?utm=flyer');
    }
});
