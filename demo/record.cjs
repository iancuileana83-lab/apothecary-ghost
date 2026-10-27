// Records the app walkthrough with Playwright (same approach as the earlier demo videos).
// Each scene is timed to its narration clip; the marks go to demo/marks.json for build.py.
// No keys or personal data appear: the page only shows the app, and the visitor name is made up.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const URL = 'http://localhost:3000/';
const PAD = 0.6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wavDuration(file) {
  const b = fs.readFileSync(file);
  const byteRate = b.readUInt32LE(28);
  for (let off = 12; off < b.length; ) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'data') return size / byteRate;
    off += 8 + size;
  }
  throw new Error('no data chunk in ' + file);
}

const segments = JSON.parse(fs.readFileSync(path.join(HERE, 'narration.json'), 'utf8')).segments;
const dur = Object.fromEntries(segments.map((s) => [s.id, wavDuration(path.join(HERE, 'audio', s.id + '.wav')) + PAD]));

// a glowing ring that follows the mouse, since headless video has no cursor
const cursorScript = () => {
  window.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    Object.assign(c.style, {
      position: 'fixed', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ffd9a0',
      background: 'rgba(255,217,160,0.3)', boxShadow: '0 0 12px #ffb54a', pointerEvents: 'none',
      zIndex: '2147483647', left: '-60px', top: '-60px', transform: 'translate(-50%,-50%)',
    });
    document.body.append(c);
    document.addEventListener('mousemove', (e) => {
      c.style.left = e.clientX + 'px';
      c.style.top = e.clientY + 'px';
    }, true);
  });
};

(async () => {
  fs.rmSync(path.join(HERE, 'rec'), { recursive: true, force: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(HERE, 'rec'), size: { width: 1280, height: 720 } },
  });
  await ctx.addInitScript(cursorScript);
  const p = await ctx.newPage();
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const marks = {};

  const moveTo = async (locator, steps = 22) => {
    const box = await locator.boundingBox();
    if (box) await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
  };

  // a scene runs fn, then waits until the narration clip has had its full time
  const scene = async (id, fn) => {
    const start = now();
    const length = dur[id];
    const custom = await fn(length);
    const left = length - (now() - start);
    if (left > 0) await sleep(left * 1000);
    marks[id] = { ranges: custom || [[start, now()]] };
  };

  // one chat exchange; returns the parts of the recording worth keeping (the wait is trimmed)
  async function chatExchange(question, attempts = 1, hold = 1.4) {
    for (let a = 1; a <= attempts; a++) {
      if (a > 1) {
        // the model was slow or failed: start over on a clean page so the log shows only the good take
        await p.reload({ waitUntil: 'networkidle' });
        await sleep(4200);
      }
      const tType = now();
      await p.locator('#chat-input').click();
      await p.locator('#chat-input').pressSequentially(question, { delay: 45 });
      await sleep(250);
      await p.keyboard.press('Enter');
      const tThink = now();
      await p.waitForFunction(() => !document.querySelector('.bubble.thinking'), null, { timeout: 75000 });
      const tReply = now();
      await p.waitForFunction(() => !document.querySelector('.chat-ask').disabled, null, { timeout: 30000 });
      await sleep(hold * 1000);
      const tEnd = now();
      const last = await p.locator('.bubble.from-ghost').last().innerText();
      if (/guttering/.test(last)) {
        if (a < attempts) continue;
        throw new Error('the model never answered; not shipping a demo that shows an error');
      }
      return tReply - tThink > 1.8 ? [[tType, tThink + 1.2], [tReply - 0.15, tEnd]] : [[tType, tEnd]];
    }
  }

  await p.goto(URL, { waitUntil: 'networkidle' });
  await sleep(2200);

  // 1. the shop and its ghost
  await scene('s01', async () => {
    await p.mouse.move(760, 330, { steps: 20 });
  });

  // 2. hover the jars: whispers and levitation
  await scene('s02', async (len) => {
    const jars = p.locator('#shop .jar');
    const each = (len - 0.6) / 4;
    for (let i = 0; i < 4; i++) {
      const t = now();
      await moveTo(jars.nth(i), 18);
      await sleep(Math.max(200, each * 1000 - (now() - t) * 1000));
    }
  });

  // 3. a jar card writes itself out
  await scene('s03', async (len) => {
    const t = now();
    await moveTo(p.locator('#shop .jar').first(), 18);
    await p.locator('#shop .jar').first().click();
    await sleep(Math.max(0, (len - 1.4 - (now() - t)) * 1000));
    await p.locator('#card-close').click();
  });

  // 4. a poison jar: the ghost turns green and a candle gutters out, then relights
  await scene('s04', async (len) => {
    const t = now();
    await moveTo(p.locator('#shop .jar.poison').first(), 20);
    await sleep(Math.max(0, (len * 0.62 - (now() - t)) * 1000));
    await p.mouse.move(640, 420, { steps: 25 });
  });

  // 5. the Poison cabinet
  await scene('s05', async (len) => {
    await p.locator('#nav a[href="#/poison"]').click();
    await sleep(900);
    const jars = p.locator('#cabinet-jars .jar');
    for (let i = 0; i < 4; i++) {
      await moveTo(jars.nth(i), 18);
      await sleep(((len - 1.4) / 4) * 1000 - 400);
    }
  });

  // 6. the Ofrenda: light all ten candles, marigolds bloom, the ghost says thanks
  await scene('s06', async (len) => {
    await p.locator('#nav a[href="#/ofrenda"]').click();
    await sleep(500);
    const arch = () => p.evaluate(() => document.getElementById('arch').getBoundingClientRect().top + window.scrollY - 70);
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), await arch());
    await sleep(700);
    const lights = p.locator('.light');
    for (let i = 0; i < 5; i++) {
      await moveTo(lights.nth(i), 10);
      await lights.nth(i).click();
      await sleep(180);
    }
    await p.evaluate(() => window.scrollBy({ top: 430, behavior: 'smooth' }));
    await sleep(700);
    for (let i = 5; i < 10; i++) {
      await moveTo(lights.nth(i), 10);
      await lights.nth(i).click();
      await sleep(180);
    }
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), await arch());
    await sleep(Math.max(3500, len * 400));
  });

  // 7. the quiz
  await scene('s07', async () => {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.locator('#nav a[href="#/quiz"]').click();
    await sleep(700);
    for (const id of ['modern', 'modern', 'both']) {
      await moveTo(p.locator(`.q-option[data-id="${id}"]`), 14);
      await p.locator(`.q-option[data-id="${id}"]`).click();
      await sleep(1000);
      await p.locator('.q-next').click();
      await sleep(250);
    }
  });

  // 8. the chat page and its greeting
  await scene('s08', async () => {
    await p.locator('#nav a[href="#/chat"]').click();
    await sleep(1500);
    await moveTo(p.locator('.chip').nth(2), 20);
  });

  // 8b. the server guard rails (the chat stays on screen)
  await scene('s08b', async () => {
    await moveTo(p.locator('.chat-banner'), 20);
  });

  // 9. a history answer
  await scene('s09', async () => chatExchange('Who was Edward Stone?', 4));

  // 10. a refusal (held a little longer so the redirect can be read)
  await scene('s10', async () => chatExchange('Should I take willow bark for a headache?', 1, 3.2));

  // 11. the certificate (earned off-camera: progress is set, then the page reloads)
  const ids = await p.evaluate(async () => (await (await fetch('/api/facts')).json()).remedies.map((r) => r.id));
  await p.evaluate((all) => localStorage.setItem('apothecary-ghost:progress', JSON.stringify({ opened: all, quiz: true, name: '', certVisited: false })), ids);
  await p.goto(URL + '#/certificate', { waitUntil: 'networkidle' });
  await p.reload({ waitUntil: 'networkidle' });
  await sleep(1500);
  await scene('s11', async (len) => {
    await moveTo(p.locator('#cert-name'), 18);
    await p.locator('#cert-name').click();
    await p.locator('#cert-name').pressSequentially('Alex Rivers', { delay: 90 });
    await moveTo(p.locator('.cert-write'), 14);
    await p.locator('.cert-write').click();
    await sleep(700);
    await p.evaluate(() => window.scrollTo({ top: document.querySelector('.cert-canvas').getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' }));
    await sleep(Math.max(0, (len - 4.2) * 1000));
  });

  fs.writeFileSync(path.join(HERE, 'marks.json'), JSON.stringify(marks, null, 2));
  await sleep(500);
  const video = p.video();
  await ctx.close();
  const file = await video.path();
  fs.copyFileSync(file, path.join(HERE, 'rec', 'page.webm'));
  await b.close();
  console.log('recorded', JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, v.ranges.map((r) => r.map((x) => +x.toFixed(1)))]))));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
