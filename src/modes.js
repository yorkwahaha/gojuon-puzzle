export const BOARD_CHOICES = [
  { id: 'roma', label: '羅馬拼音' },
  { id: 'hira', label: '平假名' },
  { id: 'kata', label: '片假名' },
  { id: 'listen', label: '純音檔' },
];

export const PIECE_CHOICES = [
  { id: 'hira', label: '平假名' },
  { id: 'kata', label: '片假名' },
  { id: 'roma', label: '羅馬拼音' },
];

export const SHAPE_CHOICES = [
  { id: 'jigsaw', label: '入門', hint: '凹凸邊' },
  { id: 'rect', label: '進階', hint: '純四角' },
];

const LABELS = {
  hira: '平假名',
  kata: '片假名',
  roma: '羅馬拼音',
  listen: '純音檔',
};

export function modeIdOf(board, piece) {
  return `${board}-${piece}`;
}

export function modeOf(board, piece) {
  const listen = board === 'listen';
  return {
    id: modeIdOf(board, piece),
    prompt: listen ? 'listen' : board,
    answer: piece,
    listen,
    title: listen ? `聽發音選${LABELS[piece]}` : `看${LABELS[board]}選${LABELS[piece]}`,
  };
}

export const MODE_BY_ID = Object.fromEntries(
  BOARD_CHOICES.flatMap((board) =>
    PIECE_CHOICES
      .filter((piece) => piece.id !== board.id)
      .map((piece) => {
        const mode = modeOf(board.id, piece.id);
        return [mode.id, mode];
      })
  )
);
