import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const facts = JSON.parse(readFileSync(new URL('../data/facts.json', import.meta.url), 'utf8'));
const { remedies } = facts;

test('the sheet holds the 8 approved remedies', () => {
  assert.deepEqual(
    remedies.map((r) => r.id).sort(),
    ['arsenic', 'cinchona-quinine', 'cod-liver-oil', 'foxglove', 'laudanum', 'leeches', 'mercury', 'willow-bark'],
  );
});

test('each remedy has 2-3 facts, a "now" line and https sources', () => {
  for (const r of remedies) {
    assert.ok(r.then.length >= 2 && r.then.length <= 3, `${r.id} fact count`);
    assert.ok(r.now.length > 0, `${r.id} now`);
    assert.ok(r.sources.length >= 2, `${r.id} sources`);
    for (const s of r.sources) assert.match(s.url, /^https:\/\//, `${r.id} source url`);
  }
});

test('foxglove, laudanum, mercury and arsenic are flagged poisonous; the rest are not', () => {
  const poison = remedies.filter((r) => r.poison).map((r) => r.id).sort();
  assert.deepEqual(poison, ['arsenic', 'foxglove', 'laudanum', 'mercury']);
  assert.equal(facts.poisonWarning, 'Poisonous: never try at home.');
  assert.equal(facts.banner, 'History, not medical advice.');
});

test('no dosing or advice language anywhere in the sheet', () => {
  const text = JSON.stringify(remedies.map(({ then, now }) => ({ then, now }))).toLowerCase();
  for (const word of [' dose', 'dosage', ' mg', 'milligram', 'you should', 'we recommend', 'take ']) {
    assert.ok(!text.includes(word), `found "${word.trim()}"`);
  }
});

test('approved corrections are in place', () => {
  const byId = Object.fromEntries(remedies.map((r) => [r.id, r]));
  const all = (id) => byId[id].then.join(' ');
  assert.match(all('laudanum'), /Paracelsus/);
  assert.match(all('laudanum'), /1660s/);
  assert.ok(!all('laudanum').includes('1683'));
  assert.match(all('mercury'), /1950s/);
  assert.match(all('mercury'), /pink disease/);
  assert.match(all('cod-liver-oil'), /1928 Nobel Prize in Chemistry/);
  assert.match(byId['cod-liver-oil'].now, /greatly reduced/);
  assert.match(all('cinchona-quinine'), /formal synthesis/);
  for (const r of remedies) {
    for (const s of r.sources) assert.ok(!/wikipedia/i.test(s.url), `${r.id} cites Wikipedia`);
  }
});

test('every jar has a Latin label and the ghost has the approved greeting', () => {
  for (const r of remedies) {
    assert.match(r.jar.label, /^[A-Z][a-z]+( [A-Z][a-z]+){0,2}$/, `${r.id} label`);
  }
  const label = (id) => remedies.find((r) => r.id === id).jar.label;
  assert.equal(label('cod-liver-oil'), 'Oleum Jecoris Aselli');
  assert.equal(label('foxglove'), 'Folia Digitalis');
  assert.equal(facts.greeting, 'Welcome, traveller. Mind the candles. Which jar shall we open?');
});
