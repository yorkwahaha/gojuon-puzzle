import { shuffle } from './jigsaw.js';

const SAME_SOUND = { di: 'ji', du: 'zu', wo: 'o' };

export function soundOf(key) {
  return SAME_SOUND[key] || key;
}

export function derange(list, rand) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const REVIEW_LIMIT = 3;

export function topMissed(cells, counts, limit = REVIEW_LIMIT) {
  return cells
    .filter((cell) => (counts[cell.id] || 0) > 0)
    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function choiceOptions(item, pool, rand, n = 4) {
  const sound = soundOf(item.key);
  const others = pool.filter((cell) => cell.id !== item.id && soundOf(cell.key) !== sound);
  const picks = shuffle(others, rand).slice(0, Math.max(0, n - 1));
  return shuffle([item, ...picks], rand);
}
