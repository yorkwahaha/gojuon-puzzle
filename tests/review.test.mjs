import assert from 'node:assert/strict';
import test from 'node:test';
import { seeded } from '../src/jigsaw.js';
import { chartCells } from '../src/kana.js';
import { choiceOptions, derange, soundOf, withoutHomophones } from '../src/review.js';

function fixedPoints(source, next) {
  return source.filter((item, index) => item.id === next[index]?.id).length;
}

test('a two-item review never lines up with the prompts', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  for (let seed = 0; seed < 240; seed += 1) {
    const next = derange(items, seeded(seed + 404));
    assert.equal(fixedPoints(items, next), 0);
    assert.deepEqual(next.map((item) => item.id).sort(), ['a', 'b']);
  }
  assert.deepEqual(items.map((item) => item.id), ['a', 'b']);
});

test('listen mode drops only the three homophone spellings', () => {
  assert.equal(chartCells('seion').length - withoutHomophones(chartCells('seion')).length, 1);
  assert.equal(chartCells('dakuon').length - withoutHomophones(chartCells('dakuon')).length, 2);
  assert.equal(chartCells('all').length - withoutHomophones(chartCells('all')).length, 3);
  assert.equal(withoutHomophones(chartCells('youon')).length, chartCells('youon').length);
});

test('a spoken prompt does not offer a homophone as another right answer', () => {
  const pool = [
    { id: 'ji', key: 'ji' },
    { id: 'di', key: 'di' },
    { id: 'zu', key: 'zu' },
    { id: 'du', key: 'du' },
    { id: 'a', key: 'a' },
    { id: 'i', key: 'i' },
    { id: 'o', key: 'o' },
    { id: 'wo', key: 'wo' },
  ];
  for (let seed = 0; seed < 40; seed += 1) {
    const options = choiceOptions(pool[0], pool, seeded(seed));
    assert.equal(options.filter((item) => soundOf(item.key) === 'ji').length, 1);
    assert.equal(options.some((item) => item.key === 'di'), false);
  }
  assert.equal(soundOf('du'), 'zu');
  assert.equal(soundOf('wo'), 'o');
});

test('a three-item review keeps every answer off its prompt row', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const seen = new Set();
  for (let seed = 0; seed < 240; seed += 1) {
    const next = derange(items, seeded(seed + 404));
    assert.equal(fixedPoints(items, next), 0);
    seen.add(next.map((item) => item.id).join(''));
  }
  assert.equal(seen.size, 2);
});
