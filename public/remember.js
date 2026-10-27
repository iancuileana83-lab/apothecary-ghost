// "Leave a remembrance": a short line about someone the visitor misses, with a candle.
// It stays only in this browser (localStorage). It is never sent anywhere.

import { makeCandle } from './decor.js';
import { safeStorage } from './progress.js';
import { REMEMBER as T } from './texts.js';

const KEY = 'apothecary-ghost:remembrances';
const MAX_ENTRIES = 50;

export function cleanText(raw, max) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function createStore(storage = safeStorage()) {
  let entries = [];
  let keeping = true;
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? '[]');
    if (Array.isArray(saved)) {
      entries = saved
        .filter((e) => e && typeof e.id === 'string' && typeof e.who === 'string' && typeof e.line === 'string')
        .map((e) => ({ id: e.id, who: cleanText(e.who, 40), line: cleanText(e.line, 140) }));
    }
  } catch {
    entries = [];
  }
  try {
    // is storage really writable? (private windows and blocked site data can throw)
    storage.setItem(KEY + ':probe', '1');
    storage.removeItem(KEY + ':probe');
  } catch {
    keeping = false;
  }

  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(entries));
    } catch {
      keeping = false;
    }
  };

  return {
    list: () => entries.slice(),
    isKeeping: () => keeping,
    add(who, line) {
      const w = cleanText(who, 40);
      const l = cleanText(line, 140);
      if (!w || !l || entries.length >= MAX_ENTRIES) return null;
      const entry = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, who: w, line: l };
      entries.unshift(entry);
      save();
      return entry;
    },
    remove(id) {
      entries = entries.filter((e) => e.id !== id);
      save();
    },
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderRemember(root, store = createStore()) {
  root.replaceChildren();
  root.append(el('h3', 'rem-heading', T.heading), el('p', 'rem-help', T.help));

  const form = el('form', 'rem-form');
  const whoLabel = el('label', '', T.whoLabel);
  const who = el('input');
  who.type = 'text';
  who.maxLength = 40;
  who.required = true;
  who.autocomplete = 'off';
  who.id = 'rem-who';
  whoLabel.htmlFor = 'rem-who';
  const lineLabel = el('label', '', T.lineLabel);
  const line = el('textarea');
  line.maxLength = 140;
  line.rows = 2;
  line.required = true;
  line.id = 'rem-line';
  lineLabel.htmlFor = 'rem-line';
  const place = el('button', 'rem-place', T.place);
  place.type = 'submit';
  form.append(whoLabel, who, lineLabel, line, place);

  const privacy = el('p', 'rem-privacy', T.privacy);
  const blocked = el('p', 'rem-blocked', T.blocked);
  blocked.hidden = store.isKeeping();
  const list = el('ul', 'rem-list');

  const paint = () => {
    blocked.hidden = store.isKeeping();
    list.replaceChildren(
      ...store.list().map((e) => {
        const li = el('li', 'remembrance');
        li.append(makeCandle('rem-candle'));
        const text = el('div', 'rem-text');
        text.append(el('strong', '', e.who), el('p', '', e.line));
        const remove = el('button', 'rem-remove', T.remove);
        remove.type = 'button';
        remove.setAttribute('aria-label', `${T.remove}: ${e.who}`);
        remove.addEventListener('click', () => {
          store.remove(e.id);
          paint();
        });
        li.append(text, remove);
        return li;
      }),
    );
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (store.add(who.value, line.value)) {
      who.value = '';
      line.value = '';
      paint();
      who.focus();
    }
  });

  root.append(form, privacy, blocked, list);
  paint();
}
