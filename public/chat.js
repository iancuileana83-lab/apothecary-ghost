// The ghost chat. The visitor's question goes to this app's own server (/api/chat), which keeps the
// Gemini key and talks to Gemma on Google's servers. Nothing runs on this laptop.

import { cloneGhost } from './decor.js';
import { CHAT_UI as T } from './texts.js';

const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initChat({ root, facts, ghostSvg }) {
  const refusals = facts.ghost.refusals;
  const history = [];
  let busy = false;
  let voiceOn = false;
  let finishTyping = null;

  // ----- layout -----
  const top = el('div', 'chat-top');
  const figure = el('div', 'chat-ghost');
  figure.setAttribute('aria-hidden', 'true');
  figure.append(cloneGhost(ghostSvg, 'chat'));
  top.append(figure, el('p', 'banner chat-banner', T.banner));

  const log = el('div', 'chat-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');

  const chips = el('div', 'chat-chips');
  for (const r of facts.remedies) {
    const chip = el('button', 'chip', r.name);
    chip.type = 'button';
    chip.addEventListener('click', () => send(`Tell me about ${r.name}`));
    chips.append(chip);
  }

  const form = el('form', 'chat-form');
  const label = el('label', 'sr', T.label);
  label.htmlFor = 'chat-input';
  const input = el('input');
  input.id = 'chat-input';
  input.type = 'text';
  input.maxLength = 300;
  input.autocomplete = 'off';
  input.placeholder = T.placeholder;
  const ask = el('button', 'chat-ask', T.ask);
  ask.type = 'submit';
  form.append(label, input, ask);

  const tools = el('div', 'chat-tools');
  const voice = el('button', 'chat-voice', T.voiceOff);
  voice.type = 'button';
  voice.setAttribute('aria-pressed', 'false');
  if ('speechSynthesis' in window) tools.append(voice);

  root.replaceChildren(top, log, chips, form, tools);

  // ----- helpers -----
  const scroll = () => {
    log.scrollTop = log.scrollHeight;
  };

  function addBubble(role, text) {
    const bubble = el('div', `bubble ${role}`);
    bubble.textContent = text;
    log.append(bubble);
    scroll();
    return bubble;
  }

  function speak(text) {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.pitch = 0.7;
    u.rate = 0.88;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  // typewriter; a click on the bubble finishes it at once
  function typeInto(bubble, text) {
    return new Promise((resolve) => {
      if (calm.matches) {
        bubble.textContent = text;
        scroll();
        resolve();
        return;
      }
      let i = 0;
      let timer;
      const done = () => {
        clearTimeout(timer);
        bubble.textContent = text;
        bubble.removeEventListener('click', done);
        finishTyping = null;
        scroll();
        resolve();
      };
      finishTyping = done;
      bubble.addEventListener('click', done);
      const step = () => {
        i += 1;
        bubble.textContent = text.slice(0, i);
        scroll();
        if (i >= text.length) done();
        else timer = setTimeout(step, 18);
      };
      step();
    });
  }

  async function ghostSays(text) {
    const bubble = addBubble('ghost', '');
    speak(text);
    await typeInto(bubble, text);
  }

  async function send(raw) {
    const message = raw.trim();
    if (!message || busy) return;
    if (finishTyping) finishTyping();
    busy = true;
    input.value = '';
    ask.disabled = true;
    addBubble('visitor', message);
    const thinking = addBubble('ghost thinking', T.thinking);
    figure.classList.add('thinking');

    let result;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: history.slice(-12) }),
        signal: AbortSignal.timeout(60000),
      });
      result = await res.json();
    } catch {
      result = { reply: refusals.unavailable, kind: 'unavailable' };
    }

    thinking.remove();
    figure.classList.remove('thinking');
    const reply = typeof result.reply === 'string' && result.reply ? result.reply : refusals.unavailable;
    await ghostSays(reply);
    if (result.kind === 'ok') history.push({ role: 'user', text: message }, { role: 'ghost', text: reply });
    busy = false;
    ask.disabled = false;
    input.focus();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(input.value);
  });

  voice.addEventListener('click', () => {
    voiceOn = !voiceOn;
    voice.setAttribute('aria-pressed', String(voiceOn));
    voice.textContent = voiceOn ? T.voiceOn : T.voiceOff;
    if (!voiceOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  });

  // the ghost opens with his approved greeting
  ghostSays(facts.greeting);
}
