// "Remedy or Poison?": questions come only from the fact sheet (data/facts.json, "quiz").

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function scoreMessage(score, total) {
  return `You scored ${score} of ${total}.`;
}

export function renderQuiz(body, quiz, openHistory, onFinish = () => {}) {
  const { questions, options } = quiz;
  let index = 0;
  let score = 0;

  function showQuestion() {
    const q = questions[index];
    const wrap = el('div', 'q');
    wrap.append(
      el('p', 'q-progress', `Question ${index + 1} of ${questions.length}`),
      el('h3', 'q-prompt', q.prompt),
    );

    const list = el('div', 'q-options');
    const feedback = el('div', 'q-feedback');
    feedback.setAttribute('aria-live', 'polite');
    const buttons = options.map((o) => {
      const b = el('button', 'q-option', o.label);
      b.type = 'button';
      b.dataset.id = o.id;
      return b;
    });

    const answer = (chosen) => {
      const right = chosen === q.answer;
      if (right) score++;
      for (const b of buttons) {
        b.disabled = true;
        if (b.dataset.id === q.answer) b.classList.add('right');
        else if (b.dataset.id === chosen) b.classList.add('wrong');
      }
      const last = index === questions.length - 1;
      const next = el('button', 'q-next', last ? 'See your score' : 'Next question');
      next.type = 'button';
      next.addEventListener('click', () => {
        index++;
        if (last) showScore();
        else showQuestion();
      });
      const history = el('button', 'q-history', 'Read the history');
      history.type = 'button';
      history.addEventListener('click', () => openHistory(q.remedyId));
      const actions = el('div', 'q-actions');
      actions.append(next, history);
      feedback.replaceChildren(el('p', 'q-verdict', right ? 'Correct.' : 'Not quite.'), el('p', 'q-explain', q.explanation), actions);
      next.focus();
    };
    for (const b of buttons) b.addEventListener('click', () => answer(b.dataset.id));

    list.append(...buttons);
    wrap.append(list, feedback);
    body.replaceChildren(wrap);
    buttons[0].focus({ preventScroll: true });
  }

  function showScore() {
    onFinish(score);
    const wrap = el('div', 'q');
    const again = el('button', 'q-next', 'Play again');
    again.type = 'button';
    again.addEventListener('click', () => {
      index = 0;
      score = 0;
      showQuestion();
    });
    wrap.append(el('h3', 'q-prompt', scoreMessage(score, questions.length)), again);
    body.replaceChildren(wrap);
    again.focus({ preventScroll: true });
  }

  showQuestion();
}
