const KEY = 'gojuon-puzzle-v1';

const defaults = {
  muted: false,
  bgmMuted: false,
  hints: true,
  best: {},
  levels: {},
  mistakes: {},
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults, best: {}, levels: {}, mistakes: {} };
    const parsed = JSON.parse(raw);
    return {
      muted: Boolean(parsed.muted),
      bgmMuted: Boolean(parsed.bgmMuted),
      hints: parsed.hints !== false,
      best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
      levels: parsed.levels && typeof parsed.levels === 'object' ? parsed.levels : {},
      mistakes: parsed.mistakes && typeof parsed.mistakes === 'object' ? parsed.mistakes : {},
    };
  } catch {
    return { ...defaults, best: {}, levels: {}, mistakes: {} };
  }
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadPrefs() {
  return read();
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
  mistakes.forEach(({ id, kana, romaji }) => {
    const previous = state.mistakes[id] || { id, kana, romaji, count: 0 };
    state.mistakes[id] = { ...previous, count: previous.count + 1 };
  });
  write(state);
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
