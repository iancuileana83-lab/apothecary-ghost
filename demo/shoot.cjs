// Takes the screenshots for the DEV post into docs/screenshots.
// Run with the app already started (npm start). Uses the Playwright install from an earlier project.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path');

const URL = 'http://localhost:3000/';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAME = 'Alex Rivers'; // a made-up visitor name: no personal data in any screenshot

async function ghostVisible(p) {
  await p.waitForFunction(() => parseFloat(getComputedStyle(document.getElementById('ghost')).opacity) > 0.74, null, { timeout: 25000 });
}

async function chatAsk(p, text) {
  await p.locator('#chat-input').fill(text);
  await p.locator('.chat-ask').click();
  await p.waitForFunction(() => !document.querySelector('.bubble.thinking') && !document.querySelector('.chat-ask').disabled, null, { timeout: 70000 });
  await sleep(600);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await sleep(1500);

  // 1. the haunted shop, the ghost visible, whispering over a jar
  await ghostVisible(p);
  await p.locator('#shop .jar').nth(1).hover();
  await sleep(1200);
  await p.screenshot({ path: path.join(OUT, '01-haunted-shop.png') });

  // 2. a jar card, after the quill has written it out
  await p.locator('#shop .jar').first().click();
  await sleep(600);
  await p.locator('#card article').click(); // finishes the writing
  await sleep(500);
  await p.screenshot({ path: path.join(OUT, '02-jar-card.png') });
  await p.locator('#card-close').click();

  // 3. the poison cabinet
  await p.locator('#nav a[href="#/poison"]').click();
  await sleep(1200);
  await p.screenshot({ path: path.join(OUT, '03-poison-cabinet.png') });

  // 4. the Ofrenda with every candle lit and the ghost's thanks
  await p.locator('#nav a[href="#/ofrenda"]').click();
  await sleep(800);
  const lights = p.locator('.light');
  for (let i = 0; i < 10; i++) {
    await lights.nth(i).click();
    await sleep(120);
  }
  await p.evaluate(() => window.scrollTo(0, document.getElementById('arch').getBoundingClientRect().top + window.scrollY - 150));
  await sleep(4200);
  await p.screenshot({ path: path.join(OUT, '04-ofrenda-thanks.png') });

  // 5. the quiz, one answered question
  await p.locator('#nav a[href="#/quiz"]').click();
  await sleep(600);
  await p.locator('.q-option[data-id="modern"]').click();
  await sleep(500);
  await p.screenshot({ path: path.join(OUT, '05-quiz.png') });

  // 6. the ghost chat: one history answer and one refusal
  await p.locator('#nav a[href="#/chat"]').click();
  await sleep(3500);
  await chatAsk(p, 'Who was Edward Stone?');
  await chatAsk(p, 'Should I take willow bark for a headache?');
  await sleep(3000);
  await p.screenshot({ path: path.join(OUT, '06-ghost-chat.png') });

  // 7. the certificate, earned the real way: all 8 jars, then the whole quiz
  await p.locator('#nav a[href="#/shop"]').click();
  await sleep(500);
  const jars = p.locator('#shop .jar');
  for (let i = 0; i < 8; i++) {
    await jars.nth(i).click();
    await sleep(150);
    await p.locator('#card-close').click();
  }
  await p.locator('#nav a[href="#/quiz"]').click();
  for (let i = 0; i < 8; i++) {
    if (i === 0) await p.locator('.q-option').nth(0).click().catch(() => {});
    else await p.locator('.q-option').nth(0).click();
    await p.locator('.q-next').click();
  }
  await p.locator('#nav-cert').click();
  await sleep(500);
  await p.locator('#cert-name').fill(NAME);
  await p.locator('.cert-write').click();
  await sleep(800);
  await p.evaluate(() => window.scrollTo(0, document.querySelector('.cert-canvas').getBoundingClientRect().top + window.scrollY - 40));
  await sleep(500);
  await p.screenshot({ path: path.join(OUT, '07-certificate.png') });
  await p.locator('.cert-canvas').screenshot({ path: path.join(OUT, '07b-certificate-only.png') });
  await ctx.close();

  // 8. a phone: the shop and the chat
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await phone.newPage();
  await m.goto(URL, { waitUntil: 'networkidle' });
  await sleep(1500);
  await ghostVisible(m);
  await m.screenshot({ path: path.join(OUT, '08-phone-shop.png') });
  await m.locator('#nav a[href="#/chat"]').tap();
  await sleep(3500);
  await chatAsk(m, 'Tell me about willow bark');
  await sleep(2500);
  await m.evaluate(() => window.scrollTo(0, document.querySelector('.chat-log').getBoundingClientRect().top + window.scrollY - 150));
  await sleep(400);
  await m.screenshot({ path: path.join(OUT, '09-phone-chat.png') });
  await phone.close();
  await b.close();
  console.log('screenshots done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
