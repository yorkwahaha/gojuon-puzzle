import { CHARTS, RANGE_ORDER, chartCells } from './kana.js';
import { withoutHomophones } from './review.js';
import { BOARD_SIZES, fitSizeId, sizeCount } from './grid.js';
import { BOARD_CHOICES, PIECE_CHOICES, SHAPE_CHOICES } from './modes.js';
import { PUZZLES } from './puzzleImages.js';
import { formatTime } from './storage.js';

export function poolCount(chartId, listen) {
  const cells = chartCells(chartId);
  return (listen ? withoutHomophones(cells) : cells).length;
}

export function fittedSize(chartId, listen, sizeId) {
  return fitSizeId(sizeId, poolCount(chartId, listen));
}

function isPuzzleClear(levelTimes, puzzleId) {
  return Object.keys(levelTimes[puzzleId] || {}).length > 0;
}

export default function LessonSetup({
  chartId,
  boardId,
  pieceId,
  shape,
  sizeId,
  puzzleId,
  levelTimes,
  onChart,
  onBoard,
  onPiece,
  onShape,
  onSize,
  onPuzzle,
}) {
  const listen = boardId === 'listen';
  const pool = poolCount(chartId, listen);
  const trackClears = Boolean(levelTimes);

  return (
    <div className="setup">
      <div className="setup-block">
        <h2>字表</h2>
        <div className="seg" role="group" aria-label="假名範圍">
          {RANGE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={chartId === id ? 'is-on' : ''}
              aria-pressed={chartId === id}
              onClick={() => onChart(id)}
            >
              {CHARTS[id].name}
              <small>{poolCount(id, listen)}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="setup-block">
        <h2>讀法</h2>
        <div className="pair-select">
          <div className="field">
            <span>盤面</span>
            <div className="choice" role="group" aria-label="盤面">
              {BOARD_CHOICES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={boardId === item.id ? 'is-on' : ''}
                  aria-pressed={boardId === item.id}
                  disabled={item.id === pieceId}
                  onClick={() => onBoard(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>拼圖</span>
            <div className="choice" role="group" aria-label="拼圖">
              {PIECE_CHOICES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={pieceId === item.id ? 'is-on' : ''}
                  aria-pressed={pieceId === item.id}
                  disabled={item.id === boardId}
                  onClick={() => onPiece(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="setup-block">
        <h2>難度</h2>
        <div className="seg" role="group" aria-label="拼圖難度">
          {SHAPE_CHOICES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={shape === item.id ? 'is-on' : ''}
              aria-pressed={shape === item.id}
              onClick={() => onShape(item.id)}
            >
              {item.label}
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="setup-block">
        <h2>規格</h2>
        <div className="size-row" role="group" aria-label="盤面大小">
          {BOARD_SIZES.map((item) => {
            const count = sizeCount(item);
            const allowed = count <= pool;
            const best = levelTimes?.[puzzleId]?.[item.id];
            return (
              <button
                key={item.id}
                type="button"
                className={sizeId === item.id ? 'is-on' : ''}
                aria-pressed={sizeId === item.id}
                disabled={!allowed}
                onClick={() => onSize(item.id)}
              >
                <b>{item.label}</b>
                <small>{allowed ? `${count} 片` : '超出'}</small>
                {best != null ? <em>{formatTime(best)}</em> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="setup-block">
        <h2>藏品</h2>
        <div className="level-rail">
          {PUZZLES.map((item, index) => {
            const opened = !trackClears || isPuzzleClear(levelTimes, item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`level-card${puzzleId === item.id ? ' is-on' : ''}${opened ? ' is-clear' : ' is-fogged'}`}
                onClick={() => onPuzzle(item.id)}
                aria-pressed={puzzleId === item.id}
                aria-label={opened ? item.name : `未揭關卡 ${index + 1}`}
              >
                <img src={item.url} alt="" loading="lazy" decoding="async" />
                {trackClears && opened ? <i>過</i> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
