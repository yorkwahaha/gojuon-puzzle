const files = import.meta.glob('./puzzles/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
  query: '?url',
});

const demo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#c9784f"/><rect x="80" y="80" width="1440" height="740" fill="#f3ead8"/><text x="800" y="500" text-anchor="middle" font-size="220" fill="#6e2f24">あ</text></svg>'
)}`;

const BGM_BY_NAME = {
  五条悟: '五条悟',
  伏黑甚爾: '伏黑甚爾',
  兩面宿儺: '兩面宿儺',
  東方仗助: '東方仗助',
  空條承太郎IV: '空條承太郎IV',
  狼嵜光: 'Medalist',
  結束祈: 'Medalist',
};

export const PUZZLES = [
  ...Object.entries(files)
    .map(([path, url]) => {
      const file = path.split('/').pop();
      const name = file.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
      return { id: path, name, url, bgm: BGM_BY_NAME[name] || null };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')),
  ...(Object.keys(files).length ? [] : [{ id: 'demo', name: '示範・あ', url: demo }]),
];

export function puzzleById(id) {
  if (!id) return PUZZLES[0];
  return PUZZLES.find((item) => item.id === id)
    || PUZZLES.find((item) => item.id.endsWith(`/${id}`))
    || PUZZLES[0];
}

