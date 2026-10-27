// The Apprentice Apothecary certificate: drawn on a canvas so it can be downloaded as an image.
// The visitor's name is only ever drawn as pixels; nothing is sent anywhere.

import { CERTIFICATE as T } from './texts.js';

const W = 1400;
const H = 1000;
const HAND = '"Ink Free", "Segoe Script", "Bradley Hand", "Segoe Print", "Brush Script MT", cursive';
const SERIF = 'Georgia, "Palatino Linotype", "Book Antiqua", serif';

export function sanitizeName(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Greedy word wrap; `measure` returns a pixel width for a string.
export function wrapText(measure, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function parchment(ctx) {
  const base = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 820);
  base.addColorStop(0, '#f3e5c0');
  base.addColorStop(0.7, '#e4cf9d');
  base.addColorStop(1, '#bf9c61');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // soft stains
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(120, 80, 30, ${0.015 + Math.random() * 0.03})`;
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 20 + Math.random() * 90, 0, Math.PI * 2);
    ctx.fill();
  }
  // darkened, burnt-looking edges
  const edge = ctx.createRadialGradient(W / 2, H / 2, 420, W / 2, H / 2, 860);
  edge.addColorStop(0, 'rgba(60, 30, 5, 0)');
  edge.addColorStop(1, 'rgba(60, 30, 5, 0.45)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
}

function frame(ctx) {
  ctx.strokeStyle = '#6b4a24';
  ctx.lineWidth = 12;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 3;
  ctx.strokeRect(64, 64, W - 128, H - 128);
  // little corner flourishes
  ctx.lineWidth = 3;
  for (const [x, y, sx, sy] of [[64, 64, 1, 1], [W - 64, 64, -1, 1], [64, H - 64, 1, -1], [W - 64, H - 64, -1, -1]]) {
    ctx.beginPath();
    ctx.arc(x + sx * 34, y + sy * 34, 22, 0, Math.PI * 2);
    ctx.moveTo(x + sx * 6, y + sy * 6);
    ctx.lineTo(x + sx * 56, y + sy * 56);
    ctx.stroke();
  }
}

function waxSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  // irregular wax blob with a couple of drips
  ctx.beginPath();
  const points = 30;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (0.9 + 0.12 * Math.sin(i * 2.3) + 0.06 * Math.cos(i * 5.1));
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const wax = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  wax.addColorStop(0, '#d8483a');
  wax.addColorStop(0.6, '#a5251b');
  wax.addColorStop(1, '#6e130c');
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = wax;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // pressed ring and monogram
  ctx.strokeStyle = 'rgba(70, 8, 4, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(70, 8, 4, 0.6)';
  ctx.font = `bold ${Math.round(r * 0.7)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AG', 0, 4);
  ctx.strokeStyle = 'rgba(255, 190, 170, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
}

export function drawCertificate(canvas, rawName, date = formatDate()) {
  const name = sanitizeName(rawName);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  parchment(ctx);
  frame(ctx);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#3b2412';

  ctx.font = `bold 58px ${SERIF}`;
  const titleLines = wrapText((s) => ctx.measureText(s).width, T.heading, 1000);
  titleLines.forEach((line, i) => ctx.fillText(line, W / 2, 190 + i * 70));

  ctx.font = `italic 32px ${SERIF}`;
  ctx.fillText(T.certifies, W / 2, 390);

  // the name, shrunk if it is long
  let size = 96;
  ctx.font = `${size}px ${HAND}`;
  while (ctx.measureText(name).width > 1000 && size > 40) {
    size -= 4;
    ctx.font = `${size}px ${HAND}`;
  }
  ctx.fillStyle = '#2b1d12';
  ctx.fillText(name, W / 2, 500);
  ctx.strokeStyle = 'rgba(59, 36, 18, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(250, 525);
  ctx.lineTo(W - 250, 525);
  ctx.stroke();

  ctx.fillStyle = '#3b2412';
  ctx.font = `34px ${SERIF}`;
  const lines = wrapText((s) => ctx.measureText(s).width, T.body, 960);
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 610 + i * 50));

  ctx.font = `italic 26px ${SERIF}`;
  ctx.fillStyle = '#5b3d20';
  ctx.fillText(T.footer, W / 2, 735);

  // signature (left), date (right), wax seal (centre)
  ctx.fillStyle = '#2b1d12';
  ctx.font = `36px ${HAND}`;
  ctx.fillText(T.signature, 340, 880);
  ctx.fillText(date, W - 310, 880);
  ctx.strokeStyle = 'rgba(59, 36, 18, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, 895);
  ctx.lineTo(570, 895);
  ctx.moveTo(W - 540, 895);
  ctx.lineTo(W - 120, 895);
  ctx.stroke();
  waxSeal(ctx, W / 2, 845, 66);
  return name;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Locked until earned; then a name form, the drawn certificate, and a download button.
export function renderCertificate(root, progress) {
  const paint = () => {
    const { opened, total } = progress.counts();
    if (!progress.earned()) {
      root.replaceChildren(el('p', 'cert-locked', T.locked(opened, total)));
      return;
    }
    const wrap = el('div', 'cert-earned');
    wrap.append(el('p', 'cert-offer', T.offer));

    const form = el('form', 'cert-form');
    const label = el('label', '', T.nameLabel);
    const input = el('input');
    input.type = 'text';
    input.maxLength = 40;
    input.autocomplete = 'off';
    input.required = true;
    input.value = progress.getName();
    input.id = 'cert-name';
    label.htmlFor = 'cert-name';
    const write = el('button', 'cert-write', T.write);
    write.type = 'submit';
    form.append(label, input, write);

    const result = el('div', 'cert-result');
    const show = (name) => {
      const canvas = el('canvas', 'cert-canvas');
      canvas.setAttribute('role', 'img');
      const clean = drawCertificate(canvas, name);
      canvas.setAttribute('aria-label', `${T.heading}: ${clean}`);
      const download = el('button', 'cert-download', T.download);
      download.type = 'button';
      download.addEventListener('click', () => {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = T.filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
      });
      result.replaceChildren(canvas, download);
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = sanitizeName(input.value);
      if (!name) return;
      input.value = name;
      progress.setName(name);
      show(name);
    });
    wrap.append(form, result);
    root.replaceChildren(wrap);
    if (progress.getName()) show(progress.getName());
  };

  // Redraw only when the earned state changes, so typing a name is never interrupted
  let wasEarned = null;
  progress.onChange(() => {
    const now = progress.earned();
    if (now !== wasEarned || !now) paint();
    wasEarned = now;
  });
  wasEarned = progress.earned();
  paint();
}
