// The Ofrenda: a candle for each person from the fact sheet. Lit candles are remembered
// in this browser only (localStorage), and the page works fine if that is unavailable.

import { buildArch, ensureMarigoldSymbol, makeCandle, marigoldSvg, scatterPetals } from './decor.js';

const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

const KEY = 'apothecary-ghost:candles';

function loadLit() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveLit(lit) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...lit]));
  } catch {
    // private window or blocked storage: the candles simply won't be remembered
  }
}

const BUST = `<svg viewBox="0 0 80 90" aria-hidden="true" focusable="false">
  <ellipse cx="40" cy="45" rx="36" ry="42" fill="rgba(0,0,0,.35)" stroke="#8a6a3a" stroke-width="2.5"/>
  <circle cx="40" cy="34" r="13" fill="#7a6a52"/>
  <path d="M14 78c2-20 14-27 26-27s24 7 26 27c-8 8-16 11-26 11s-18-3-26-11z" fill="#7a6a52"/>
</svg>`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderOfrenda(altar, countEl, people, { ghostBox, ghostSvg, thanks } = {}) {
  const lit = loadLit();
  ensureMarigoldSymbol();
  buildArch(document.getElementById('arch'));
  let playing = false;

  // when every candle is lit, Ambrose fades in above the altar, says his thanks, and fades away
  const playThanks = () => {
    if (playing || !ghostBox) return;
    playing = true;
    const figure = ghostBox.querySelector('.ag-figure');
    const line = ghostBox.querySelector('.ag-line');
    const copy = ghostSvg.cloneNode(true);
    for (const node of copy.querySelectorAll('*')) {
      if (node.id) node.id += '-altar';
      const fill = node.getAttribute('fill');
      if (fill && fill.startsWith('url(#')) node.setAttribute('fill', fill.replace(')', '-altar)'));
      node.style.transform = '';
    }
    figure.replaceChildren(copy);
    line.textContent = thanks || '';
    line.hidden = !thanks;
    ghostBox.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => ghostBox.classList.add('shown')));
    setTimeout(() => ghostBox.classList.remove('shown'), calm.matches ? 8000 : 9500);
    setTimeout(() => {
      ghostBox.hidden = true;
      playing = false;
    }, calm.matches ? 8200 : 13000);
  };

  const updateCount = () => {
    countEl.textContent = `${lit.size} of ${people.length} candles lit`;
  };

  altar.replaceChildren(
    ...people.map((p) => {
      const card = el('article', 'person');
      const bust = el('div', 'bust');
      bust.innerHTML = BUST + marigoldSvg('marigold-beside');
      card.append(bust, el('h3', '', p.name), el('p', 'bio', p.bio));

      const sources = el('ul', 'p-sources');
      for (const s of p.sources) {
        const li = el('li');
        const a = el('a', '', s.title);
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.append(a);
        sources.append(li);
      }
      card.append(sources);

      const button = el('button', 'light');
      button.type = 'button';
      button.setAttribute('aria-label', `Candle for ${p.name}`);
      const candle = makeCandle();
      const label = el('span', 'light-text');
      button.append(candle, label);

      const paint = () => {
        const on = lit.has(p.id);
        candle.classList.toggle('unlit', !on);
        button.setAttribute('aria-pressed', String(on));
        label.textContent = on ? 'Candle lit' : 'Light a candle';
        card.classList.toggle('glowing', on);
      };
      button.addEventListener('click', () => {
        if (lit.has(p.id)) lit.delete(p.id);
        else lit.add(p.id);
        saveLit(lit);
        paint();
        updateCount();
        if (lit.size === people.length) playThanks();
      });
      paint();
      card.append(button);
      return card;
    }),
  );

  const petals = el('div', 'petals');
  scatterPetals(petals, 22);
  altar.append(petals);
  updateCount();
}
