const files = import.meta.glob('./puzzles/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
  query: '?url',
});

const demo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#c9784f"/><rect x="80" y="80" width="1440" height="740" fill="#f3ead8"/><text x="800" y="500" text-anchor="middle" font-size="220" fill="#6e2f24">あ</text></svg>'
)}`;

export const PUZZLES = [
  ...Object.entries(files)
    .map(([path, url]) => {
      const file = path.split('/').pop();
      const name = file.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
      return { id: path, name, url, bgm: name };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')),
  ...(Object.keys(files).length ? [] : [{ id: 'demo', name: '示範・あ', url: demo }]),
];

export function puzzleById(id) {
  return PUZZLES.find((item) => item.id === id) || PUZZLES[0];
}

