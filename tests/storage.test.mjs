import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryLocalStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

globalThis.localStorage = new MemoryLocalStorage();
const storage = await import('../src/storage.js');

test('saving a preference does not overwrite progress written by another tab', () => {
  storage.loadPrefs();
  localStorage.setItem('gojuon-puzzle-v1', JSON.stringify({
    muted: false,
    bgmMuted: false,
    shape: 'jigsaw',
    hints: true,
    best: {},
    levels: {'./puzzles/demo.webp': {'8x4': 1234}},
    mistakes: {},
  }));

  storage.savePrefs({shape: 'rect'});
  const persisted = JSON.parse(localStorage.getItem('gojuon-puzzle-v1'));
  assert.equal(persisted.shape, 'rect');
  assert.equal(persisted.levels['./puzzles/demo.webp']['8x4'], 1234);
});

test('wrong placements accumulate into the weakest kana list', () => {
  storage.recordMistakes([{ id: 'seion-a', kana: 'あ', romaji: 'a' }]);
  storage.recordMistakes([
    { id: 'seion-a', kana: 'あ', romaji: 'a' },
    { id: 'seion-i', kana: 'い', romaji: 'i' },
  ]);
  const weakest = storage.getWeakest(3);
  const a = weakest.find((item) => item.id === 'seion-a');
  assert.equal(a.kana, 'あ');
  assert.equal(a.count, 2);
  assert.ok(weakest.findIndex((item) => item.id === 'seion-a') < weakest.findIndex((item) => item.id === 'seion-i'));
});

test('temporary localStorage eviction does not destroy the in-memory session progress', () => {
  localStorage.setItem('gojuon-puzzle-v1', JSON.stringify({
    muted: false,
    bgmMuted: false,
    shape: 'jigsaw',
    hints: true,
    best: {},
    levels: {'./puzzles/demo.webp': {'10x5': 31000}},
    mistakes: {},
  }));
  storage.loadPrefs();

  localStorage.removeItem('gojuon-puzzle-v1');
  storage.savePrefs({bgmMuted: true});

  const persisted = JSON.parse(localStorage.getItem('gojuon-puzzle-v1'));
  assert.equal(persisted.bgmMuted, true);
  assert.equal(persisted.levels['./puzzles/demo.webp']['10x5'], 31000);
});
