import { buildMotes, buildPapel, makeCandle, makeCobweb, scatterPetals } from './decor.js';
import { createHaunt, prefersCalm } from './haunt.js';
import { renderOfrenda } from './ofrenda.js';
import { renderQuiz } from './quiz.js';
import { writeLines } from './quill.js';
import { createAmbient } from './sound.js';

const SKULL = `
  <g class="skull">
    <path d="M39 108l22 12M61 108L39 120" stroke="#eadfc2" stroke-width="3" stroke-linecap="round"/>
    <circle cx="38" cy="107" r="2.2" fill="#eadfc2"/><circle cx="62" cy="107" r="2.2" fill="#eadfc2"/>
    <circle cx="38" cy="121" r="2.2" fill="#eadfc2"/><circle cx="62" cy="121" r="2.2" fill="#eadfc2"/>
    <circle cx="50" cy="107" r="7" fill="#eadfc2"/>
    <rect x="46" y="111" width="8" height="5" rx="1.5" fill="#eadfc2"/>
    <circle cx="47.2" cy="106.5" r="1.9" fill="#2b1d12"/><circle cx="52.8" cy="106.5" r="1.9" fill="#2b1d12"/>
    <path d="M50 109.5l-1 2h2z" fill="#2b1d12"/>
  </g>`;

const WAX = `
  <g class="wax-seal">
    <rect x="29" y="2" width="42" height="19" rx="6"/>
    <rect x="35" y="16" width="6" height="12" rx="3"/>
    <rect x="56" y="16" width="6" height="15" rx="3"/>
    <circle cx="38" cy="29" r="3.6"/><circle cx="59" cy="32" r="4"/>
    <path class="wax-shine" d="M34 8h12" />
  </g>`;

function jarSvg(remedy) {
  const words = remedy.jar.label.split(' ');
  const longest = Math.max(...words.map((w) => w.length));
  const cap = [13, 11, 9.5][words.length - 1];
  const size = Math.min(cap, 58 / (longest * 0.56)).toFixed(1);
  const ys = [[80], [74, 87], [70, 80, 90]][words.length - 1];
  const lines = words
    .map((w, i) => `<text x="50" y="${ys[i]}" font-size="${size}" text-anchor="middle">${w}</text>`)
    .join('');
  return `
<svg viewBox="0 0 100 130" role="img" aria-hidden="true" focusable="false">
  <rect class="cork" x="34" y="4" width="32" height="14" rx="3"/>
  <path class="glass" d="M30 18h40v10c10 6 16 16 16 30v50c0 10-8 18-18 18H32c-10 0-18-8-18-18V58c0-14 6-24 16-30z"/>
  <path class="fill" d="M18 70h64v38c0 8-6 14-14 14H32c-8 0-14-6-14-14z"/>
  <rect class="tag" x="19" y="60" width="62" height="35" rx="2"/>
  <g class="tag-text">${lines}</g>
  <path class="shine" d="M24 48c0-8 4-12 8-15" />
  ${remedy.poison ? SKULL + WAX : ''}
</svg>`;
}

const shop = document.getElementById('shop');
const card = document.getElementById('card');
const whisper = document.getElementById('whisper');
const ghost = document.getElementById('ghost');

const ambient = createAmbient();
const haunt = createHaunt({
  ghost,
  scene: document.querySelector('.scene'),
  windowEl: document.getElementById('window'),
});

let greeting = '';
let guttered = null;
let whisperTimer;

function el(tag, props = {}, text) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (text !== undefined) node.textContent = text;
  return node;
}

// The ghost only speaks wording from the approved fact sheet.
function say(text) {
  clearTimeout(whisperTimer);
  whisper.textContent = text;
  whisper.classList.add('on');
  ghost.classList.add('listening');
}

function sayGreeting() {
  whisperTimer = setTimeout(() => {
    whisper.textContent = greeting;
    ghost.classList.remove('listening');
  }, 900);
}

function firstSentence(text) {
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : text;
}

function whisperFor(remedy, warning) {
  return remedy.poison ? warning : firstSentence(remedy.then[0]);
}

// Over a poison jar the ghost turns sickly green and the nearest candle gutters out;
// when the visitor moves away it relights.
function relight() {
  if (!guttered) return;
  const candle = guttered;
  guttered = null;
  candle.classList.remove('out');
  candle.classList.add('relight');
  candle
    .querySelector('.flame')
    .addEventListener('animationend', () => candle.classList.remove('relight'), { once: true });
}

function overPoison(jar, over) {
  ghost.classList.toggle('sick', over);
  relight();
  if (!over || prefersCalm()) return;
  const jb = jar.getBoundingClientRect();
  const jx = jb.left + jb.width / 2;
  const jy = jb.top + jb.height / 2;
  let best = null;
  let bestDist = Infinity;
  for (const c of document.querySelectorAll('.candle')) {
    const b = c.getBoundingClientRect();
    const d = Math.hypot(b.left + b.width / 2 - jx, b.top + b.height / 2 - jy);
    if (d < bestDist) [best, bestDist] = [c, d];
  }
  if (best) {
    best.classList.add('out');
    guttered = best;
  }
}

// ghostly jars make the ghost whisper and react; the Poison cabinet's jars just open their card
function makeJar(remedy, warning, { ghostly = true } = {}) {
  const btn = el('button', { type: 'button', className: 'jar' });
  btn.setAttribute('aria-label', remedy.name + (remedy.poison ? '. ' + warning : ''));
  btn.style.setProperty('--jar', remedy.jar.color);
  btn.style.setProperty('--delay', (Math.random() * 4).toFixed(2) + 's');
  btn.innerHTML = jarSvg(remedy);
  if (remedy.poison) btn.classList.add('poison');
  const line = whisperFor(remedy, warning);
  const enter = () => {
    say(line);
    if (remedy.poison) overPoison(btn, true);
  };
  const leave = () => {
    sayGreeting();
    if (remedy.poison) overPoison(btn, false);
  };
  if (ghostly) {
    btn.addEventListener('pointerenter', enter);
    btn.addEventListener('focus', enter);
    btn.addEventListener('pointerleave', leave);
    btn.addEventListener('blur', leave);
  }
  btn.addEventListener('click', () => openCard(remedy, warning));
  return btn;
}

function makeShelf(remedies, warning) {
  const shelf = el('div', { className: 'shelf' });
  const jars = el('div', { className: 'jars' });
  jars.append(...remedies.map((r) => makeJar(r, warning)));
  shelf.append(
    makeCobweb('left'),
    makeCobweb('right'),
    makeCandle('shelf-candle left'),
    makeCandle('shelf-candle right'),
    jars,
  );
  const petals = el('div', { className: 'petals' });
  scatterPetals(petals, 4);
  shelf.append(petals);
  return shelf;
}

function openCard(remedy, warning) {
  document.getElementById('card-title').textContent = remedy.name;
  const warn = document.getElementById('card-warning');
  warn.hidden = !remedy.poison;
  warn.textContent = remedy.poison ? warning : '';
  const thenItems = remedy.then.map((t) => el('li', {}, t));
  document.getElementById('card-then').replaceChildren(...thenItems);
  const now = document.getElementById('card-now');
  now.textContent = remedy.now;
  card.classList.remove('skip', 'writing');
  ambient.stopScratch();
  document.getElementById('card-sources').replaceChildren(
    ...remedy.sources.map((s) => {
      const li = el('li');
      li.append(el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title));
      return li;
    }),
  );
  card.showModal();
  // the banner and the poison warning stay visible at once; only the history is written out
  if (!prefersCalm()) {
    const { segments } = writeLines([...thenItems, now]);
    card.classList.add('writing');
    ambient.scratch(segments);
  }
}

document.getElementById('card-close').addEventListener('click', () => card.close());
card.addEventListener('close', () => ambient.stopScratch());
// a click anywhere on the card finishes the writing at once
card.querySelector('article').addEventListener('click', () => {
  card.classList.add('skip');
  ambient.stopScratch();
});
card.addEventListener('click', (e) => {
  if (e.target === card) card.close();
});

// decor
buildPapel(document.getElementById('papel'));
buildMotes(document.getElementById('motes'));
scatterPetals(document.getElementById('petals'), 16);
const counter = document.querySelector('.counter');
counter.append(makeCandle('counter-candle left'), makeCandle('counter-candle right'));

// optional ambient sound, off until the visitor asks for it
const soundBtn = document.getElementById('sound');
soundBtn.addEventListener('click', async () => {
  try {
    const on = await ambient.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.textContent = on ? 'Sound: on' : 'Sound: off';
  } catch {
    soundBtn.disabled = true;
    soundBtn.textContent = 'Sound unavailable';
  }
});

// rooms: #/shop, #/poison, #/ofrenda
const rooms = ['shop', 'poison', 'ofrenda', 'quiz'];
const main = document.getElementById('main');
const navLinks = [...document.querySelectorAll('#nav a')];
let firstRoute = true;

function route() {
  const name = (location.hash.match(/^#\/(\w+)/) || [])[1];
  const room = rooms.includes(name) ? name : 'shop';
  main.dataset.view = room;
  for (const r of rooms) document.getElementById('view-' + r).hidden = r !== room;
  for (const a of navLinks) {
    if (a.getAttribute('href') === '#/' + room) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (room === 'shop') haunt.measure();
  if (!firstRoute) {
    window.scrollTo(0, 0);
    document.querySelector('#view-' + room + ' h2')?.focus({ preventScroll: true });
  }
  firstRoute = false;
}
window.addEventListener('hashchange', route);

async function init() {
  try {
    const res = await fetch('/api/facts');
    if (!res.ok) throw new Error(res.status);
    const facts = await res.json();
    greeting = facts.greeting;
    whisper.textContent = greeting;
    whisper.classList.add('on');
    const half = Math.ceil(facts.remedies.length / 2);
    shop.replaceChildren(
      makeShelf(facts.remedies.slice(0, half), facts.poisonWarning),
      makeShelf(facts.remedies.slice(half), facts.poisonWarning),
    );
    haunt.setJars([...shop.querySelectorAll('.jar')]);
    haunt.start();

    document.getElementById('cabinet-warning').textContent = facts.cabinetWarning;
    document.getElementById('cabinet-jars').replaceChildren(
      ...facts.remedies.filter((r) => r.poison).map((r) => makeJar(r, facts.poisonWarning, { ghostly: false })),
    );
    renderOfrenda(document.getElementById('altar'), document.getElementById('candle-count'), facts.people, {
      ghostBox: document.getElementById('altar-ghost'),
      ghostSvg: ghost.querySelector('svg'),
      thanks: facts.thanks,
    });

    const byId = Object.fromEntries(facts.remedies.map((r) => [r.id, r]));
    renderQuiz(document.getElementById('quiz-body'), facts.quiz, (id) => openCard(byId[id], facts.poisonWarning));
  } catch {
    shop.replaceChildren(el('p', { className: 'loading' }, 'The shelves are dark. Please reload the page.'));
  }
}

route();
init();
