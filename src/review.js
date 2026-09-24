import { shuffle } from './jigsaw.js';

export const REVIEW_LIMIT = 3;

export function topMissed(cells, counts, limit = REVIEW_LIMIT) {
  return cells
    .filter((cell) => (counts[cell.id] || 0) > 0)
    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function choiceOptions(item, pool, rand, n = 4) {
  const others = pool.filter((cell) => cell.id !== item.id);
  const picks = shuffle(others, rand).slice(0, Math.max(0, n - 1));
  return shuffle([item, ...picks], rand);
}
