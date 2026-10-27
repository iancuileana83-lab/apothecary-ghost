// Decorative layers: papel picado, marigold petals, dust motes, candles, cobwebs.
// Everything here is cosmetic and hidden from assistive tech.

const rand = (min, max) => min + Math.random() * (max - min);

const FLAG_COLORS = ['#d6336c', '#f08c00', '#12b886', '#fab005', '#7048e8', '#e8590c'];

// One flag: a rectangle with a zigzag hem and cut-out holes (even-odd fill).
function flagSvg(color) {
  return `<svg viewBox="0 0 60 50" focusable="false"><path fill="${color}" fill-rule="evenodd" d="
    M2 0h56v40l-7 8-7-8-7 8-7-8-7 8-7-8-7 8-7-8z
    M30 9a6 6 0 1 0 0.1 0z
    M30 22l5 5-5 5-5-5z
    M12 12l3 3-3 3-3-3z M48 12l3 3-3 3-3-3z
    M12 28a2.5 2.5 0 1 0 0.1 0z M48 28a2.5 2.5 0 1 0 0.1 0z"/></svg>`;
}

export function buildPapel(container, count = 11) {
  container.innerHTML = '<span class="papel-string"></span>';
  for (let i = 0; i < count; i++) {
    const flag = document.createElement('span');
    flag.className = 'flag';
    flag.innerHTML = flagSvg(FLAG_COLORS[i % FLAG_COLORS.length]);
    flag.style.setProperty('--sway', rand(5, 9).toFixed(1) + 's');
    flag.style.setProperty('--delay', (-rand(0, 8)).toFixed(1) + 's');
    container.append(flag);
  }
}

export function scatterPetals(container, count) {
  for (let i = 0; i < count; i++) {
    const petal = document.createElement('span');
    petal.className = 'petal';
    petal.style.left = rand(1, 97).toFixed(1) + '%';
    petal.style.top = rand(8, 85).toFixed(1) + '%';
    petal.style.setProperty('--rot', rand(0, 180).toFixed(0) + 'deg');
    petal.style.setProperty('--size', rand(9, 16).toFixed(0) + 'px');
    container.append(petal);
  }
}

export function buildMotes(container, count = 26) {
  for (let i = 0; i < count; i++) {
    const mote = document.createElement('span');
    mote.className = 'mote';
    mote.style.left = rand(8, 92).toFixed(1) + '%';
    mote.style.top = rand(6, 80).toFixed(1) + '%';
    mote.style.setProperty('--dur', rand(9, 20).toFixed(1) + 's');
    mote.style.setProperty('--delay', (-rand(0, 20)).toFixed(1) + 's');
    mote.style.setProperty('--drift', rand(-26, 26).toFixed(0) + 'px');
    container.append(mote);
  }
}

export function makeCandle(className = '') {
  const candle = document.createElement('div');
  candle.className = ('candle ' + className).trim();
  candle.setAttribute('aria-hidden', 'true');
  candle.style.setProperty('--flick', rand(1.1, 2.1).toFixed(2) + 's');
  candle.style.setProperty('--delay', (-rand(0, 3)).toFixed(2) + 's');
  candle.innerHTML = '<span class="halo"></span><span class="flame"></span><span class="wax"></span>';
  return candle;
}

const COBWEB = `<svg viewBox="0 0 60 60" focusable="false" aria-hidden="true">
  <path d="M0 0h60M0 0l56 24M0 0l44 44M0 0l24 56M0 0v60" />
  <path d="M14 0q3 8-0 14 M0 14q8 3 14 0" />
  <path d="M30 0q4 14 -2 26q-12 4-28 4" />
  <path d="M46 0q4 22-10 36q-14 12-36 10" />
</svg>`;

export function makeCobweb(side) {
  const web = document.createElement('span');
  web.className = 'cobweb ' + side;
  web.innerHTML = COBWEB;
  return web;
}

// One shared marigold drawing that other SVGs reference with <use href="#marigold">.
export function ensureMarigoldSymbol() {
  if (document.getElementById('marigold')) return;
  const ring = (n, cy, rx, ry, fill, turn) =>
    Array.from(
      { length: n },
      (_, i) =>
        `<ellipse cx="0" cy="${-cy}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${((i * 360) / n + turn).toFixed(1)})"/>`,
    ).join('');
  const holder = document.createElement('div');
  holder.className = 'svg-defs';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML = `<svg width="0" height="0" focusable="false"><symbol id="marigold" viewBox="-20 -20 40 40">
    ${ring(12, 10, 5, 8, '#f08c00', 0)}${ring(10, 7, 4.2, 6.5, '#ffa927', 18)}${ring(8, 4.5, 3.2, 4.8, '#ffc53d', 0)}
    <circle r="2.6" fill="#e8590c"/></symbol></svg>`;
  document.body.append(holder);
}

export function marigoldSvg(className) {
  return `<svg class="${className}" viewBox="-20 -20 40 40" aria-hidden="true" focusable="false"><use href="#marigold"/></svg>`;
}

// An arch of marigolds and leaves, drawn along a half ellipse.
export function buildArch(container) {
  ensureMarigoldSymbol();
  const cx = 500;
  const cy = 186;
  const rx = 468;
  const ry = 158;
  const at = (t, scale = 1) => ({
    x: cx - Math.cos(Math.PI * t) * rx * scale,
    y: cy - Math.sin(Math.PI * t) * ry * scale,
    tangent: (Math.atan2(Math.cos(Math.PI * t) * ry * scale, Math.sin(Math.PI * t) * rx * scale) * 180) / Math.PI,
  });
  const out = [];
  for (let i = 0; i <= 48; i++) {
    const p = at(i / 48, rand(0.93, 1.03));
    const green = rand(0, 1) < 0.5 ? '#2f6b3a' : '#3f8a4a';
    out.push(
      `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="16" ry="6" fill="${green}" transform="rotate(${(p.tangent + rand(-40, 40)).toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`,
    );
  }
  const flowers = (count, scale, min, max) => {
    for (let i = 0; i <= count; i++) {
      const p = at(i / count, scale);
      const size = rand(min, max);
      const x = p.x + rand(-6, 6) - size / 2;
      const y = p.y + rand(-6, 6) - size / 2;
      out.push(
        `<use href="#marigold" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(0)}" height="${size.toFixed(0)}" transform="rotate(${rand(0, 180).toFixed(0)} ${(x + size / 2).toFixed(1)} ${(y + size / 2).toFixed(1)})"/>`,
      );
    }
  };
  flowers(30, 1, 40, 56);
  flowers(24, 0.9, 26, 38);
  container.innerHTML = `<svg viewBox="0 0 1000 190" preserveAspectRatio="xMidYMax meet" focusable="false">${out.join('')}</svg>`;
}
