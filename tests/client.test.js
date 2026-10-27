import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CERTIFICATE, CHAT_UI, REMEMBER } from '../public/texts.js';
import { createProgress } from '../public/progress.js';
import { sanitizeName, wrapText } from '../public/certificate.js';
import { scoreMessage } from '../public/quiz.js';

const facts = JSON.parse(readFileSync(new URL('../data/facts.json', import.meta.url), 'utf8'));
const ids = facts.remedies.map((r) => r.id);

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

test('certificate wording matches what was approved', () => {
  assert.equal(CERTIFICATE.locked(3, 8), 'Open all 8 jars and finish the quiz to earn your certificate. Jars opened: 3 of 8.');
  assert.equal(CERTIFICATE.offer, 'Well done, apprentice. You have opened every jar and answered every question. Shall I write your name in my book?');
  assert.equal(CERTIFICATE.nameLabel, 'Your name for the certificate');
  assert.equal(CERTIFICATE.write, 'Write my name');
  assert.equal(CERTIFICATE.download, 'Download as image');
  assert.equal(CERTIFICATE.heading, 'Certificate of the Apprentice Apothecary');
  assert.equal(CERTIFICATE.certifies, 'This certifies that');
  assert.equal(
    CERTIFICATE.body,
    "has opened all eight jars of the Apothecary's Ghost, finished the quiz, and remembered the people who came before.",
  );
  assert.equal(CERTIFICATE.footer, 'This is a keepsake, not a qualification. History, not medical advice.');
  assert.equal(CERTIFICATE.signature, 'Ambrose Quill, a made-up ghost');
});

test('remembrance wording matches what was approved', () => {
  assert.equal(REMEMBER.heading, 'Leave a remembrance');
  assert.equal(REMEMBER.help, 'Write a short line about someone you miss, and place a candle for them.');
  assert.equal(REMEMBER.whoLabel, 'Who do you remember?');
  assert.equal(REMEMBER.lineLabel, 'Your line');
  assert.equal(REMEMBER.place, 'Place a candle');
  assert.equal(REMEMBER.remove, 'Remove');
  assert.equal(REMEMBER.privacy, 'Your remembrance stays only in this browser. It is never sent anywhere, and you can remove it at any time.');
  assert.equal(REMEMBER.blocked, 'Your browser is not keeping this, so it will vanish when you close the page.');
});

test('the chat controls carry the history label', () => {
  assert.equal(CHAT_UI.banner, 'History, not medical advice.');
});

test('the ghost thanks the visitor with the approved line B', () => {
  assert.equal(facts.thanks, 'Thank you, friend. Every candle is lit, and the people who came before are remembered tonight.');
});

test('the quiz has all 8 questions, one per remedy', () => {
  assert.equal(facts.quiz.questions.length, 8);
  assert.deepEqual(facts.quiz.questions.map((q) => q.remedyId).sort(), [...ids].sort());
  assert.equal(scoreMessage(5, 8), 'You scored 5 of 8.');
});

test('the certificate is earned only after all 8 jars and the quiz', () => {
  const p = createProgress(ids, fakeStorage());
  assert.equal(p.earned(), false);
  for (const id of ids.slice(0, 7)) p.markOpened(id);
  p.markQuizDone();
  assert.equal(p.earned(), false);
  assert.deepEqual(p.counts(), { opened: 7, total: 8, quizDone: true });
  p.markOpened(ids[7]);
  p.markOpened(ids[7]);
  p.markOpened('not-a-remedy');
  assert.equal(p.counts().opened, 8);
  assert.equal(p.earned(), true);
});

test('progress is remembered in the browser, and bad stored data is ignored', () => {
  const storage = fakeStorage();
  const a = createProgress(ids, storage);
  a.markOpened(ids[0]);
  a.setName('Ada');
  assert.equal(createProgress(ids, storage).counts().opened, 1);
  assert.equal(createProgress(ids, storage).getName(), 'Ada');
  storage.setItem('apothecary-ghost:progress', '{not json');
  assert.equal(createProgress(ids, storage).counts().opened, 0);
  const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  const blocked = createProgress(ids, throwing);
  blocked.markOpened(ids[0]);
  assert.equal(blocked.counts().opened, 1);
});

test('visitor names are cleaned before they go on the certificate', () => {
  assert.equal(sanitizeName('  Ada   Lovelace \n'), 'Ada Lovelace');
  assert.equal(sanitizeName('<b>Ada</b>'), 'bAda/b');
  assert.equal(sanitizeName('x'.repeat(80)).length, 40);
  assert.equal(sanitizeName(null), '');
});

test('remembrances: add, clean, remove, and notice blocked storage', async () => {
  const { createStore, cleanText } = await import('../public/remember.js');
  const storage = fakeStorage();
  const store = createStore(storage);
  assert.equal(store.isKeeping(), true);
  assert.equal(store.add('', 'a line'), null);
  assert.equal(store.add('Grandma', '   '), null);
  const entry = store.add('  Grandma  ', 'She\n sang   to the garden.');
  assert.equal(entry.who, 'Grandma');
  assert.equal(entry.line, 'She sang to the garden.');
  assert.equal(createStore(storage).list().length, 1);
  store.remove(entry.id);
  assert.equal(createStore(storage).list().length, 0);
  assert.equal(cleanText('x'.repeat(300), 140).length, 140);
  const blocked = createStore({
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => {},
  });
  assert.equal(blocked.isKeeping(), false);
  assert.ok(blocked.add('Ada', 'still works in memory'));
  assert.equal(blocked.list().length, 1);
});

test('privacy: the remembrance, certificate and progress code never send anything anywhere', () => {
  for (const file of ['remember.js', 'certificate.js', 'progress.js']) {
    const src = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    for (const banned of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'new Image(']) {
      assert.ok(!src.includes(banned), `${file} uses ${banned}`);
    }
  }
});

test('chat bubbles never reuse the shop ghost\'s "ghost" class (it floats absolutely)', () => {
  const chat = readFileSync(new URL('../public/chat.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/extras.css', import.meta.url), 'utf8');
  assert.ok(!/addBubble\('ghost/.test(chat));
  assert.ok(!/\.bubble\.ghost\b/.test(css));
  assert.match(chat, /addBubble\('from-ghost'/);
});

test('text wraps to the width it is given', () => {
  const measure = (s) => s.length * 10;
  const lines = wrapText(measure, 'one two three four five six', 100);
  assert.ok(lines.every((l) => measure(l) <= 100 || !l.includes(' ')));
  assert.equal(lines.join(' '), 'one two three four five six');
});
