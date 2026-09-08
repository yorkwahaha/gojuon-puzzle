export const BOARD_SIZES = [
  { id: '6x3', cols: 6, rows: 3, label: '6 × 3' },
  { id: '8x4', cols: 8, rows: 4, label: '8 × 4' },
  { id: '10x5', cols: 10, rows: 5, label: '10 × 5' },
  { id: '12x6', cols: 12, rows: 6, label: '12 × 6' },
  { id: '14x7', cols: 14, rows: 7, label: '14 × 7' },
];

export function sizeCount(size) {
  return size.cols * size.rows;
}

export function containSize(srcW, srcH, boxW, boxH) {
  if (!srcW || !srcH || boxW <= 0 || boxH <= 0) {
    return { w: Math.max(boxW, 1), h: Math.max(boxH, 1) };
  }
  const scale = Math.min(boxW / srcW, boxH / srcH);
  return { w: srcW * scale, h: srcH * scale };
}

export function fitGrid(count, width, height) {
  const fallbackCols = Math.min(12, Math.max(count, 1));
  const fallbackRows = Math.ceil(count / fallbackCols);
  let best = {
    cols: fallbackCols,
    rows: fallbackRows,
    cell: Math.min(width / fallbackCols, height / fallbackRows),
    empty: fallbackCols * fallbackRows - count,
    score: -Infinity,
  };

  if (count <= 0 || width <= 0 || height <= 0) return best;

  const maxCols = Math.min(19, Math.max(count, 4));
  for (let cols = 4; cols <= maxCols; cols += 1) {
    const rows = Math.ceil(count / cols);
    if (rows > 14) continue;
    const cellW = width / cols;
    const cellH = height / rows;
    const cell = Math.min(cellW, cellH);
    if (cell < 32) continue;
    const empty = cols * rows - count;
    const squareness = Math.abs(1 - cellW / (cellH || 1));
    const preferred =
      (cols === 12 ? 6 : 0) +
      (cols === 10 ? 5 : 0) +
      (rows === 6 ? 5 : 0) +
      (rows === 10 ? 3 : 0);
    const score = cell * 2 - empty * 3.2 - squareness * 12 + preferred;
    if (score > best.score) {
      best = { cols, rows, cell, empty, score };
    }
  }

  return best;
}

export function slotPosition(index, cols, rows) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    col,
    row,
    x: cols <= 1 ? 0 : (col / (cols - 1)) * 100,
    y: rows <= 1 ? 0 : (row / (rows - 1)) * 100,
  };
}
