const SEION_ROWS = [
  { id: 'a', h: 'あ', k: 'ア', cells: ['a', 'i', 'u', 'e', 'o'] },
  { id: 'ka', h: 'か', k: 'カ', cells: ['ka', 'ki', 'ku', 'ke', 'ko'] },
  { id: 'sa', h: 'さ', k: 'サ', cells: ['sa', 'shi', 'su', 'se', 'so'] },
  { id: 'ta', h: 'た', k: 'タ', cells: ['ta', 'chi', 'tsu', 'te', 'to'] },
  { id: 'na', h: 'な', k: 'ナ', cells: ['na', 'ni', 'nu', 'ne', 'no'] },
  { id: 'ha', h: 'は', k: 'ハ', cells: ['ha', 'hi', 'fu', 'he', 'ho'] },
  { id: 'ma', h: 'ま', k: 'マ', cells: ['ma', 'mi', 'mu', 'me', 'mo'] },
  { id: 'ya', h: 'や', k: 'ヤ', cells: ['ya', null, 'yu', null, 'yo'] },
  { id: 'ra', h: 'ら', k: 'ラ', cells: ['ra', 'ri', 'ru', 're', 'ro'] },
  { id: 'wa', h: 'わ', k: 'ワ', cells: ['wa', null, null, null, 'wo'] },
  { id: 'n', h: 'ん', k: 'ン', cells: ['n', null, null, null, null] },
];

const DAKUON_ROWS = [
  { id: 'ga', h: 'が', k: 'ガ', cells: ['ga', 'gi', 'gu', 'ge', 'go'] },
  { id: 'za', h: 'ざ', k: 'ザ', cells: ['za', 'ji', 'zu', 'ze', 'zo'] },
  { id: 'da', h: 'だ', k: 'ダ', cells: ['da', 'di', 'du', 'de', 'do'] },
  { id: 'ba', h: 'ば', k: 'バ', cells: ['ba', 'bi', 'bu', 'be', 'bo'] },
  { id: 'pa', h: 'ぱ', k: 'パ', cells: ['pa', 'pi', 'pu', 'pe', 'po'] },
];

const YOUON_ROWS = [
  { id: 'kya', h: 'き', k: 'キ', cells: ['kya', 'kyu', 'kyo'] },
  { id: 'sha', h: 'し', k: 'シ', cells: ['sha', 'shu', 'sho'] },
  { id: 'cha', h: 'ち', k: 'チ', cells: ['cha', 'chu', 'cho'] },
  { id: 'nya', h: 'に', k: 'ニ', cells: ['nya', 'nyu', 'nyo'] },
  { id: 'hya', h: 'ひ', k: 'ヒ', cells: ['hya', 'hyu', 'hyo'] },
  { id: 'mya', h: 'み', k: 'ミ', cells: ['mya', 'myu', 'myo'] },
  { id: 'rya', h: 'り', k: 'リ', cells: ['rya', 'ryu', 'ryo'] },
  { id: 'gya', h: 'ぎ', k: 'ギ', cells: ['gya', 'gyu', 'gyo'] },
  { id: 'ja', h: 'じ', k: 'ジ', cells: ['ja', 'ju', 'jo'] },
  { id: 'bya', h: 'び', k: 'ビ', cells: ['bya', 'byu', 'byo'] },
  { id: 'pya', h: 'ぴ', k: 'ピ', cells: ['pya', 'pyu', 'pyo'] },
];

const HIRA = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  sa: 'さ', shi: 'し', su: 'す', se: 'せ', so: 'そ',
  ta: 'た', chi: 'ち', tsu: 'つ', te: 'て', to: 'と',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を', n: 'ん',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  za: 'ざ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
};

const KATA = {
  a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ',
  ka: 'カ', ki: 'キ', ku: 'ク', ke: 'ケ', ko: 'コ',
  sa: 'サ', shi: 'シ', su: 'ス', se: 'セ', so: 'ソ',
  ta: 'タ', chi: 'チ', tsu: 'ツ', te: 'テ', to: 'ト',
  na: 'ナ', ni: 'ニ', nu: 'ヌ', ne: 'ネ', no: 'ノ',
  ha: 'ハ', hi: 'ヒ', fu: 'フ', he: 'ヘ', ho: 'ホ',
  ma: 'マ', mi: 'ミ', mu: 'ム', me: 'メ', mo: 'モ',
  ya: 'ヤ', yu: 'ユ', yo: 'ヨ',
  ra: 'ラ', ri: 'リ', ru: 'ル', re: 'レ', ro: 'ロ',
  wa: 'ワ', wo: 'ヲ', n: 'ン',
  ga: 'ガ', gi: 'ギ', gu: 'グ', ge: 'ゲ', go: 'ゴ',
  za: 'ザ', ji: 'ジ', zu: 'ズ', ze: 'ゼ', zo: 'ゾ',
  da: 'ダ', di: 'ヂ', du: 'ヅ', de: 'デ', do: 'ド',
  ba: 'バ', bi: 'ビ', bu: 'ブ', be: 'ベ', bo: 'ボ',
  pa: 'パ', pi: 'ピ', pu: 'プ', pe: 'ペ', po: 'ポ',
  kya: 'キャ', kyu: 'キュ', kyo: 'キョ',
  sha: 'シャ', shu: 'シュ', sho: 'ショ',
  cha: 'チャ', chu: 'チュ', cho: 'チョ',
  nya: 'ニャ', nyu: 'ニュ', nyo: 'ニョ',
  hya: 'ヒャ', hyu: 'ヒュ', hyo: 'ヒョ',
  mya: 'ミャ', myu: 'ミュ', myo: 'ミョ',
  rya: 'リャ', ryu: 'リュ', ryo: 'リョ',
  gya: 'ギャ', gyu: 'ギュ', gyo: 'ギョ',
  ja: 'ジャ', ju: 'ジュ', jo: 'ジョ',
  bya: 'ビャ', byu: 'ビュ', byo: 'ビョ',
  pya: 'ピャ', pyu: 'ピュ', pyo: 'ピョ',
};

const ROMAJI = {
  a: 'a', i: 'i', u: 'u', e: 'e', o: 'o',
  ka: 'ka', ki: 'ki', ku: 'ku', ke: 'ke', ko: 'ko',
  sa: 'sa', shi: 'shi', su: 'su', se: 'se', so: 'so',
  ta: 'ta', chi: 'chi', tsu: 'tsu', te: 'te', to: 'to',
  na: 'na', ni: 'ni', nu: 'nu', ne: 'ne', no: 'no',
  ha: 'ha', hi: 'hi', fu: 'fu', he: 'he', ho: 'ho',
  ma: 'ma', mi: 'mi', mu: 'mu', me: 'me', mo: 'mo',
  ya: 'ya', yu: 'yu', yo: 'yo',
  ra: 'ra', ri: 'ri', ru: 'ru', re: 're', ro: 'ro',
  wa: 'wa', wo: 'wo', n: 'n',
  ga: 'ga', gi: 'gi', gu: 'gu', ge: 'ge', go: 'go',
  za: 'za', ji: 'ji', zu: 'zu', ze: 'ze', zo: 'zo',
  da: 'da', di: 'di', du: 'du', de: 'de', do: 'do',
  ba: 'ba', bi: 'bi', bu: 'bu', be: 'be', bo: 'bo',
  pa: 'pa', pi: 'pi', pu: 'pu', pe: 'pe', po: 'po',
  kya: 'kya', kyu: 'kyu', kyo: 'kyo',
  sha: 'sha', shu: 'shu', sho: 'sho',
  cha: 'cha', chu: 'chu', cho: 'cho',
  nya: 'nya', nyu: 'nyu', nyo: 'nyo',
  hya: 'hya', hyu: 'hyu', hyo: 'hyo',
  mya: 'mya', myu: 'myu', myo: 'myo',
  rya: 'rya', ryu: 'ryu', ryo: 'ryo',
  gya: 'gya', gyu: 'gyu', gyo: 'gyo',
  ja: 'ja', ju: 'ju', jo: 'jo',
  bya: 'bya', byu: 'byu', byo: 'byo',
  pya: 'pya', pyu: 'pyu', pyo: 'pyo',
};

export const CHARTS = {
  seion: {
    id: 'seion',
    name: '清音',
    kicker: 'あ行から',
    blurb: '五十音的骨架。先把這盤排好，後面的濁音與拗音才站得住。',
    columns: 5,
    rows: SEION_ROWS,
  },
  dakuon: {
    id: 'dakuon',
    name: '濁音',
    kicker: '゛ ゜',
    blurb: 'がざだば，再加半濁音ぱ行。相同骨架，聲音變濁。',
    columns: 5,
    rows: DAKUON_ROWS,
  },
  youon: {
    id: 'youon',
    name: '拗音',
    kicker: 'ゃゅょ',
    blurb: '小寫ゃゅょ黏在い段上。三列拼盤，一塊拼圖兩個假名。',
    columns: 3,
    rows: YOUON_ROWS,
  },
};

export const CHART_ORDER = ['seion', 'dakuon', 'youon'];
export const RANGE_ORDER = ['seion', 'dakuon', 'youon', 'all'];

CHARTS.all = {
  id: 'all',
  name: '全部',
  kicker: '清濁拗',
  blurb: '清音、濁音與拗音一次揭開整張圖。',
};

export function glyphFor(key, script) {
  if (script === 'kata') return KATA[key];
  if (script === 'roma') return ROMAJI[key];
  return HIRA[key];
}

export function promptOf(cell, mode) {
  if (mode.listen) return '音';
  return glyphFor(cell.key, mode.prompt);
}

export function answerOf(cell, mode) {
  return glyphFor(cell.key, mode.answer);
}

export function romajiFor(key) {
  return ROMAJI[key];
}

export function speakGlyph(key) {
  return HIRA[key];
}

export function chartCells(chartId) {
  const ids = chartId === 'all' ? CHART_ORDER : [chartId];
  const cells = [];
  ids.forEach((id) => {
    const chart = CHARTS[id];
    chart.rows.forEach((row, rowIndex) => {
      row.cells.forEach((key, colIndex) => {
        if (!key) return;
        cells.push({
          id: `${id}-${key}`,
          key,
          hira: HIRA[key],
          kata: KATA[key],
          romaji: ROMAJI[key],
          chartId: id,
          rowIndex,
          colIndex,
        });
      });
    });
  });
  return cells;
}

export function previewGlyphs(chartId, script = 'hira') {
  return chartCells(chartId)
    .slice(0, 6)
    .map((cell) => glyphFor(cell.key, script));
}
