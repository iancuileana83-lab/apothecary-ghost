// "An invisible quill": the card's text writes itself word by word, line by line.

// Wraps each word of every element in a span that fades in at a staggered delay.
// Returns the scratch-sound segments ({ at, dur } in seconds) and the total duration.
export function writeLines(elements) {
  let t = 0.2;
  const segments = [];
  for (const el of elements) {
    const words = el.textContent.split(/(\s+)/);
    el.replaceChildren();
    const start = t;
    for (const token of words) {
      if (token === '') continue;
      if (/^\s+$/.test(token)) {
        el.append(document.createTextNode(token));
        continue;
      }
      const span = document.createElement('span');
      span.className = 'qw';
      span.textContent = token;
      span.style.setProperty('--d', t.toFixed(2) + 's');
      el.append(span);
      t += 0.03 + token.length * 0.012;
    }
    segments.push({ at: start, dur: t - start });
    t += 0.3;
  }
  return { segments, total: t };
}
