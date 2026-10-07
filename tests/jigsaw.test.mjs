import assert from 'node:assert/strict';
import test from 'node:test';
import { BOARD_SIZES } from '../src/grid.js';
import { fittedImage, makeJigsaw, pieceEdges } from '../src/jigsaw.js';

test('the picture covers every cell instead of leaving empty side bars', () => {
  for (const size of BOARD_SIZES) {
    for (const [imgW, imgH] of [[1373, 1000], [1778, 1000], [2017, 1000]]) {
      const fit = fittedImage(size.cols, size.rows, imgW, imgH);
      assert.ok(fit.drawW >= size.cols, size.id);
      assert.ok(fit.drawH >= size.rows, size.id);
    }
  }
});

test('neighboring tabs are complements', () => {
  const cols = 14;
  const rows = 7;
  const jig = makeJigsaw(cols, rows, 99);
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
