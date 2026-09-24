const KEY = 'gojuon-puzzle-v1';

const defaults = {
  muted: false,
  bgmMuted: false,
  shape: 'jigsaw',
  hints: true,
  best: {},
  levels: {},
  mistakes: {},
};

let memoryCache = null;

function cloneState(state) {
  if (!state) return { ...defaults, best: {}, levels: {}, mistakes: {} };
  return {
    ...state,
    best: { ...state.best },
    levels: Object.fromEntries(
      Object.entries(state.levels || {}).map(([k, v]) => [k, { ...v }])
    ),
    mistakes: Object.fromEntries(
      Object.entries(state.mistakes || {}).map(([k, v]) => [k, { ...v }])
    ),
  };
}

function read() {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      memoryCache = cloneState(defaults);
      return memoryCache;
    }
    const parsed = JSON.parse(raw);
    memoryCache = {
      muted: Boolean(parsed.muted),
      bgmMuted: Boolean(parsed.bgmMuted),
      shape: parsed.shape === 'rect' ? 'rect' : 'jigsaw',
      hints: parsed.hints !== false,
      best: parsed.best && typeof parsed.best === 'object' ? { ...parsed.best } : {},
      levels: parsed.levels && typeof parsed.levels === 'object'
        ? Object.fromEntries(Object.entries(parsed.levels).map(([k, v]) => [k, { ...v }]))
        : {},
      mistakes: parsed.mistakes && typeof parsed.mistakes === 'object'
        ? Object.fromEntries(Object.entries(parsed.mistakes).map(([k, v]) => [k, { ...v }]))
        : {},
    };
    return memoryCache;
  } catch {
    memoryCache = cloneState(defaults);
    return memoryCache;
  }
}

function write(state) {
  memoryCache = cloneState(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(memoryCache));
  } catch {
    // ignore quota or storage exceptions
  }
}

export function loadPrefs() {
  return cloneState(read());
}

export function savePrefs(patch) {
  const next = { ...read(), ...patch };
  write(next);
  return next;
}

export function bestKey(script, chart, layout) {
  return `${script}:${chart}:${layout}`;
}

export function getBest(script, chart, layout) {
  return read().best[bestKey(script, chart, layout)] ?? null;
}

export function recordLevelBest(puzzleId, sizeId, ms) {
  const state = read();
  const levels = { ...state.levels };
  const current = { ...(levels[puzzleId] || {}) };
  const prev = current[sizeId];
  const isBest = prev == null || ms < prev;
  if (isBest) {
    current[sizeId] = ms;
    levels[puzzleId] = current;
    state.levels = levels;
    write(state);
  }
  return { isBest, best: isBest ? ms : prev };
}

export function getLevelBest(puzzleId, sizeId) {
  return read().levels[puzzleId]?.[sizeId] ?? null;
}

export function getLevelRecords(puzzleId) {
  const times = read().levels[puzzleId] || {};
  return Object.entries(times)
    .map(([sizeId, ms]) => ({ sizeId, ms }))
    .sort((a, b) => a.ms - b.ms);
}

export function recordMistakes(mistakes) {
  const state = read();
  const nextMistakes = { ...state.mistakes };
  mistakes.forEach(({ id, kana, romaji }) => {
    const previous = nextMistakes[id] || { id, kana, romaji, count: 0 };
    nextMistakes[id] = { ...previous, count: previous.count + 1 };
  });
  write({ ...state, mistakes: nextMistakes });
}

export function getWeakest(limit = 3) {
  return Object.values(read().mistakes)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
