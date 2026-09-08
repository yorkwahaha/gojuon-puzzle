import { useEffect, useMemo, useRef, useState } from 'react';
import PlayBoard from './PlayBoard.jsx';
import { CHARTS, RANGE_ORDER, chartCells } from './kana.js';
import { BOARD_SIZES, sizeCount } from './grid.js';
import { BOARD_CHOICES, PIECE_CHOICES, modeIdOf, MODE_BY_ID } from './modes.js';
import { PUZZLES } from './puzzleImages.js';
import { playBgm, setMuted, setBgmMuted, stopBgm, unlockAudio } from './audio.js';
import { formatTime, loadPrefs } from './storage.js';
import {
  HEARTBEAT_MS,
  OFFLINE_MS,
  clearTeacherSession,
  createRoom,
  hasRoomBackend,
  isStudentOnline,
  linksFor,
  lobbySnapshot,
  parseRoomFromUrl,
  patchRoom,
  subscribeRoom,
} from './room.js';

function largestFit(chartId) {
  const pool = chartCells(chartId).length;
  return [...BOARD_SIZES].reverse().find((size) => sizeCount(size) <= pool) || BOARD_SIZES[0];
}

function isPuzzleClear(levelTimes, puzzleId) {
  return Object.keys(levelTimes[puzzleId] || {}).length > 0;
}

function setRoomUrl(room, watch) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('room', room);
  if (watch) url.searchParams.set('watch', '1');
  window.history.replaceState({}, '', url);
}

function clearRoomUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  window.history.replaceState({}, '', url);
}

function puzzleById(id) {
  return PUZZLES.find((item) => item.id === id) || PUZZLES[0];
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
  const [room, setRoom] = useState(boot.room);
  const [watch, setWatch] = useState(boot.watch && Boolean(boot.room));
  const [live, setLive] = useState(null);
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const copyTimer = useRef(null);
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
  const watching = Boolean(room) && !watch;
  const livePuzzle = puzzleById(live?.config?.puzzleId);
  const liveMode = MODE_BY_ID[live?.config?.modeId];
  const liveSize = BOARD_SIZES.find((item) => item.id === live?.config?.sizeId);
  const studentOnline = isStudentOnline(live) || (Boolean(live?.heartbeat) && now - live.heartbeat < OFFLINE_MS);

  useEffect(() => {
    if (!watch) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [watch]);

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

  async function copyStudentLink() {
    if (!room) return;
    const { student } = linksFor(room);
    try {
      await navigator.clipboard.writeText(student);
    } catch {
      window.prompt('複製學生連結', student);
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  async function openWatchRoom() {
    setRoomError('');
    if (!hasRoomBackend()) {
      setRoomError('教室轉送沒有開。請再試一次。');
      return;
    }
    try {
      const code = await createRoom();
      setRoom(code);
      setWatch(true);
      setLive({ phase: 'empty', heartbeat: 0 });
      setRoomUrl(code, true);
    } catch {
      setRoomError('教室沒有開成，請確認網路後再試一次。');
    }
  }

  function leaveWatch() {
    clearTeacherSession();
    setWatch(false);
    setRoom(null);
    setLive(null);
    setRoomError('');
    setScreen('home');
    clearRoomUrl();
  }

  function leavePlay() {
    stopBgm();
    setScreen('home');
  }

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    if (!watch || !room) return undefined;
    return subscribeRoom(room, setLive);
  }, [room, watch]);

  useEffect(() => {
    if (!watching || screen !== 'home') return undefined;
    const payload = lobbySnapshot({ modeId, chartId, puzzleId, sizeId });
    patchRoom(room, payload).catch((err) => {
      const code = err?.code || err?.message;
      if (code === 'occupied') setRoomError('這間教室已有學生。請老師另開一間。');
      else if (code === 'not_found') setRoomError('教室已過期，請老師重新開觀戰。');
    });
    const id = window.setInterval(() => {
      patchRoom(room, { heartbeat: Date.now() }).catch(() => {});
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [watching, screen, modeId, chartId, puzzleId, sizeId, room]);

  useEffect(() => {
    if (!watching || screen !== 'play') return undefined;
    const id = window.setInterval(() => {
      patchRoom(room, { heartbeat: Date.now() }).catch(() => {});
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [watching, screen, room]);

  if (watch && room && (live?.phase === 'play' || live?.phase === 'done') && live?.config?.seed != null && liveMode) {
    return (
      <div className="app is-play">
        <div className="grain" />
        {!studentOnline ? <p className="watch-offline">學生暫時離線</p> : null}
        <PlayBoard
          config={{
            modeId: live.config.modeId,
            chartId: live.config.chartId,
            puzzle: livePuzzle,
            sizeId: live.config.sizeId,
            seed: live.config.seed,
          }}
          spectate
          liveState={live}
          onCopyLink={copyStudentLink}
          onExit={leaveWatch}
        />
      </div>
    );
  }

  if (watch) {
    const waiting = !live || live.phase === 'empty' || !live.phase;
    const inLobby = live?.phase === 'lobby';
    return (
      <div className="app is-home">
        <div className="grain" />
        <main className="home watch-desk">
          <section className="home-panel watch-panel">
            <p className="kicker">一對一觀戰</p>
            <h1>教室 {room}</h1>
            <p className="home-mode">
              {live?.error === 'offline'
                ? '教室轉送連不上，請檢查網路。'
                : live?.error === 'no_session'
                  ? '請在開教室的那個瀏覽器觀看。'
                  : live?.error === 'not_found'
                    ? '教室已過期，請重新開一間。'
                    : waiting
                      ? '把下面連結傳給學生，等他進來。'
                      : studentOnline
                        ? '學生正在選關。'
                        : '學生暫時離線。'}
            </p>
            <p className="watch-url">{linksFor(room).student}</p>
            <p className="watch-hint">這是正式站連結。貼進 Zoom 即可，學生用自己的網路打開，不必同一 Wi-Fi。老師可留在這台電腦觀戰。</p>
            {inLobby ? (
              <p className="watch-lobby">
                {liveMode?.title || '選關中'}
                {' · '}
                {CHARTS[live?.config?.chartId]?.name || ''}
                {liveSize ? ` · ${liveSize.label}` : ''}
                {livePuzzle ? ` · ${livePuzzle.name}` : ''}
              </p>
            ) : null}
            <div className="watch-actions">
              <button className="start-btn" type="button" onClick={copyStudentLink}>
                {copied ? '已複製' : '複製學生連結'}
              </button>
              <button className="pref" type="button" onClick={leaveWatch}>關閉觀戰</button>
            </div>
          </section>
        </main>
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
          onLiveState={watching ? (payload) => patchRoom(room, payload).catch(() => {}) : undefined}
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
              {watching ? (
                <span className="watch-chip">老師觀看中 · {room}</span>
              ) : (
                <button className="pref" type="button" onClick={openWatchRoom}>開觀戰教室</button>
              )}
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
