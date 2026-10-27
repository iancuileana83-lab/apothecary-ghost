import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('home page carries the disclaimer and the doctor/pharmacist footer', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /History, not medical advice\./);
  assert.match(html, /ask a doctor or pharmacist/);
});

test('/api/facts serves the fact sheet', async () => {
  const res = await fetch(base + '/api/facts');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.remedies.length, 8);
});

test('static assets are served', async () => {
  for (const file of ['/app.js', '/styles.css']) {
    assert.equal((await fetch(base + file)).status, 200, file);
  }
});

test('path traversal and unknown paths are refused', async () => {
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 403);
  assert.equal((await fetch(base + '/nope.html')).status, 404);
});

test('only GET is allowed and security headers are set', async () => {
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  const res = await fetch(base + '/');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('sound is off by default and the ghost is labelled as made-up', async () => {
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /id="sound"[^>]*aria-pressed="false"/);
  assert.match(html, /Sound: off/);
  assert.match(html, /a made-up character/);
  for (const file of ['/decor.js', '/sound.js']) {
    assert.equal((await fetch(base + file)).status, 200, file);
  }
});

test('the rooms are wired: nav, Poison cabinet and Ofrenda', async () => {
  const html = await (await fetch(base + '/')).text();
  for (const hash of ['#/shop', '#/poison', '#/ofrenda']) assert.ok(html.includes(`href="${hash}"`), hash);
  assert.match(html, /id="cabinet-jars"/);
  assert.match(html, /id="altar"/);
  for (const file of ['/rooms.css', '/ofrenda.js']) {
    assert.equal((await fetch(base + file)).status, 200, file);
  }
});

test('chat, certificate and remembrance pieces are served', async () => {
  const html = await (await fetch(base + '/')).text();
  for (const hash of ['#/certificate', '#/chat']) assert.ok(html.includes(`href="${hash}"`), hash);
  for (const id of ['chat-body', 'cert-body', 'remember']) assert.ok(html.includes(`id="${id}"`), id);
  for (const file of ['/chat.js', '/certificate.js', '/remember.js', '/progress.js', '/texts.js', '/extras.css']) {
    assert.equal((await fetch(base + file)).status, 200, file);
  }
});

test('quiz room and its script are served', async () => {
  const html = await (await fetch(base + '/')).text();
  assert.ok(html.includes('href="#/quiz"'));
  assert.match(html, /id="quiz-body"/);
  assert.match(html, /id="arch"/);
  assert.equal((await fetch(base + '/quiz.js')).status, 200);
});
