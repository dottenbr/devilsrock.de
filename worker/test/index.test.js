// Run with: npm test (node:test, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const ENDPOINT = 'https://www.devilsrock.de/api/schaden-melden';

function makeEnv({ limiterSuccess = true, sendError = null } = {}) {
    const sent = [];
    return {
        sent,
        ALLOWED_ORIGINS: 'https://www.devilsrock.de,https://devilsrock.de',
        REPORT_TO: 'to@example.com',
        REPORT_FROM: 'from@example.com',
        REPORT_LIMITER: { limit: async () => ({ success: limiterSuccess }) },
        EMAIL: {
            send: async message => {
                if (sendError) throw sendError;
                sent.push(message);
            },
        },
    };
}

function validForm(overrides = {}) {
    const form = new FormData();
    const values = {
        name: 'Max',
        contact: 'max@example.com',
        location: 'Abschnitt 3',
        description: 'Baum liegt quer',
        ...overrides,
    };
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return form;
}

function post(form, headers = {}) {
    return new Request(ENDPOINT, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json', ...headers },
    });
}

test('unknown path returns 404', async () => {
    const res = await worker.fetch(new Request('https://www.devilsrock.de/other'), makeEnv());
    assert.equal(res.status, 404);
});

test('non-POST returns 405 with Allow header', async () => {
    const res = await worker.fetch(new Request(ENDPOINT), makeEnv());
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('Allow'), 'POST');
});

test('foreign origin is rejected', async () => {
    const env = makeEnv();
    const res = await worker.fetch(post(validForm(), { Origin: 'https://evil.example' }), env);
    assert.equal(res.status, 403);
    assert.equal(env.sent.length, 0);
});

test('rate limited request returns 429', async () => {
    const env = makeEnv({ limiterSuccess: false });
    const res = await worker.fetch(post(validForm()), env);
    assert.equal(res.status, 429);
    assert.equal(env.sent.length, 0);
});

test('missing required field returns 400', async () => {
    const env = makeEnv();
    const res = await worker.fetch(post(validForm({ location: '   ' })), env);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).ok, false);
    assert.equal(env.sent.length, 0);
});

test('honeypot reports success without sending mail', async () => {
    const env = makeEnv();
    const res = await worker.fetch(post(validForm({ website: 'http://spam' })), env);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(env.sent.length, 0);
});

test('valid report is emailed with reply-to and escaped HTML', async () => {
    const env = makeEnv();
    const res = await worker.fetch(
        post(validForm({ description: '<script>alert(1)</script>', location: 'A\r\nBcc: x' }), {
            Origin: 'https://www.devilsrock.de',
        }),
        env,
    );
    assert.equal(res.status, 200);
    assert.equal(env.sent.length, 1);
    const mail = env.sent[0];
    assert.equal(mail.to, 'to@example.com');
    assert.equal(mail.replyTo, 'max@example.com');
    assert.doesNotMatch(mail.subject, /[\r\n]/);
    assert.match(mail.html, /&lt;script&gt;/);
    assert.doesNotMatch(mail.html, /<script>/);
    assert.equal(mail.attachments, undefined);
});

test('contact that is not an email sets no reply-to', async () => {
    const env = makeEnv();
    await worker.fetch(post(validForm({ contact: '0171 1234567' })), env);
    assert.equal('replyTo' in env.sent[0], false);
});

test('fields are truncated to their limits', async () => {
    const env = makeEnv();
    await worker.fetch(post(validForm({ name: 'n'.repeat(500) })), env);
    assert.match(env.sent[0].text, new RegExp(`^Name: n{100}\\n`));
});

test('photos: keeps caps at 3 files, skips non-images and oversize files', async () => {
    const env = makeEnv();
    const form = validForm();
    const img = name => new File([new Uint8Array(10)], name, { type: 'image/jpeg' });
    form.append('photos', img('a b.jpg'));
    form.append('photos', new File(['x'], 'doc.txt', { type: 'text/plain' }));
    form.append('photos', img('c.jpg'));
    form.append('photos', img('d.jpg'));
    form.append('photos', img('e.jpg'));
    const res = await worker.fetch(post(form), env);
    const body = await res.json();
    // the cap counts every submitted file, including the skipped text file
    assert.equal(body.photos, 2);
    assert.deepEqual(body.skipped, ['doc.txt', 'd.jpg', 'e.jpg']);
    assert.equal(env.sent[0].attachments[0].filename, 'a_b.jpg');
    assert.match(env.sent[0].text, /Nicht angehängt/);

    const big = validForm();
    big.append('photos', new File([new Uint8Array(4 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }));
    const bigRes = await worker.fetch(post(big), makeEnv());
    assert.deepEqual((await bigRes.json()).skipped, ['big.jpg']);
});

test('email failure returns 502', async () => {
    const original = console.error;
    console.error = () => {};
    try {
        const res = await worker.fetch(post(validForm()), makeEnv({ sendError: new Error('boom') }));
        assert.equal(res.status, 502);
    } finally {
        console.error = original;
    }
});

test('non-JSON clients are redirected back to the page', async () => {
    const env = makeEnv();
    const ok = await worker.fetch(post(validForm(), { Accept: 'text/html' }), env);
    assert.equal(ok.status, 303);
    assert.equal(ok.headers.get('Location'), 'https://www.devilsrock.de/schaden-melden/#gesendet');
    const bad = await worker.fetch(post(validForm({ name: '' }), { Accept: 'text/html' }), env);
    assert.equal(bad.headers.get('Location'), 'https://www.devilsrock.de/schaden-melden/#fehler');
});
