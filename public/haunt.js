// Movement that makes the shop feel haunted. All of it stops under reduced motion.
// Kept light: one rAF loop capped at ~30 fps, and everything else is CSS.

const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
const rand = (min, max) => min + Math.random() * (max - min);

export function createHaunt({ ghost, scene, windowEl }) {
  const svg = ghost.querySelector('svg');
  const eyes = [...ghost.querySelectorAll('.eye')];
  const moon = document.querySelector('.moonbeam');

  let jars = []; // { el, x, w, lift }
  let sceneX = 0;
  let raf = 0;
  let lastFrame = 0;
  let pointer = null;
  let aimQueued = false;
  let wispTimer;
  let stormTimer;
  let mistTimer;
  let running = false;

  function measure() {
    const r = scene.getBoundingClientRect();
    sceneX = r.left + r.width / 2 + window.scrollX;
    for (const j of jars) {
      const b = j.el.getBoundingClientRect();
      j.x = b.left + b.width / 2 + window.scrollX;
      j.w = b.width;
    }
  }

  function setJars(list) {
    jars = list.map((el) => ({ el, x: 0, w: 0, lift: 0 }));
    measure();
  }

  // the ghost floats up and down, drifts sideways, and jars rise as he passes
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < 33) return;
    lastFrame = now;
    const t = now / 1000;
    const x = Math.sin(t / 9) * scene.clientWidth * 0.3 + Math.sin(t / 3.7) * 6;
    const y = Math.sin(t / 3.1) * 7 + Math.sin(t / 5.3) * 3;
    ghost.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    const gx = sceneX + x;
    for (const j of jars) {
      const k = Math.max(0, 1 - Math.abs(j.x - gx) / (j.w * 0.95));
      const lift = Math.round(k * k * 20) / 2; // up to 10px, in half-pixel steps
      if (lift !== j.lift) {
        j.lift = lift;
        j.el.style.setProperty('--lift', lift);
      }
    }
  }

  // his eyes follow the mouse
  function aim() {
    aimQueued = false;
    if (!pointer) {
      for (const e of eyes) e.style.transform = '';
      return;
    }
    const r = svg.getBoundingClientRect();
    const s = r.width / 200;
    const dx = pointer.x - (r.left + 100 * s);
    const dy = pointer.y - (r.top + 80 * s);
    const dist = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, dist / 180) * 3.2;
    const move = `translate(${((dx / dist) * reach).toFixed(2)}px, ${((dy / dist) * reach).toFixed(2)}px)`;
    for (const e of eyes) e.style.transform = move;
  }

  function onPointerMove(e) {
    pointer = { x: e.clientX, y: e.clientY };
    if (!aimQueued) {
      aimQueued = true;
      requestAnimationFrame(aim);
    }
  }

  function onPointerLeave() {
    pointer = null;
    if (!aimQueued) {
      aimQueued = true;
      requestAnimationFrame(aim);
    }
  }

  // small wispy spirits drift across the screen and fade
  function spawnWisp() {
    if (document.hidden || document.querySelectorAll('.wisp').length >= 2) return;
    const wisp = document.createElement('div');
    wisp.className = 'wisp' + (Math.random() < 0.5 ? ' reverse' : '');
    wisp.setAttribute('aria-hidden', 'true');
    wisp.style.top = rand(12, 78).toFixed(0) + 'vh';
    wisp.style.setProperty('--dur', rand(15, 24).toFixed(1) + 's');
    wisp.style.setProperty('--bob', rand(18, 46).toFixed(0) + 'px');
    wisp.innerHTML = '<span class="wisp-body"></span>';
    wisp.addEventListener('animationend', () => wisp.remove());
    document.body.append(wisp);
  }

  function scheduleWisp(first) {
    wispTimer = setTimeout(
      () => {
        spawnWisp();
        scheduleWisp(false);
      },
      first ? 6000 : rand(14000, 30000),
    );
  }

  // a rare, slow swell of light through the window (never a fast flash), then words in the mist
  function storm(withLightning) {
    if (withLightning) {
      windowEl.classList.add('flash');
      moon.classList.add('flash');
      setTimeout(() => {
        windowEl.classList.remove('flash');
        moon.classList.remove('flash');
      }, 3600);
    }
    mistTimer = setTimeout(() => {
      windowEl.classList.add('writing');
      setTimeout(() => windowEl.classList.remove('writing'), 10500);
    }, withLightning ? 1500 : 0);
  }

  function scheduleStorm(first) {
    stormTimer = setTimeout(
      () => {
        storm(Math.random() < 0.6);
        scheduleStorm(false);
      },
      first ? 11000 : rand(45000, 85000),
    );
  }

  function start() {
    if (running || calm.matches) return;
    running = true;
    measure();
    raf = requestAnimationFrame(frame);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    scheduleWisp(true);
    scheduleStorm(true);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(wispTimer);
    clearTimeout(stormTimer);
    clearTimeout(mistTimer);
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    ghost.style.transform = '';
    for (const e of eyes) e.style.transform = '';
    for (const j of jars) {
      j.lift = 0;
      j.el.style.removeProperty('--lift');
    }
    for (const w of document.querySelectorAll('.wisp')) w.remove();
    windowEl.classList.remove('flash', 'writing');
    moon.classList.remove('flash');
  }

  window.addEventListener('resize', measure);
  calm.addEventListener('change', () => (calm.matches ? stop() : start()));

  return { start, setJars };
}

export const prefersCalm = () => calm.matches;
