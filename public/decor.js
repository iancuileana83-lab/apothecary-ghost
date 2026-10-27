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
