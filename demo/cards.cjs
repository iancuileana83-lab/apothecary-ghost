// Renders two still cards for the video: the phone views side by side, and the end card.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SHOTS = path.join(HERE, 'shots');
const DOCS = path.join(HERE, '..', 'docs', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const url = (f) => 'file:///' + f.replace(/\\/g, '/');

const base = `
  body { margin:0; width:1920px; height:1080px; display:flex; flex-direction:column; align-items:center; justify-content:center;
    font-family: Georgia, 'Palatino Linotype', serif; color:#f0e2c4;
    background: radial-gradient(ellipse at 50% 20%, #3a2417 0%, #130d0c 55%, #07060b 100%); }
  h1 { font-weight:normal; letter-spacing:.05em; color:#ffd9a0; text-shadow:0 0 24px rgba(255,181,74,.55); margin:0 0 14px; }
  p { margin:6px 0; }
`;

const phone = `<style>${base}
  .row { display:flex; gap:70px; align-items:center; }
  img { height:900px; border-radius:30px; border:3px solid #6c5130; box-shadow:0 0 50px rgba(255,170,60,.3); }
</style><div class="row"><img src="${url(path.join(DOCS, '08-phone-shop.png'))}"><img src="${url(path.join(DOCS, '09-phone-chat.png'))}"></div>`;

const end = `<style>${base}
  h1 { font-size:92px; } .sub { font-size:36px; color:#cfeaff; } .repo { font-size:42px; margin-top:34px; color:#ffc23d; }
  .small { font-size:30px; color:#b9a984; margin-top:26px; }
</style><h1>The Apothecary's Ghost</h1>
<p class="sub">A haunted apothecary shop, with Gemma (open weights) via the Gemini API</p>
<p class="repo">github.com/iancuileana83-lab/apothecary-ghost</p>
<p class="small">MIT license &middot; History, not medical advice.</p>`;

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  for (const [name, html] of [['phone', phone], ['endcard', end]]) {
    const f = path.join(SHOTS, name + '.html');
    fs.writeFileSync(f, html);
    await p.goto(url(f));
    await p.waitForLoadState('load');
    await p.screenshot({ path: path.join(SHOTS, name + '.png') });
  }
  await b.close();
  console.log('cards done');
})();
