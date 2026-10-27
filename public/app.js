const JAR_SVG = `
<svg viewBox="0 0 100 130" role="img" aria-hidden="true" focusable="false">
  <rect class="cork" x="34" y="4" width="32" height="14" rx="3"/>
  <path class="glass" d="M30 18h40v10c10 6 16 16 16 30v50c0 10-8 18-18 18H32c-10 0-18-8-18-18V58c0-14 6-24 16-30z"/>
  <path class="fill" d="M18 70h64v38c0 8-6 14-14 14H32c-8 0-14-6-14-14z"/>
  <rect class="tag" x="28" y="62" width="44" height="30" rx="2"/>
  <path class="shine" d="M24 48c0-8 4-12 8-15" />
</svg>`;

const shop = document.getElementById('shop');
const card = document.getElementById('card');

function el(tag, props = {}, text) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeJar(remedy, warning) {
  const btn = el('button', { type: 'button', className: 'jar' });
  btn.setAttribute('aria-label', remedy.name + (remedy.poison ? '. ' + warning : ''));
  btn.style.setProperty('--jar', remedy.jar.color);
  btn.style.setProperty('--delay', (Math.random() * 4).toFixed(2) + 's');
  btn.innerHTML = JAR_SVG;
  btn.append(el('span', { className: 'jar-label' }, remedy.jar.label));
  if (remedy.poison) btn.classList.add('poison');
  btn.addEventListener('click', () => openCard(remedy, warning));
  return btn;
}

function openCard(remedy, warning) {
  document.getElementById('card-title').textContent = remedy.name;
  const warn = document.getElementById('card-warning');
  warn.hidden = !remedy.poison;
  warn.textContent = remedy.poison ? warning : '';
  const then = document.getElementById('card-then');
  then.replaceChildren(...remedy.then.map((t) => el('li', {}, t)));
  document.getElementById('card-now').textContent = remedy.now;
  const sources = document.getElementById('card-sources');
  sources.replaceChildren(
    ...remedy.sources.map((s) => {
      const li = el('li');
      li.append(el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title));
      return li;
    }),
  );
  card.showModal();
}

document.getElementById('card-close').addEventListener('click', () => card.close());
card.addEventListener('click', (e) => {
  if (e.target === card) card.close();
});

async function init() {
  try {
    const res = await fetch('/api/facts');
    if (!res.ok) throw new Error(res.status);
    const facts = await res.json();
    const half = Math.ceil(facts.remedies.length / 2);
    shop.replaceChildren(
      ...[facts.remedies.slice(0, half), facts.remedies.slice(half)].map((row) => {
        const shelf = el('div', { className: 'shelf' });
        shelf.append(...row.map((r) => makeJar(r, facts.poisonWarning)));
        return shelf;
      }),
    );
  } catch {
    shop.replaceChildren(el('p', { className: 'loading' }, 'The shelves are dark. Please reload the page.'));
  }
}

init();
