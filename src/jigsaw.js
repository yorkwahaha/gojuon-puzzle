export const TAB_FRAC = 0.11;

export function seeded(n) {
  let x = Math.abs(n | 0) % 233280;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

export function shuffle(list, rand) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function makeJigsaw(cols, rows, seed) {
  const rand = seeded(seed + cols * 31 + rows * 17);
  const h = Array.from({ length: rows }, () =>
    Array.from({ length: Math.max(cols - 1, 0) }, () => (rand() < 0.5 ? 1 : -1))
  );
  const v = Array.from({ length: Math.max(rows - 1, 0) }, () =>
    Array.from({ length: cols }, () => (rand() < 0.5 ? 1 : -1))
  );
  return { h, v };
}

export function pieceEdges(col, row, cols, rows, jig) {
  return {
    top: row === 0 ? 0 : -jig.v[row - 1][col],
    right: col === cols - 1 ? 0 : jig.h[row][col],
    bottom: row === rows - 1 ? 0 : jig.v[row][col],
    left: col === 0 ? 0 : -jig.h[row][col - 1],
  };
}

function edge(x0, y0, x1, y1, kind, ox, oy, depth) {
  if (!kind) return `L${x1} ${y1}`;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const tx = x1 - x0;
  const ty = y1 - y0;
  const len = Math.hypot(tx, ty) || 1;
  const ux = tx / len;
  const uy = ty / len;
  const w = len * 0.08;
  const d = depth * kind * 0.82;
  const sx = mx - ux * w * 1.35;
  const sy = my - uy * w * 1.35;
  const ex = mx + ux * w * 1.35;
  const ey = my + uy * w * 1.35;
  const cx = mx + ox * d;
  const cy = my + oy * d;
  return [
    `L${sx} ${sy}`,
    `C${sx + ox * d * 0.32} ${sy + oy * d * 0.32} ${cx - ux * w} ${cy - uy * w} ${cx} ${cy}`,
    `C${cx + ux * w} ${cy + uy * w} ${ex + ox * d * 0.32} ${ey + oy * d * 0.32} ${ex} ${ey}`,
    `L${x1} ${y1}`,
  ].join(' ');
}

export function jigsawPath(edges) {
  const a = TAB_FRAC / (1 + 2 * TAB_FRAC);
  const z = 1 - a;
  return [
    `M${a} ${a}`,
    edge(a, a, z, a, edges.top, 0, -1, a),
    edge(z, a, z, z, edges.right, 1, 0, a),
    edge(z, z, a, z, edges.bottom, 0, 1, a),
    edge(a, z, a, a, edges.left, -1, 0, a),
    'Z',
  ].join('');
}

export function fittedImage(cols, rows, imgW, imgH) {
  if (!imgW || !imgH) {
    return { drawW: cols, drawH: rows, offsetX: 0, offsetY: 0 };
  }
  const boardAspect = cols / rows;
  const imgAspect = imgW / imgH;
  if (imgAspect > boardAspect) {
    const drawW = cols;
    const drawH = cols / imgAspect;
    return { drawW, drawH, offsetX: 0, offsetY: (rows - drawH) / 2 };
  }
  const drawH = rows;
  const drawW = rows * imgAspect;
  return { drawW, drawH, offsetX: (cols - drawW) / 2, offsetY: 0 };
}

export function faceBackground(col, row, cell, fit) {
  const t = TAB_FRAC;
  return {
    backgroundSize: `${fit.drawW * cell}px ${fit.drawH * cell}px`,
    backgroundPosition: `${(fit.offsetX - (col - t)) * cell}px ${(fit.offsetY - (row - t)) * cell}px`,
    backgroundRepeat: 'no-repeat',
  };
}
