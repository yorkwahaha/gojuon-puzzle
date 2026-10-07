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
