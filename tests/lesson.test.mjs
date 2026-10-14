import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonParams, parseLesson } from '../src/room.js';

test('lesson query round-trips the assigned chart, mode, size, shape, and puzzle', () => {
  const params = lessonParams({
    chartId: 'youon',
    modeId: 'listen-kata',
    sizeId: '6x3',
    shape: 'rect',
    puzzleId: './puzzles/世界.webp',
  });

  assert.deepEqual(parseLesson(`?${params}`), {
    chartId: 'youon',
    modeId: 'listen-kata',
    sizeId: '6x3',
    shape: 'rect',
    puzzleId: '世界.webp',
  });
});

test('a link without a puzzle is not a teacher assignment', () => {
  assert.equal(parseLesson('?room=ABCD&mode=kata-hira'), null);
});

test('unknown lesson fields fall back to the default round', () => {
  assert.deepEqual(parseLesson('?mode=nope&chart=nope&size=nope&shape=nope&puzzle=missing.webp'), {
    chartId: 'seion',
    modeId: 'kata-hira',
    sizeId: '8x4',
    shape: 'jigsaw',
    puzzleId: 'missing.webp',
  });
});
