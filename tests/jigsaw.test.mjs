import assert from 'node:assert/strict';
import test from 'node:test';
import { fittedImage, makeJigsaw, pieceEdges } from '../src/jigsaw.js';

test('the picture covers every cell instead of leaving empty side bars', () => {
  const narrow = fittedImage(14, 7, 1373, 1000);
  const wide = fittedImage(14, 7, 2017, 1000);
  assert.ok(narrow.drawW >= 14);
  assert.ok(narrow.drawH >= 7);
  assert.ok(wide.drawW >= 14);
  assert.ok(wide.drawH >= 7);
});

test('neighboring tabs are complements', () => {
  const cols = 4;
  const rows = 3;
  const jig = makeJigsaw(cols, rows, 7);
  const corner = pieceEdges(0, 0, cols, rows, jig);
  assert.equal(corner.left, 0);
  assert.equal(corner.top, 0);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const left = pieceEdges(col, row, cols, rows, jig);
      const right = pieceEdges(col + 1, row, cols, rows, jig);
      assert.equal(left.right, -right.left);
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const top = pieceEdges(col, row, cols, rows, jig);
      const bottom = pieceEdges(col, row + 1, cols, rows, jig);
      assert.equal(top.bottom, -bottom.top);
    }
  }
});
