import { useMemo, useState } from 'react';
import PlayBoard from './PlayBoard.jsx';
import { CHARTS, RANGE_ORDER, chartCells } from './kana.js';
import { BOARD_SIZES, sizeCount } from './grid.js';
import { BOARD_CHOICES, PIECE_CHOICES, modeIdOf, MODE_BY_ID } from './modes.js';
import { PUZZLES } from './puzzleImages.js';
import { playBgm, setMuted, setBgmMuted, stopBgm, unlockAudio } from './audio.js';
import { formatTime, loadPrefs } from './storage.js';

function largestFit(chartId) {
  const pool = chartCells(chartId).length;
  return [...BOARD_SIZES].reverse().find((size) => sizeCount(size) <= pool) || BOARD_SIZES[0];
}

function isPuzzleClear(levelTimes, puzzleId) {
  return Object.keys(levelTimes[puzzleId] || {}).length > 0;
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [boardId, setBoardId] = useState('kata');
  const [pieceId, setPieceId] = useState('hira');
  const [chartId, setChartId] = useState('seion');
  const [sizeId, setSizeId] = useState('8x4');
  const [puzzleId, setPuzzleId] = useState(PUZZLES[0].id);
  const [muted, setMutedState] = useState(false);
  const [seed, setSeed] = useState(1);
  const puzzle = PUZZLES.find((item) => item.id === puzzleId) || PUZZLES[0];
  const modeId = modeIdOf(boardId, pieceId);
  const mode = MODE_BY_ID[modeId];
  const pool = useMemo(() => chartCells(chartId).length, [chartId]);
  const size = BOARD_SIZES.find((item) => item.id === sizeId) || BOARD_SIZES[0];
  const levelTimes = loadPrefs().levels;
  const levelRecords = Object.entries(levelTimes[puzzle.id] || {})
    .map(([id, ms]) => ({ sizeId: id, ms }))
    .sort((a, b) => a.ms - b.ms);
  const puzzleClear = isPuzzleClear(levelTimes, puzzle.id);

  function pickChart(id) {
    setChartId(id);
    const nextPool = chartCells(id).length;
    const current = BOARD_SIZES.find((item) => item.id === sizeId) || BOARD_SIZES[0];
    if (sizeCount(current) > nextPool) {
      setSizeId(largestFit(id).id);
    }
  }

  function pickBoard(id) {
    if (id === pieceId) return;
    setBoardId(id);
  }

  function pickPiece(id) {
    if (id === boardId) return;
    setPieceId(id);
  }

  function start() {
    if (!mode) return;
    unlockAudio();
    setBgmMuted(loadPrefs().bgmMuted);
    playBgm(puzzle.bgm || puzzle.name);
    setSeed((Date.now() ^ Math.floor(Math.random() * 1e6)) >>> 0);
    setScreen('play');
  }

  if (screen === 'play') {
    return (
      <div className="app is-play">
        <div className="grain" />
        <PlayBoard
          config={{ modeId, chartId, puzzle, sizeId, seed }}
          onExit={() => {
            stopBgm();
            setScreen('home');
          }}
        />
      </div>
    );
  }

  return (
    <div className="app is-home">
      <div className="grain" />
      <main className="home">
        <section className="home-stage">
          <p className="kicker">假名拼圖</p>
          <div className={`home-frame${puzzleClear ? '' : ' is-fogged'}`}>
            <div className={`home-mat${puzzleClear ? '' : ' is-fogged'}`}>
              <img src={puzzle.url} alt="" />
            </div>
            <span className="home-seal" aria-hidden="true">{puzzleClear ? '完' : '霧'}</span>
            <div className="home-frame-meta">
              <strong>{puzzleClear ? puzzle.name : '未揭之圖'}</strong>
              <span>{size.label} · {sizeCount(size)} 片</span>
            </div>
          </div>
          <p className="level-record">
            {levelRecords.length
              ? levelRecords.map((record) => {
                const recordSize = BOARD_SIZES.find((item) => item.id === record.sizeId);
                return `${recordSize?.label || record.sizeId} ${formatTime(record.ms)}`;
              }).join('  ·  ')
              : '此關卡尚未過關'}
          </p>
        </section>

        <section className="home-panel">
          <header className="home-panel-top">
            <div>
              <h1>霧繪五十音</h1>
              <p className="home-mode">{mode?.title}</p>
            </div>
            <button
              className={`pref${!muted ? ' is-on' : ''}`}
              type="button"
              onClick={() => {
                const next = !muted;
                setMutedState(next);
                setMuted(next);
              }}
            >
              {muted ? '發音關' : '發音開'}
            </button>
          </header>

          <div className="setup">
            <div className="setup-block">
              <h2>字表</h2>
              <div className="seg" role="tablist" aria-label="假名範圍">
                {RANGE_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={chartId === id ? 'is-on' : ''}
                    onClick={() => pickChart(id)}
                  >
                    {CHARTS[id].name}
                    <small>{chartCells(id).length}</small>
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
                        disabled={item.id === pieceId}
                        onClick={() => pickBoard(item.id)}
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
                        disabled={item.id === boardId}
                        onClick={() => pickPiece(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="setup-block">
              <h2>規格</h2>
              <div className="size-row" role="group" aria-label="盤面大小">
                {BOARD_SIZES.map((item) => {
                  const count = sizeCount(item);
                  const allowed = count <= pool;
                  const best = levelTimes[puzzle.id]?.[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={sizeId === item.id ? 'is-on' : ''}
                      disabled={!allowed}
                      onClick={() => setSizeId(item.id)}
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
                  const opened = isPuzzleClear(levelTimes, item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`level-card${puzzleId === item.id ? ' is-on' : ''}${opened ? ' is-clear' : ' is-fogged'}`}
                      onClick={() => setPuzzleId(item.id)}
                      aria-pressed={puzzleId === item.id}
                      aria-label={opened ? item.name : `未揭關卡 ${index + 1}`}
                    >
                      <img src={item.url} alt="" />
                      {opened ? <i>過</i> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button className="start-btn" type="button" onClick={start} disabled={!mode}>
            開始揭霧
          </button>
        </section>
      </main>
    </div>
  );
}
