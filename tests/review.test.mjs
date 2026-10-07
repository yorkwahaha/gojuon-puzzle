import assert from 'node:assert/strict';
import test from 'node:test';
import { seeded } from '../src/jigsaw.js';
import { derange } from '../src/review.js';

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
