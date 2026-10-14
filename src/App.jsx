import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PlayBoard from './PlayBoard.jsx';
import LessonSetup, { fittedSize } from './LessonSetup.jsx';
import { BOARD_SIZES, sizeCount } from './grid.js';
import { modeIdOf, MODE_BY_ID } from './modes.js';
import { PUZZLES, puzzleById } from './puzzleImages.js';
import { playBgm, setMuted, setBgmMuted, stopBgm, unlockAudio } from './audio.js';
import { formatTime, getLevelRecords, getWeakest, loadPrefs, savePrefs } from './storage.js';
import {
  HEARTBEAT_MS,
  isRoomEnded,
  lobbySnapshot,
  parseLesson,
  parseRoomFromUrl,
  patchRoom,
} from './room.js';

function isPuzzleClear(levelTimes, puzzleId) {
  return Object.keys(levelTimes[puzzleId] || {}).length > 0;
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

function ClassroomReconnect() {
  return (
    <div className="class-lock" role="status" aria-live="polite">
      <span className="class-lock-seal">待</span>
      <h2>正在接回教室</h2>
      <p>座位還在保留，此頁會自動重試。若你剛關掉分頁，稍候就會進來；若已有別的學生在線，請等對方離開，或請老師另開一間。</p>
    </div>
  );
}

export default function App() {
  const boot = parseRoomFromUrl();
  const lesson = boot.room ? parseLesson() : null;
  const lessonMode = lesson ? lesson.modeId.split('-') : [];
  const [screen, setScreen] = useState('home');
  const [boardId, setBoardId] = useState(lessonMode[0] || 'kata');
  const [pieceId, setPieceId] = useState(lessonMode[1] || 'hira');
  const [chartId, setChartId] = useState(lesson?.chartId || 'seion');
  const [sizeId, setSizeId] = useState(() => fittedSize(
    lesson?.chartId || 'seion',
    (lessonMode[0] || 'kata') === 'listen',
    lesson?.sizeId || '8x4',
  ));
  const [shape, setShape] = useState(() => {
    if (lesson?.shape) return lesson.shape;
    return loadPrefs().shape === 'rect' ? 'rect' : 'jigsaw';
  });
  const [puzzleId, setPuzzleId] = useState(() => (lesson ? puzzleById(lesson.puzzleId).id : PUZZLES[0].id));
  const [muted, setMutedState] = useState(() => loadPrefs().muted);
  const [seed, setSeed] = useState(1);
  const [room] = useState(boot.room);
  const [roomError, setRoomError] = useState('');
  const [seatHold, setSeatHold] = useState(false);
  const [classLock, setClassLock] = useState(() => {
    if (boot.room && isRoomEnded(boot.room)) {
      return { title: '老師已結束本次課程', message: '這次遊玩已經鎖定。重新整理也無法繼續。' };
    }
    return null;
  });
  const puzzle = puzzleById(puzzleId);
  const modeId = modeIdOf(boardId, pieceId);
  const mode = MODE_BY_ID[modeId];
  const listen = boardId === 'listen';
  const size = BOARD_SIZES.find((item) => item.id === sizeId) || BOARD_SIZES[0];
  const locked = Boolean(lesson);
  const [levelTimes, setLevelTimes] = useState(() => loadPrefs().levels);
  const levelRecords = getLevelRecords(puzzle.id);
  const weakest = getWeakest(3);
  const puzzleClear = isPuzzleClear(levelTimes, puzzle.id);
  const watching = Boolean(room) && !classLock;
  const playConfig = useMemo(
    () => ({ modeId, chartId, puzzle, sizeId, seed, shape }),
    [modeId, chartId, puzzle, seed, shape, sizeId]
  );

  const classLockRef = useRef(classLock);
  classLockRef.current = classLock;

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  const lockClass = useCallback((kind) => {
    stopBgm();
    if (kind === 'ended') {
      setClassLock({ title: '老師已結束本次課程', message: '這次遊玩已經鎖定。重新整理也無法繼續。' });
      return;
    }
    if (kind === 'missing') {
      setClassLock({ title: '教室已過期', message: '請老師重新開啟教室，再用新的連結進來。' });
      return;
    }
    setClassLock({ title: '老師已結束本次課程', message: '這次遊玩已經鎖定。重新整理也無法繼續。' });
  }, []);

  const pushLive = useCallback(async (payload) => {
    if (!room || classLockRef.current) return;
    try {
      const result = await patchRoom(room, payload);
      setSeatHold(false);
      if (result?.ended) lockClass('ended');
    } catch (err) {
      const code = err?.code || err?.message;
      if (code === 'ended') lockClass('ended');
      else if (code === 'occupied') setSeatHold(true);
      else if (code === 'not_found') lockClass('missing');
      else if (code === 'stale_snapshot' || code === 'unauthorized') setRoomError('教室狀態同步失敗，請重新整理後再試。');
      else if (payload?.phase === 'lobby') setRoomError('教室連不上，請再試一次。');
    }
  }, [lockClass, room]);

  function pickChart(id) {
    if (locked) return;
    setChartId(id);
    setSizeId((current) => fittedSize(id, listen, current));
  }

  function pickBoard(id) {
    if (locked || id === pieceId) return;
    setBoardId(id);
    setSizeId((current) => fittedSize(chartId, id === 'listen', current));
  }

  function pickPiece(id) {
    if (locked || id === boardId) return;
    setPieceId(id);
  }

  function start() {
    if (!mode || classLock) return;
    unlockAudio();
    setBgmMuted(loadPrefs().bgmMuted);
    playBgm(puzzle.bgm);
    setSeed((Date.now() ^ Math.floor(Math.random() * 1e6)) >>> 0);
    setScreen('play');
  }

  function leavePlay() {
    stopBgm();
    setLevelTimes(loadPrefs().levels);
    setScreen('home');
  }

  useEffect(() => {
    if (!watching || screen !== 'home') return undefined;
    void pushLive(lobbySnapshot({ modeId, chartId, puzzleId, sizeId, shape }));
    const id = window.setInterval(() => {
      void pushLive({ heartbeat: Date.now() });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [watching, screen, modeId, chartId, puzzleId, sizeId, shape, pushLive]);

  useEffect(() => {
    if (!watching || screen !== 'play') return undefined;
    const id = window.setInterval(() => {
      void pushLive({ heartbeat: Date.now() });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [watching, screen, pushLive]);

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
          config={playConfig}
          watching={watching}
          onLiveState={watching ? pushLive : undefined}
          onExit={leavePlay}
        />
        {seatHold ? <ClassroomReconnect /> : null}
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
          {weakest.length ? (
            <p className="level-record">常錯 {weakest.map((item) => `${item.kana || item.romaji} ${item.count}`).join(' · ')}</p>
          ) : null}
        </section>

        <section className="home-panel">
          <header className="home-panel-top">
            <div>
              <h1>霧繪五十音</h1>
              <p className="home-mode">{mode?.title} · {shape === 'rect' ? '進階（純四角）' : '入門（凹凸邊）'}</p>
            </div>
            <div className="home-tools">
              <button
                className={`pref${!muted ? ' is-on' : ''}`}
                type="button"
                onClick={() => {
                  const next = !muted;
                  setMutedState(next);
                  setMuted(next);
                  savePrefs({ muted: next });
                }}
              >
                {muted ? '發音關' : '發音開'}
              </button>
              {watching ? <span className="watch-chip">老師觀看中 · {room}</span> : null}
            </div>
          </header>
          {roomError ? <p className="watch-error">{roomError}</p> : null}

          {locked ? (
            <p className="watch-hint">這一關和圖片由老師指定，直接開始即可。</p>
          ) : (
            <LessonSetup
              chartId={chartId}
              boardId={boardId}
              pieceId={pieceId}
              shape={shape}
              sizeId={sizeId}
              puzzleId={puzzleId}
              levelTimes={levelTimes}
              onChart={pickChart}
              onBoard={pickBoard}
              onPiece={pickPiece}
              onShape={(id) => {
                setShape(id);
                savePrefs({ shape: id });
              }}
              onSize={setSizeId}
              onPuzzle={setPuzzleId}
            />
          )}

          <button className="start-btn" type="button" onClick={start} disabled={!mode}>
            開始揭霧
          </button>
        </section>
      </main>
      {seatHold ? <ClassroomReconnect /> : null}
    </div>
  );
}
