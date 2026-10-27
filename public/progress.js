// What this visitor has done (jars opened, quiz finished, certificate name).
// Stored only in this browser (localStorage); if storage is blocked it simply lives in memory.

const KEY = 'apothecary-ghost:progress';

export function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function createProgress(remedyIds, storage = safeStorage()) {
  let state = { opened: [], quiz: false, name: '', certVisited: false };
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      state = {
        opened: Array.isArray(saved.opened) ? saved.opened.filter((id) => remedyIds.includes(id)) : [],
        quiz: saved.quiz === true,
        name: typeof saved.name === 'string' ? saved.name.slice(0, 40) : '',
        certVisited: saved.certVisited === true,
      };
    }
  } catch {
    // unreadable or blocked storage: start fresh
  }

  const listeners = new Set();
  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(state));
    } catch {
      // blocked: progress stays in memory for this visit
    }
    for (const fn of listeners) fn();
  };

  return {
    markOpened(id) {
      if (remedyIds.includes(id) && !state.opened.includes(id)) {
        state.opened.push(id);
        save();
      }
    },
    markQuizDone() {
      if (!state.quiz) {
        state.quiz = true;
        save();
      }
    },
    counts: () => ({ opened: state.opened.length, total: remedyIds.length, quizDone: state.quiz }),
    earned: () => state.opened.length >= remedyIds.length && state.quiz,
    getName: () => state.name,
    setName(name) {
      state.name = name;
      save();
    },
    certVisited: () => state.certVisited,
    markCertVisited() {
      if (!state.certVisited) {
        state.certVisited = true;
        save();
      }
    },
    onChange(fn) {
      listeners.add(fn);
    },
  };
}
