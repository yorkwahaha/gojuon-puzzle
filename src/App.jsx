import { useEffect, useMemo, useState } from 'react';
import PlayBoard from './PlayBoard.jsx';
import { CHARTS, RANGE_ORDER, chartCells } from './kana.js';
import { BOARD_SIZES, sizeCount } from './grid.js';
import { BOARD_CHOICES, PIECE_CHOICES, modeIdOf, MODE_BY_ID } from './modes.js';
import { PUZZLES } from './puzzleImages.js';
import { playBgm, setMuted, setBgmMuted, stopBgm, unlockAudio } from './audio.js';
import { formatTime, loadPrefs } from './storage.js';
import {
  HEARTBEAT_MS,
  isRoomEnded,
  lobbySnapshot,
  parseRoomFromUrl,
  patchRoom,
} from './room.js';

function largestFit(chartId) {
  const pool = chartCells(chartId).length;
  return [...BOARD_SIZES].reverse().find((size) => sizeCount(size) <= pool) || BOARD_SIZES[0];
}

function isPuzzleClear(levelTimes, puzzleId) {
  return Object.keys(levelTimes[puzzleId] || {}).length > 0;
}

function puzzleById(id) {
  return PUZZLES.find((item) => item.id === id) || PUZZLES[0];
}

function ClassroomLock({ title, message }) {
  return (
    <div className="class-lock" role="alertdialog" aria-modal="true" aria-labelledby="class-lock-title">
      <span className="class-lock-seal">鎖</span>
      <h2 id="class-lock-title">{title}</h2>
      <p>{message}</p>
    </div>
  );
}

export default function App() {
  const boot = parseRoomFromUrl();
  const [screen, setScreen] = useState('home');
  const [boardId, setBoardId] = useState('kata');
  const [pieceId, setPieceId] = useState('hira');
  const [chartId, setChartId] = useState('seion');
  const [sizeId, setSizeId] = useState('8x4');
  const [puzzleId, setPuzzleId] = useState(PUZZLES[0].id);
  const [muted, setMutedState] = useState(false);
  const [seed, setSeed] = useState(1);
  const [room] = useState(boot.room);
  const [roomError, setRoomError] = useState('');
  const [classLock, setClassLock] = useState(() => {
    if (boot.room && isRoomEnded(boot.room)) {
      return { title: '老師已結束本次課程', message: '這次遊玩已經鎖定。重新整理也無法繼續。' };
    }
    return null;
  });
  const puzzle = puzzleById(puzzleId);
  const modeId = modeIdOf(boardId, pieceId);
  const mode = MODE_BY_ID[modeId];
  const pool = useMemo(() => chartCells(chartId).length, [chartId]);
  const size = BOARD_SIZES.find((item) => item.id === sizeId) || BOARD_SIZES[0];
  const levelTimes = loadPrefs().levels;
  const levelRecords = Object.entries(levelTimes[puzzle.id] || {})
    .map(([id, ms]) => ({ sizeId: id, ms }))
    .sort((a, b) => a.ms - b.ms);
  const puzzleClear = isPuzzleClear(levelTimes, puzzle.id);
  const watching = Boolean(room) && !classLock;

  function lockClass(kind) {
    stopBgm();
    if (kind === 'ended') {
      setClassLock({ title: '老師已結束本次課程', message: '這次遊玩已經鎖定。重新整理也無法繼續。' });
      return;
    }
    if (kind === 'occupied') {
      setClassLock({ title: '教室已被占用', message: '這間教室已有學生。請老師另開一間。' });
      return;
    }
    if (kind === 'missing') {
      setClassLock({ title: '教室已過期', message: '請老師重新開啟教室，再用新的連結進來。' });
      return;
    }
    setClassLock({ title: '老師已結束本次課程', message: '這次遊玩已經鎖定。重新整理也無法繼續。' });
  }

  async function pushLive(payload) {
    if (!room || classLock) return;
    try {
      const result = await patchRoom(room, payload);
      if (result?.ended) lockClass('ended');
    } catch (err) {
      const code = err?.code || err?.message;
      if (code === 'ended') lockClass('ended');
      else if (code === 'occupied') lockClass('occupied');
      else if (code === 'not_found') lockClass('missing');
      else if (payload?.phase === 'lobby') setRoomError('教室連不上，請再試一次。');
    }
  }

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
    if (!mode || classLock) return;
    unlockAudio();
    setBgmMuted(loadPrefs().bgmMuted);
    playBgm(puzzle.bgm || puzzle.name);
    setSeed((Date.now() ^ Math.floor(Math.random() * 1e6)) >>> 0);
    setScreen('play');
  }

  function leavePlay() {
    stopBgm();
    setScreen('home');
  }

  useEffect(() => {
    if (!watching || screen !== 'home') return undefined;
    void pushLive(lobbySnapshot({ modeId, chartId, puzzleId, sizeId }));
    const id = window.setInterval(() => {
      void pushLive({ heartbeat: Date.now() });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [watching, screen, modeId, chartId, puzzleId, sizeId, room]);

  useEffect(() => {
    if (!watching || screen !== 'play') return undefined;
    const id = window.setInterval(() => {
      void pushLive({ heartbeat: Date.now() });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [watching, screen, room]);

  if (classLock) {
    return (
      <div className="app is-home">
        <div className="grain" />
        <ClassroomLock title={classLock.title} message={classLock.message} />
      </div>
    );
  }

  if (screen === 'play') {
    return (
      <div className="app is-play">
        <div className="grain" />
        <PlayBoard
          config={{ modeId, chartId, puzzle, sizeId, seed }}
          watching={watching}
          onLiveState={watching ? (payload) => void pushLive(payload) : undefined}
          onExit={leavePlay}
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
            <div className="home-tools">
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
              {watching ? <span className="watch-chip">老師觀看中 · {room}</span> : null}
            </div>
          </header>
          {roomError ? <p className="watch-error">{roomError}</p> : null}

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
